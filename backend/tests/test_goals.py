"""Goal persistence and entry regressions against an isolated, migrated database."""
from datetime import date
from decimal import Decimal
from pathlib import Path
import unittest
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import database
from backend.main import app
from backend.models.goal import Goal, GoalEntry


class GoalTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        with self.engine.begin() as connection:
            config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        self.sessions = sessionmaker(bind=self.engine)
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def create(self, **values):
        response = self.client.post("/goals", json={
            "name": " Emergency fund ", "type": "Savings", "target_amount": "1000.00", **values,
        })
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def entry(self, goal_id, **values):
        return self.client.post(f"/goals/{goal_id}/entries", json={
            "type": "contribution", "date": "2026-10-15", "amount": "25.10", "note": " Transfer ", **values,
        })

    def test_create_persists_across_sessions_with_optional_date_and_both_types(self):
        savings = self.create()
        debt = self.create(type="Debt Payoff", target_date="2027-04-01")
        with self.sessions() as db:
            self.assertEqual(db.get(Goal, savings["id"]).name, "Emergency fund")
            self.assertEqual(db.get(Goal, debt["id"]).target_date, date(2027, 4, 1))
        with TestClient(app) as reloaded:
            self.assertEqual(reloaded.get("/goals").json(), [savings, debt])
        self.assertIsNone(savings["target_date"])
        self.assertEqual(Decimal(savings["contributed"]), 0)

    def test_all_entry_types_update_only_their_goal_and_persist_notes_dates(self):
        goal = self.create()
        other = self.create(name="Other")
        for kind, amount in [("income", "100.00"), ("expense", "20.25"),
                             ("contribution", "25.10"), ("contribution", "0.20")]:
            result = self.entry(goal["id"], type=kind, amount=amount)
            self.assertEqual(result.status_code, 201, result.text)
        saved = self.client.get(f"/goals/{goal['id']}").json()
        self.assertEqual(Decimal(saved["contributed"]), Decimal("25.30"))
        self.assertEqual(Decimal(saved["documented_income"]), Decimal("100.00"))
        self.assertEqual(Decimal(saved["necessary_expenses"]), Decimal("20.25"))
        self.assertEqual(self.client.get(f"/goals/{other['id']}").json(), other)
        with self.sessions() as db:
            entries = db.scalars(select(GoalEntry).where(GoalEntry.goal_id == goal["id"])).all()
            self.assertEqual(len(entries), 4)
            self.assertTrue(all(item.note == "Transfer" and item.date == date(2026, 10, 15) for item in entries))
        self.assertEqual(len(self.client.get(f"/goals/{goal['id']}/entries").json()), 4)
        self.assertEqual(self.client.get("/transactions").json(), [])

    def test_bad_goals_are_rejected_without_saving(self):
        valid = {"name": "Fund", "type": "Savings", "target_amount": "10.00"}
        for field, value in [("name", " "), ("name", "x" * 121), ("type", "Unknown"),
                             ("target_amount", "0"), ("target_amount", "-1"), ("target_amount", "NaN"),
                             ("target_amount", "Infinity"), ("target_amount", "1.001"),
                             ("target_amount", "10000000000"), ("target_date", "2026-02-30")]:
            with self.subTest(field=field, value=value):
                self.assertEqual(self.client.post("/goals", json={**valid, field: value}).status_code, 422)
        self.assertEqual(self.client.get("/goals").json(), [])

    def test_bad_entries_do_not_change_totals(self):
        goal = self.create()
        for field, value in [("type", "Unknown"), ("date", ""), ("date", "2026-02-30"),
                             ("amount", "0"), ("amount", "-1"), ("amount", "NaN"),
                             ("amount", "Infinity"), ("amount", "1.001"),
                             ("amount", "10000000000"), ("note", "x" * 501)]:
            with self.subTest(field=field, value=value):
                self.assertEqual(self.entry(goal["id"], **{field: value}).status_code, 422)
        self.assertEqual(self.client.get(f"/goals/{goal['id']}").json(), goal)
        self.assertEqual(self.client.get(f"/goals/{goal['id']}/entries").json(), [])

    def test_failed_commit_rolls_back_goal_and_entry(self):
        goal = self.create()
        with patch("sqlalchemy.orm.Session.commit", side_effect=OperationalError("commit", {}, Exception("private"))):
            response = self.entry(goal["id"])
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("private", response.text)
            response = self.client.post("/goals", json={"name": "Failed", "type": "Savings", "target_amount": "5"})
            self.assertEqual(response.status_code, 503)
        self.assertEqual(self.client.get("/goals").json(), [goal])
        self.assertEqual(self.client.get(f"/goals/{goal['id']}/entries").json(), [])

    def test_delete_cascades_entries_and_stays_deleted(self):
        goal = self.create()
        other = self.create(name="Keep")
        self.entry(goal["id"])
        self.assertEqual(self.client.delete(f"/goals/{goal['id']}").status_code, 204)
        self.assertEqual(self.client.get("/goals").json(), [other])
        self.assertEqual(self.client.get(f"/goals/{goal['id']}").status_code, 404)
        self.assertEqual(self.client.get(f"/goals/{goal['id']}/entries").status_code, 404)
        self.assertEqual(self.entry(goal["id"]).status_code, 404)
        self.assertEqual(self.client.delete(f"/goals/{goal['id']}").status_code, 404)
        with self.sessions() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(GoalEntry)), 0)

    def test_clear_data_preserves_goals_and_entries(self):
        goal = self.create()
        saved = self.entry(goal["id"]).json()
        self.assertEqual(self.client.request("DELETE", "/data/clear", json={"confirmation": "CLEAR"}).status_code, 200)
        self.assertEqual(self.client.get("/goals").json(), [saved])
        self.assertEqual(len(self.client.get(f"/goals/{goal['id']}/entries").json()), 1)


if __name__ == "__main__":
    unittest.main()
