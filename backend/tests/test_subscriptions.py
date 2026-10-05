"""Subscription API regressions; no writes to the configured personal database."""
from datetime import date
from pathlib import Path
import unittest
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import database
from backend.main import app
from backend.models.subscription import Subscription, SubscriptionPayment
from backend.services.subscriptions import next_occurrence


class SubscriptionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

        with self.engine.begin() as connection:
            config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        self.sessions = sessionmaker(bind=self.engine)
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        clock = patch("backend.services.subscriptions.today", return_value=date(2026, 10, 5))
        clock.start()
        self.addCleanup(clock.stop)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def create(self, **values):
        body = {"name": "Music", "amount": "12.00", "billing_cycle": "monthly", "next_due_date": "2026-09-30"}
        body.update(values)
        response = self.client.post("/subscriptions", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def payment(self, item, **overrides):
        body = {"due_date": item["next_due_date"], "paid_on": "2026-10-05", "amount": item["amount"]}
        body.update(overrides)
        return self.client.post(f"/subscriptions/{item['id']}/payments", json=body)

    def test_crud_persists_across_sessions_and_archives(self):
        item = self.create()
        with self.sessions() as session:
            self.assertEqual(session.get(Subscription, item["id"]).name, "Music")
        self.assertEqual(self.client.get("/subscriptions").json()[0]["amount"], "12.00")
        result = self.client.patch(f"/subscriptions/{item['id']}", json={"name": "Cloud", "is_active": False})
        self.assertEqual(result.json()["next_bill_status"], "archived")
        self.assertEqual(self.client.get("/subscriptions").json(), [])
        self.assertEqual(len(self.client.get("/subscriptions?include_archived=true").json()), 1)
        self.assertEqual(self.client.delete(f"/subscriptions/{item['id']}").status_code, 204)
        self.assertEqual(self.client.get(f"/subscriptions/{item['id']}").status_code, 404)

    def test_summary_uses_decimal_and_current_due_status(self):
        self.create(next_due_date="2026-10-04")
        self.create(amount="120.00", billing_cycle="annual", next_due_date="2026-10-05")
        archived = self.create(amount="999.00", next_due_date="2026-10-06")
        self.client.patch(f"/subscriptions/{archived['id']}", json={"is_active": False})
        summary = self.client.get("/subscriptions/overview?include_archived=true").json()["summary"]
        self.assertEqual(summary["active_count"], 2)
        self.assertEqual(summary["yearly_cost"], "264.00")
        self.assertEqual(summary["monthly_average"], "22.00")
        self.assertEqual((summary["overdue_count"], summary["due_today_count"], summary["upcoming_count"]), (1, 1, 0))
        self.assertEqual(summary["as_of_date"], "2026-10-05")

    def test_validation_rejects_bad_money_dates_and_null_updates(self):
        valid = {"name": "Music", "amount": "12.00", "billing_cycle": "monthly", "next_due_date": "2026-10-10"}
        for field, value in [("name", "  "), ("amount", "0"), ("amount", "-1"), ("amount", "Infinity"),
                             ("amount", "NaN"), ("amount", "1.001"), ("billing_cycle", "weekly"),
                             ("next_due_date", "bad"), ("next_due_date", "9999-01-01"), ("category", "Unknown")]:
            with self.subTest(field=field, value=value):
                result = self.client.post("/subscriptions", json={**valid, field: value})
                self.assertEqual(result.status_code, 422, result.text)
        item = self.create()
        self.assertEqual(self.client.patch(f"/subscriptions/{item['id']}", json={"amount": None}).status_code, 422)

    def test_categories_are_saved_names_and_clear_data_keeps_history(self):
        self.client.post("/categories", json={"name": "Subscriptions", "color": "chart-fuchsia-2"})
        item = self.create(category="subscriptions")
        self.assertEqual(item["category"], "Subscriptions")
        self.assertEqual(self.payment(item).status_code, 201)
        self.assertEqual(self.client.request("DELETE", "/data/clear", json={"confirmation": "CLEAR"}).status_code, 200)
        saved = self.client.get(f"/subscriptions/{item['id']}").json()
        self.assertIsNone(saved["category"])
        self.assertEqual(saved["payment_count"], 1)

    def test_payment_advances_one_period_and_retry_does_not_advance_again(self):
        item = self.create(next_due_date="2026-01-31")
        first = self.payment(item)
        self.assertEqual(first.status_code, 201, first.text)
        updated = first.json()["subscription"]
        self.assertEqual(updated["next_due_date"], "2026-02-28")
        self.assertEqual(updated["following_due_date"], "2026-03-31")
        self.assertEqual(updated["next_bill_status"], "overdue")
        retry = self.payment(item)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(first.json()["payment"]["id"], retry.json()["payment"]["id"])
        self.assertEqual(retry.json()["subscription"]["next_due_date"], "2026-02-28")
        self.assertEqual(self.payment(item, amount="13.00").status_code, 409)
        self.assertEqual(self.client.get("/transactions").json(), [])
        self.assertEqual(self.client.delete(f"/subscriptions/{item['id']}").status_code, 409)
        self.assertEqual(len(self.client.get(f"/subscriptions/{item['id']}/payments").json()), 1)

    def test_stale_future_and_archived_payment_rejected(self):
        item = self.create()
        self.assertEqual(self.payment(item, due_date="2026-08-30").status_code, 409)
        self.assertEqual(self.payment(item, paid_on="2026-10-06").status_code, 422)
        self.client.patch(f"/subscriptions/{item['id']}", json={"is_active": False})
        self.assertEqual(self.payment(item).status_code, 409)

    def test_failed_payment_commit_does_not_advance_schedule(self):
        item = self.create()
        with patch("sqlalchemy.orm.Session.commit", side_effect=IntegrityError("insert", {}, Exception("test"))):
            self.assertEqual(self.payment(item).status_code, 409)
        with self.sessions() as session:
            self.assertEqual(session.get(Subscription, item["id"]).next_due_date, date(2026, 9, 30))
            self.assertIsNone(session.scalar(select(SubscriptionPayment)))

    def test_edit_cannot_reuse_paid_occurrence_and_price_keeps_anchor(self):
        item = self.create(next_due_date="2026-01-31")
        self.payment(item)
        endpoint = f"/subscriptions/{item['id']}"
        self.assertEqual(self.client.patch(endpoint, json={"next_due_date": "2026-01-31"}).status_code, 422)
        result = self.client.patch(endpoint, json={"amount": "20.00"})
        self.assertEqual(result.json()["following_due_date"], "2026-03-31")

    def test_leap_year_and_short_month_anchor(self):
        anchor = date(2028, 2, 29)
        current = anchor
        for year in (2029, 2030, 2031, 2032):
            current = next_occurrence(current, anchor, "annual")
            self.assertEqual(current, date(year, 2, 29 if year == 2032 else 28))
        self.assertEqual(next_occurrence(date(2027, 2, 28), date(2027, 1, 30), "monthly"), date(2027, 3, 30))

    def test_icon_persists_and_svg_is_rejected(self):
        png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=="
        item = self.create(icon=png)
        self.assertEqual(self.client.get(f"/subscriptions/{item['id']}").json()["icon"], png)
        self.assertEqual(self.client.patch(f"/subscriptions/{item['id']}", json={"icon": "data:image/svg+xml;base64,PHN2Zz4="}).status_code, 422)

    def test_compose_database_components_keep_special_password_characters(self):
        with patch.object(database.os, "environ", {"POSTGRES_HOST": "db", "POSTGRES_PASSWORD": "test:@/#%$"}):
            url = database.get_database_url()
            self.assertEqual(url.host, "db")
            self.assertEqual(url.password, "test:@/#%$")


if __name__ == "__main__":
    unittest.main()
