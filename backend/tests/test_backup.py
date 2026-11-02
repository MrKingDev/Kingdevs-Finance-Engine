"""Verify that complete exports preserve every record and exact persisted values."""

from datetime import date
from decimal import Decimal
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, insert, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.models import (
    BankStyle, Budget, Category, Goal, GoalEntry, Subscription,
    SubscriptionPayment, Transaction, TransactionRule,
)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def backup(self):
        response = self.client.get("/exports/backup.json")
        self.assertEqual(response.status_code, 200, response.text[:200])
        self.assertEqual(response.headers["content-type"], "application/json")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertIn("attachment; filename=\"finance-backup-", response.headers["content-disposition"])
        payload = response.json()
        self.assertEqual(payload["format"], "kingdevs-finance-engine")
        self.assertEqual(payload["version"], 1)
        self.assertIn("exported_at", payload)
        return payload["data"]

    def test_empty_backup_lists_every_saved_table(self):
        data = self.backup()
        self.assertEqual(set(data), set(Base.metadata.tables))
        self.assertTrue(all(records == [] for records in data.values()))

    def test_preserves_all_dates_money_history_settings_and_relationships_without_writes(self):
        with self.sessions.begin() as db:
            db.add(Category(name="Food", color="chart-red-2"))
            db.add(BankStyle(name="local bank", display_name="Local Bank", color="#123456", hidden=True))
            db.add(Goal(id=7, name="Savings", type="Savings", target_amount=Decimal("9999999999.99"), target_date=None))
            db.flush()
            db.add_all([
                Transaction(id=3, date=date(1999, 12, 31), merchant='Café, "Lunch"\n二', category="Food", bank="Local Bank", type="expense", amount=Decimal("0.10")),
                Transaction(id=4, date=date(2099, 1, 1), merchant="Salary", category="Food", bank="Local Bank", type="income", amount=Decimal("9999999999.99")),
                Budget(id=5, month=11, year=2026, amount=Decimal("100.01"), category="Food"),
                Budget(id=6, month=12, year=2026, amount=Decimal("500.02"), category=None),
                GoalEntry(id=8, goal_id=7, type="contribution", date=date(2026, 11, 1), note="Saved", amount=Decimal("15.25")),
                TransactionRule(id=9, match_text="café", type="expense", category="Food", enabled=False),
                Subscription(id=10, name="Subscription", amount=Decimal("12.34"), billing_cycle="monthly", next_due_date=date(2026, 12, 1), billing_anchor_date=date(2026, 11, 1), category="Food", payment_method_label="Card", icon=None, is_active=False),
            ])
            db.flush()
            db.add(SubscriptionPayment(id=11, subscription_id=10, due_date=date(2026, 11, 1), paid_on=date(2026, 11, 1), amount=Decimal("12.34")))

        statements = []
        def record(_conn, _cursor, statement, *_args):
            statements.append(statement)
        event.listen(self.engine, "before_cursor_execute", record)
        try:
            data = self.backup()
        finally:
            event.remove(self.engine, "before_cursor_execute", record)
        self.assertTrue(all(statement.lstrip().startswith("SELECT") for statement in statements))
        self.assertEqual(len(statements), len(Base.metadata.tables))
        self.assertEqual([row["amount"] for row in data["transactions"]], ["0.10", "9999999999.99"])
        self.assertEqual([row["date"] for row in data["transactions"]], ["1999-12-31", "2099-01-01"])
        self.assertEqual(data["transactions"][0]["merchant"], 'Café, "Lunch"\n二')
        self.assertEqual(data["budgets"][1]["category"], None)
        self.assertEqual(data["goal_entries"][0]["goal_id"], data["goals"][0]["id"])
        self.assertEqual(data["subscription_payments"][0]["subscription_id"], data["subscriptions"][0]["id"])
        self.assertEqual(data["subscriptions"][0]["billing_anchor_date"], "2026-11-01")
        self.assertFalse(data["subscriptions"][0]["is_active"])
        self.assertIn("created_at", data["subscriptions"][0])
        self.assertFalse(data["transaction_rules"][0]["enabled"])
        self.assertTrue(data["bank_styles"][0]["hidden"])
        self.assertEqual(data["bank_styles"][0]["color"], "#123456")
        with self.sessions() as db:
            for table in Base.metadata.sorted_tables:
                self.assertEqual(len(db.execute(select(table)).all()), len(data[table.name]))

    def test_backup_does_not_use_the_monthly_report_row_limit(self):
        with self.sessions.begin() as db:
            db.add(Category(name="Food", color="chart-red-2"))
            db.flush()
            db.execute(insert(Transaction), [dict(date=date(2026, 11, 1), merchant=f"Row {index}", category="Food", bank="Local Bank", type="expense", amount=Decimal("0.01")) for index in range(10_001)])
        self.assertEqual(len(self.backup()["transactions"]), 10_001)


if __name__ == "__main__":
    unittest.main()
