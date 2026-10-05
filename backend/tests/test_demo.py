"""Demo safeguards, deterministic sample data and read-only reruns."""
from datetime import date
from decimal import Decimal
import unittest

from sqlalchemy import create_engine, event, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from backend.database import Base
from backend.models import Budget, Category, Subscription, SubscriptionPayment, Transaction
from backend.seed_demo import assert_demo_database, seed_demo
from backend.services.exports import monthly_report


class DemoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)

    def test_requires_both_opt_in_and_exact_demo_database(self):
        demo = make_url("postgresql+psycopg://example/finance_engine_demo")
        live = make_url("postgresql+psycopg://example/finance_engine")
        assert_demo_database(demo, "true")
        for url, flag in [(demo, None), (demo, "false"), (live, "true"), (live, None)]:
            with self.assertRaises(RuntimeError):
                assert_demo_database(url, flag)

    def test_seed_populates_six_months_and_does_not_duplicate_or_overwrite(self):
        with Session(self.engine) as db, db.begin():
            self.assertTrue(seed_demo(db, date(2026, 10, 5)))
        with Session(self.engine) as db, db.begin():
            self.assertFalse(seed_demo(db, date(2026, 11, 5)))
            for model, count in [(Transaction, 168), (Category, 12), (Budget, 42), (Subscription, 5), (SubscriptionPayment, 5)]:
                self.assertEqual(db.scalar(select(func.count()).select_from(model)), count)
            report = monthly_report(db, 2026, 10)
            self.assertEqual(len(report.transactions), 28)
            self.assertEqual(report.income, Decimal("5920.00"))
            self.assertGreater(len(report.categories), 8)
            self.assertGreater(report.net, 0)
            self.assertLessEqual(db.scalar(select(func.max(Transaction.date))), date(2026, 10, 5))
            self.assertEqual(db.scalar(select(func.min(Transaction.date))).month, 5)

    def test_first_day_of_year_and_leap_february_dates(self):
        for as_of in [date(2024, 2, 29), date(2026, 1, 1)]:
            with self.subTest(as_of=as_of), Session(self.engine) as db:
                self.assertTrue(seed_demo(db, as_of))
                db.flush()
                self.assertLessEqual(db.scalar(select(func.max(Transaction.date))), as_of)
                self.assertEqual(len(monthly_report(db, as_of.year, as_of.month).transactions), 28)
                self.assertTrue(all(p.paid_on <= as_of for p in db.scalars(select(SubscriptionPayment))))
                db.rollback()

    def test_existing_record_and_failed_seed_are_preserved_atomically(self):
        with Session(self.engine) as db:
            seed_demo(db, date(2026, 10, 5))
            db.rollback()
        with Session(self.engine) as db, db.begin():
            self.assertEqual(db.scalar(select(func.count()).select_from(Category)), 0)
            db.add(Budget(month=10, year=2026, amount=Decimal("12.00")))
        with Session(self.engine) as db, db.begin():
            self.assertFalse(seed_demo(db, date(2026, 10, 5)))
            self.assertEqual(db.scalar(select(Budget.amount)), Decimal("12.00"))
            self.assertEqual(db.scalar(select(func.count()).select_from(Transaction)), 0)


if __name__ == "__main__":
    unittest.main()
