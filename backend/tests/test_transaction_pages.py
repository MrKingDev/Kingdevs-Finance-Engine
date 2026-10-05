"""Server-side pagination must filter before slicing and preserve a stable order."""
from datetime import date
from decimal import Decimal
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.models import Category, Transaction


class TransactionPageTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions.begin() as db:
            db.add(Category(name="Food", color="chart-orange-2"))
            db.flush()
            db.add_all([Transaction(date=date(2026, 10 if i % 2 else 9, 1), merchant=f"Merchant {i}",
                                    category="Food", bank="Demo Card" if i % 2 else "Demo Checking",
                                    type="expense" if i % 2 else "income", amount=Decimal(i + 1)) for i in range(101)])
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_fifty_per_page_without_overlap_and_stable_newest_first_order(self):
        pages = [self.client.get(f"/transactions/page?page={page}").json() for page in (1, 2, 3)]
        self.assertEqual([len(p["items"]) for p in pages], [50, 50, 1])
        ids = [r["id"] for p in pages for r in p["items"]]
        self.assertEqual(len(set(ids)), 101)
        for p in pages:
            self.assertEqual((p["total"], p["page_size"], p["pages"]), (101, 50, 3))
        rows = [r for p in pages for r in p["items"]]
        self.assertEqual([(r["date"], r["id"]) for r in rows], sorted([(r["date"], r["id"]) for r in rows], reverse=True))

    def test_filters_apply_to_entire_dataset_before_pagination(self):
        result = self.client.get("/transactions/page?type=income&bank=Demo%20Checking&category=Food&start_date=2026-09-01&end_date=2026-09-30&min_amount=20&max_amount=100").json()
        self.assertEqual(result["total"], 40)
        self.assertEqual(result["overall_total"], 101)
        self.assertTrue(all(r["type"] == "income" and 20 <= Decimal(r["amount"]) <= 100 for r in result["items"]))
        self.assertEqual(self.client.get("/transactions/page?search=Merchant%20100").json()["total"], 1)
        self.assertEqual(self.client.get("/transactions/page?search=%25").json()["total"], 0)
        self.assertEqual(self.client.get("/transactions/page?search=demo%20card").json()["total"], 50)

    def test_last_page_deletion_clamps_to_existing_page(self):
        last = self.client.get("/transactions/page?page=3").json()["items"][0]
        self.assertEqual(self.client.delete(f"/transactions/{last['id']}").status_code, 204)
        result = self.client.get("/transactions/page?page=3").json()
        self.assertEqual((result["page"], result["pages"], len(result["items"])), (2, 2, 50))

    def test_empty_result_and_invalid_query_values(self):
        empty = self.client.get("/transactions/page?search=absent&page=99999").json()
        self.assertEqual((empty["items"], empty["page"], empty["pages"]), ([], 1, 1))
        for query in ["page=0", "type=invalid", "min_amount=-1", "min_amount=NaN",
                      "min_amount=10&max_amount=1", "start_date=2026-10-02&end_date=2026-10-01"]:
            self.assertEqual(self.client.get("/transactions/page?" + query).status_code, 422)

    def test_bank_options_come_from_saved_transactions(self):
        self.assertEqual(self.client.get("/transactions/banks").json(), ["Demo Card", "Demo Checking"])
        # Preserve the original list contract for existing dashboard/report widgets.
        self.assertEqual(len(self.client.get("/transactions").json()), 101)


if __name__ == "__main__":
    unittest.main()
