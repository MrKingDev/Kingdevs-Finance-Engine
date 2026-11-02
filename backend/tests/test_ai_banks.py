from datetime import date
import json
import unittest
from unittest.mock import MagicMock, patch
import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.database import Base, database
from backend.main import app
from backend.models import Category, Transaction, Budget, Subscription, Goal, GoalEntry
from backend.models.bank import BankStyle


class AIBankTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions.begin() as db:
            db.add(Category(name="Food", color="chart-orange-2"))
            db.flush()
            db.add_all([Transaction(date=date(2026, 10, 1), merchant=f"Shop {i}", bank="Chase", category="Food", type="expense", amount="1.25") for i in range(35)])
            db.add(Transaction(date=date(2026, 9, 1), merchant="Prior month", bank="Chase", category="Food", type="expense", amount="999"))
            db.add(Budget(month=10, year=2026, category="Food", amount="100"))
            db.add(Subscription(name="Plan", amount="5", billing_cycle="monthly", next_due_date=date(2026, 11, 1), billing_anchor_date=date(2026, 10, 1), category="Food"))
            goal = Goal(name="Emergency", type="Savings", target_amount="1000")
            db.add(goal); db.flush()
            db.add(GoalEntry(goal_id=goal.id, type="contribution", date=date(2026, 10, 1), amount="100", note="private note"))
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start(); self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def ollama(self, payload):
        response = MagicMock()
        response.json.return_value = payload
        client = MagicMock()
        client.post.return_value = response
        client.get.return_value = response
        manager = patch("backend.routes.ai.httpx.Client")
        mock = manager.start()
        mock.return_value.__enter__.return_value = client
        self.addCleanup(manager.stop)
        return client

    def test_context_totals_include_omitted_rows_and_preserve_data(self):
        ollama = self.ollama({"message": {"content": "Expenses are 43.75."}})
        result = self.client.post("/ai/chat", json={"message": "Summarize", "year": 2026, "month": 10})
        self.assertEqual(result.status_code, 200, result.text)
        context = json.loads(ollama.post.call_args.kwargs["json"]["messages"][0]["content"].split("Snapshot JSON follows:\n")[1])
        self.assertEqual(context["totals"]["expenses"], "43.75")
        self.assertEqual(context["totals"]["transaction_count"], 35)
        self.assertEqual(context["coverage"]["transactions_omitted"], 5)
        self.assertEqual(len(context["recent_transactions"]), 30)
        self.assertEqual(context["monthly_budgets"][0]["remaining"], "56.25")
        self.assertEqual(context["current_goals"][0]["contributed"], "100.00")
        self.assertEqual(context["current_active_subscriptions"][0]["name"], "Plan")
        self.assertNotIn("private note", json.dumps(context))
        with self.sessions() as db:
            self.assertEqual(len(db.scalars(select(Transaction)).all()), 36)

    def test_empty_month_and_validation(self):
        ollama = self.ollama({"message": {"content": "No transactions."}})
        result = self.client.post("/ai/chat", json={"message": "Summary", "year": 2025, "month": 1})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["coverage"]["transactions_shown"], 0)
        self.assertEqual(self.client.post("/ai/chat", json={"message": "Hi", "month": 13}).status_code, 422)
        self.assertEqual(self.client.post("/ai/chat", json={"message": " "}).status_code, 400)
        self.assertEqual(ollama.post.call_count, 1)

    def test_connection_status_and_errors(self):
        ollama = self.ollama({"models": [{"name": "qwen3:4b"}]})
        with patch.dict("os.environ", {"OLLAMA_MODEL": "qwen3:4b"}):
            self.assertTrue(self.client.get("/ai/status").json()["ready"])
            ollama.get.return_value.json.return_value = {"models": []}
            self.assertFalse(self.client.get("/ai/status").json()["ready"])
        for error, code in [(httpx.ConnectError("offline"), 503), (httpx.ReadTimeout("slow"), 504)]:
            ollama.post.side_effect = error
            self.assertEqual(self.client.post("/ai/chat", json={"message": "Summary"}).status_code, code)
        ollama.post.side_effect = None
        ollama.post.return_value.json.return_value = {"message": {"content": ""}}
        self.assertEqual(self.client.post("/ai/chat", json={"message": "Summary"}).status_code, 502)

    def bank(self, name):
        return next((row for row in self.client.get("/banks").json() if row["name"] == name), None)

    def test_bank_colors_persist_normalize_validate_and_reset(self):
        self.assertEqual(self.client.put("/banks/Chase", json={"color": "#ffffff"}).status_code, 200)
        self.assertEqual(self.client.put("/banks/CHASE", json={"color": "#12AB34"}).status_code, 200)
        self.assertEqual(self.bank("Chase")["color"], "#12ab34")
        with self.sessions() as db:
            self.assertEqual(len(db.scalars(select(BankStyle)).all()), 1)
        self.assertEqual(self.client.put("/banks/Chase", json={"color": "red"}).status_code, 422)
        self.assertEqual(self.client.delete("/banks/color/chase").status_code, 204)
        self.assertIsNone(self.bank("Chase")["color"])
        self.assertEqual(self.client.put("/banks/Local%20Credit%20Union", json={"color": "#112233"}).status_code, 200)
        self.assertEqual(self.bank("Local Credit Union")["color"], "#112233")

    def test_rename_preserves_color_and_transactions_and_hides_old_default(self):
        self.client.put("/banks/Chase", json={"color": "#112233"})
        response = self.client.patch("/banks/Chase", json={"name": "My Checking"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(self.bank("Chase"))
        self.assertEqual(self.bank("My Checking"), {"name": "My Checking", "color": "#112233", "transaction_count": 36})
        with self.sessions() as db:
            self.assertEqual(set(db.scalars(select(Transaction.bank))), {"My Checking"})
        self.assertEqual(self.client.patch("/banks/My%20Checking", json={"name": "MY CHECKING"}).status_code, 200)
        self.assertEqual(self.bank("MY CHECKING")["transaction_count"], 36)

    def test_delete_reassigns_transactions_and_persists_removal(self):
        self.assertEqual(self.client.delete("/banks/Chase").status_code, 409)
        self.assertEqual(self.client.delete("/banks/Chase?replacement=chase").status_code, 422)
        self.assertEqual(self.client.delete("/banks/Chase?replacement=missing").status_code, 404)
        self.assertEqual(self.client.delete("/banks/Chase?replacement=Citi").status_code, 204)
        self.assertIsNone(self.bank("Chase"))
        self.assertEqual(self.bank("Citi")["transaction_count"], 36)
        self.assertEqual(self.client.delete("/banks/Discover").status_code, 204)
        self.assertIsNone(self.bank("Discover"))
        with self.sessions() as db:
            self.assertTrue(db.get(BankStyle, "chase").hidden)
            self.assertEqual(len(db.scalars(select(Transaction)).all()), 36)
        # Explicitly adding a previously removed bank makes it available again.
        self.client.put("/banks/Discover", json={"color": "#abcdef"})
        self.assertIsNotNone(self.bank("Discover"))

    def test_rename_validation_and_unused_custom_bank(self):
        self.assertEqual(self.client.patch("/banks/Chase", json={"name": "Citi"}).status_code, 409)
        for name in [" ", "a" * 101, None]:
            self.assertEqual(self.client.patch("/banks/Chase", json={"name": name}).status_code, 422)
        self.assertEqual(self.client.patch("/banks/missing", json={"name": "New"}).status_code, 404)
        self.client.put("/banks/Local", json={"color": "#112233"})
        self.assertEqual(self.client.patch("/banks/Local", json={"name": "Credit Union"}).status_code, 200)
        self.assertIsNone(self.bank("Local"))
        self.assertIsNotNone(self.bank("Credit Union"))
        self.client.delete("/banks/color/Credit%20Union")
        self.assertIsNotNone(self.bank("Credit Union"))
        self.assertEqual(self.client.delete("/banks/Credit%20Union").status_code, 204)
        self.assertIsNone(self.bank("Credit Union"))
