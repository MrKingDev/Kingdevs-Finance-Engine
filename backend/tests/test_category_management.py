from datetime import date
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.models.category import Category
from backend.models.transaction import Transaction
from backend.models.budget import Budget
from backend.models.transaction_rule import TransactionRule
from backend.models.subscription import Subscription


class CategoryManagementTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        event.listen(self.engine, "connect", lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"))
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions.begin() as db:
            db.add_all([Category(name="Food", color="chart-orange-2"), Category(name="Unused", color="chart-blue-2")])
            db.flush()
            db.add_all([
                Transaction(date=date(2026, 10, 1), merchant="Store", category="Food", bank="Chase", type="expense", amount=12),
                Budget(month=10, year=2026, category="Food", amount=100),
                TransactionRule(match_text="store", type="expense", category="Food"),
                Subscription(name="Delivery", amount=10, billing_cycle="monthly", next_due_date=date(2026, 10, 1), billing_anchor_date=date(2026, 10, 1), category="Food"),
            ])
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_rename_preserves_all_references_and_color(self):
        for old, new in [("Food", "Groceries"), ("Groceries", "groceries")]:
            response = self.client.patch(f"/categories/{old}", json={"name": new})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"name": new, "color": "chart-orange-2"})
            with self.sessions() as db:
                for model in (Transaction, Budget, TransactionRule, Subscription):
                    self.assertEqual(db.scalar(select(model.category)), new)
                self.assertEqual(len(db.scalars(select(Category)).all()), 2)

    def test_duplicate_and_invalid_names_leave_data_unchanged(self):
        self.assertEqual(self.client.patch("/categories/Food", json={"name": "unused"}).status_code, 409)
        for payload in ({"name": " "}, {"name": None}, {"color": None}, {"name": "a" * 101}):
            self.assertEqual(self.client.patch("/categories/Food", json=payload).status_code, 422)
        self.assertEqual(self.client.patch("/categories/Food", json={"color": "chart-blue-2"}).status_code, 200)
        self.assertEqual(self.client.patch("/categories/missing", json={"name": "New"}).status_code, 404)

    def test_delete_unused_and_protect_each_reference(self):
        self.assertEqual(self.client.delete("/categories/Unused").status_code, 204)
        self.assertEqual(self.client.delete("/categories/Unused").status_code, 404)
        for model in (Transaction, Budget, TransactionRule, Subscription):
            self.assertEqual(self.client.delete("/categories/Food").status_code, 409)
            with self.sessions.begin() as db:
                db.delete(db.scalar(select(model)))
        self.assertEqual(self.client.delete("/categories/Food").status_code, 204)
