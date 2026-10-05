"""Large-file sampling, full-file validation and rollback across insert batches."""
import io
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.models import Category, Transaction
from backend.schemas.import_csv import MAX_CSV_BYTES, MAX_IMPORT_ROWS


class StreamCSVTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions.begin() as db:
            db.add(Category(name="Dining", color="chart-orange-2"))
        factory = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def contents(self, count=1001):
        return "Date,Description,Amount,Type,Category\n" + "".join(
            f"2026-10-01,Merchant {i},1.00,expense,Dining\n" for i in range(count))

    def upload(self, contents, action="preview", **fields):
        return self.client.post("/imports/csv/" + action, data={"bank": "Bulk Test", **fields},
                                files={"file": ("test.csv", contents.encode(), "text/csv")})

    def count(self):
        with self.sessions() as db:
            return db.scalar(select(func.count()).select_from(Transaction))

    def test_large_preview_is_sampled_but_all_rows_are_counted(self):
        contents = self.contents(2503)
        result = self.upload(contents).json()
        self.assertEqual(result["total_rows"], 2503)
        self.assertEqual(result["valid_rows"], 2503)
        self.assertEqual(result["expense_rows"], 2503)
        self.assertEqual(len(result["rows"]), 1000)
        self.assertTrue(result["bulk_import"])
        self.assertEqual(self.count(), 0)
        response = self.upload(contents, "file")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"imported": 2503, "skipped_duplicates": 0})
        self.assertEqual(self.count(), 2503)
        retry = self.upload(contents, "file")
        self.assertEqual(retry.json(), {"imported": 0, "skipped_duplicates": 2503})

    def test_invalid_row_after_sample_rolls_back_preceding_batches(self):
        contents = self.contents(1200) + "2026-02-30,Invalid date,1.00,expense,Dining\n"
        result = self.upload(contents).json()
        self.assertEqual(result["valid_rows"], 1200)
        self.assertEqual(result["total_rows"], 1201)
        self.assertIn("Row 1202", result["first_issue"])
        response = self.upload(contents, "file")
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.count(), 0)

    def test_unknown_direction_or_category_beyond_preview_blocks_entire_file(self):
        for ending, field in [("2026-10-01,Ambiguous,1.00,,Dining\n", "needs_direction"),
                              ("2026-10-01,No category,1.00,expense,Unknown\n", "missing_categories")]:
            contents = self.contents(1100) + ending
            self.assertTrue(self.upload(contents).json()[field])
            self.assertEqual(self.upload(contents, "file").status_code, 422)
            self.assertEqual(self.count(), 0)
        response = self.upload(contents, "file", default_category="dining")
        self.assertEqual(response.json()["imported"], 1101)

    def test_fallback_never_changes_known_categories_and_sign_is_explicit(self):
        with self.sessions.begin() as db:
            db.add(Category(name="Income", color="chart-green-2"))
        contents = "Date,Description,Amount,Type,Category\n2026-10-01,Pay,20,income,Income\n2026-10-01,Rent,10,,Unknown\n"
        response = self.upload(contents, "file", default_category="Dining", expense_sign="positive")
        self.assertEqual(response.json()["imported"], 2)
        with self.sessions() as db:
            rows = db.scalars(select(Transaction).order_by(Transaction.id)).all()
            self.assertEqual([(r.type, r.category) for r in rows], [("income", "Income"), ("expense", "Dining")])

    def test_duplicates_across_batches_and_different_decimal_spellings(self):
        contents = self.contents(1001) + "2026-10-01, merchant 0 ,1,expense,Dining\n"
        self.assertEqual(self.upload(contents).json()["duplicate_rows"], 1)
        self.assertEqual(self.upload(contents, "file").json(), {"imported": 1001, "skipped_duplicates": 1})

    def test_size_and_row_limits_are_inclusive_and_rechecked_on_commit(self):
        self.assertEqual(MAX_CSV_BYTES, 50_000_000)
        self.assertEqual(MAX_IMPORT_ROWS, 500_000)
        contents = self.contents(3)
        with patch("backend.services.csv_stream.MAX_CSV_BYTES", len(contents.encode())):
            self.assertEqual(self.upload(contents).status_code, 200)
            self.assertEqual(self.upload(contents + "\n", "file").status_code, 413)
        with patch("backend.services.csv_stream.MAX_IMPORT_ROWS", 3):
            self.assertEqual(self.upload(contents).status_code, 200)
            self.assertEqual(self.upload(self.contents(4), "file").status_code, 413)
        self.assertEqual(self.count(), 0)

    def test_oversized_and_malformed_tail_roll_back(self):
        contents = self.contents(1100)
        for ending in ['2026-10-01,"unclosed,1,expense,Dining\n', "2026-10-01,Has\x00NUL,1,expense,Dining\n"]:
            self.assertEqual(self.upload(contents + ending, "file").status_code, 422)
            self.assertEqual(self.count(), 0)
        with patch("backend.services.csv_stream.MAX_IMPORT_ROWS", 1100):
            self.assertEqual(self.upload(self.contents(1101), "file").status_code, 413)
            self.assertEqual(self.count(), 0)


if __name__ == "__main__":
    unittest.main()
