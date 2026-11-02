"""Download contracts and financial accuracy, using only an isolated database."""

import csv
from datetime import date
from decimal import Decimal
from io import BytesIO, StringIO
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.models.category import Category
from backend.models.transaction import Transaction
from backend.services.exports import monthly_report


class ExportTests(unittest.TestCase):
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

    def transaction(self, day="2026-10-01", amount="10.00", kind="expense", category="Housing",
                    merchant="Rent", bank="Local bank"):
        with self.sessions.begin() as db:
            if db.get(Category, category) is None:
                db.add(Category(name=category, color="chart-indigo-2"))
                db.flush()
            db.add(Transaction(date=date.fromisoformat(day), amount=Decimal(amount), type=kind,
                               category=category, merchant=merchant, bank=bank))

    def pdf(self, style="styled", month=10, year=2026):
        response = self.client.get(f"/exports/report.pdf?month={month}&year={year}&style={style}")
        self.assertEqual(response.status_code, 200, response.text[:100] if response.status_code != 200 else "")
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertIn(f"finance-report-{year:04}-{month:02}-{style}.pdf", response.headers["content-disposition"])
        self.assertTrue(response.content.startswith(b"%PDF-"))
        reader = PdfReader(BytesIO(response.content))
        return reader, "\n".join(page.extract_text() for page in reader.pages)

    def test_empty_downloads_are_valid_and_styled_matches_reference_sections(self):
        reader, text = self.pdf()
        self.assertEqual(len(reader.pages), 1)
        self.assertEqual(tuple(reader.pages[0].mediabox), (0, 0, 612, 792))
        for label in ["MONTHLY OVERVIEW", "October 2026", "Income", "Expenses", "Net cash flow",
                      "Spending by category", "No spending recorded", "No transactions recorded"]:
            self.assertIn(label, text)
        self.assertEqual(text.count("$0.00"), 4)
        _, basic = self.pdf("basic")
        self.assertNotIn("MONTHLY OVERVIEW", basic)
        self.assertIn("No transactions recorded", basic)
        response = self.client.get("/exports/transactions.csv?month=10&year=2026")
        self.assertEqual(response.content.decode("utf-8-sig"), "date,merchant,category,bank,type,amount\r\n")

    def test_financial_totals_month_edges_and_expense_only_category_totals(self):
        self.transaction(day="2026-09-30", amount="999.99")
        self.transaction(day="2026-10-01", amount="1000.10", kind="income", category="Income", merchant="Salary")
        self.transaction(day="2026-10-31", amount="900.20")
        self.transaction(day="2026-10-15", amount="0.10", category="Food")
        self.transaction(day="2026-11-01", amount="777.77")
        with self.sessions() as db:
            report = monthly_report(db, 2026, 10)
        self.assertEqual((report.income, report.expenses, report.net),
                         (Decimal("1000.10"), Decimal("900.30"), Decimal("99.80")))
        self.assertEqual([c.name for c in report.categories], ["Housing", "Food"])
        for style in ("styled", "basic"):
            _, text = self.pdf(style)
            for amount in ["$1,000.10", "$900.30", "$99.80"]:
                self.assertIn(amount, text)
            self.assertNotIn("999.99", text)
            self.assertNotIn("777.77", text)
            self.assertIn("2026-10-31", text)

    def test_leap_year_and_december_boundaries(self):
        self.transaction(day="2024-02-29", amount="1.01")
        self.transaction(day="2024-03-01", amount="2.02")
        self.transaction(day="2026-12-31", amount="3.03")
        self.transaction(day="2027-01-01", amount="4.04")
        with self.sessions() as db:
            self.assertEqual(monthly_report(db, 2024, 2).expenses, Decimal("1.01"))
            self.assertEqual(monthly_report(db, 2026, 12).expenses, Decimal("3.03"))
        self.assertEqual(self.client.get("/exports/report.pdf?month=12&year=9999").status_code, 200)

    def test_negative_net_and_income_without_spending(self):
        self.transaction(amount="50.00")
        _, text = self.pdf()
        self.assertIn("-$50.00", text)
        self.transaction(day="2026-11-01", kind="income", amount="500.00")
        _, text = self.pdf(month=11)
        self.assertIn("No spending recorded", text)
        self.assertIn("$500.00", text)

    def test_csv_preserves_direction_unicode_quoting_and_formula_safety(self):
        for merchant in ['Café, "Lunch"\nSecond line', '=HYPERLINK("bad")', ' +SUM(1,2)', '-1+1', '@cmd', '\tformula', '\rtext']:
            self.transaction(merchant=merchant, category="=Risk", bank="@Bank")
        self.transaction(kind="income", amount="20.01", merchant="Salary", category="Income")
        response = self.client.get("/exports/transactions.csv?month=10&year=2026")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "text/csv; charset=utf-8")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertTrue(response.content.startswith(b"\xef\xbb\xbf"))
        rows = list(csv.DictReader(StringIO(response.content.decode("utf-8-sig"), newline="")))
        self.assertEqual(rows[0]["merchant"], 'Café, "Lunch"\nSecond line')
        self.assertEqual(rows[0]["category"], "'=Risk")
        self.assertEqual(rows[0]["bank"], "'@Bank")
        for row in rows[1:7]:
            self.assertTrue(row["merchant"].startswith("'"))
        self.assertEqual([(r["type"], r["amount"]) for r in rows], [("expense", "10.00")] * 7 + [("income", "20.01")])

    def test_export_csv_preview_retains_expenses_even_with_positive_amounts(self):
        self.transaction(merchant="Rent", amount="1000.00")
        self.transaction(merchant="Salary", amount="2000.00", kind="income", category="Income")
        contents = self.client.get("/exports/transactions.csv?month=10&year=2026").content
        preview = self.client.post("/imports/csv/preview", data={"bank": "Local bank"},
                                   files={"file": ("export.csv", contents, "text/csv")})
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertEqual([r["type"] for r in preview.json()["rows"]], ["expense", "income"])

    def test_invalid_filters_fail_without_generating_files(self):
        for query in ["", "month=0&year=2026", "month=13&year=2026", "month=10&year=0",
                      "month=10&year=10000", "month=x&year=2026"]:
            for endpoint in ["report.pdf", "transactions.csv"]:
                self.assertEqual(self.client.get(f"/exports/{endpoint}?{query}").status_code, 422)
        self.assertEqual(self.client.get("/exports/report.pdf?month=10&year=2026&style=invalid").status_code, 422)

    def test_all_categories_and_long_transaction_text_survive_pagination(self):
        for index in range(80):
            self.transaction(merchant=f"Unique merchant {index:03} " + "Long merchant & <b>literal</b> " * 6,
                             amount="12.34", category=f"Category {index % 9} " + "long " * 12,
                             bank="Bank " * 20)
        for style in ["styled", "basic"]:
            reader, text = self.pdf(style)
            self.assertGreater(len(reader.pages), 3)
            for index in range(80):
                self.assertIn(f"Unique merchant {index:03}", text)
            for index in range(9):
                self.assertIn(f"Category {index}", text)
            self.assertIn("<b>literal</b>", text)
            self.assertIn("$987.20", text)
        self.assertEqual(len(reader.pages[-1].extract_text().strip()) > 10, True)

    def test_current_category_color_and_saved_years(self):
        self.transaction(day="1999-12-31")
        self.transaction(day="2090-01-01")
        with self.sessions.begin() as db:
            db.get(Category, "Housing").color = "chart-pink-2"
        with self.sessions() as db:
            self.assertEqual(monthly_report(db, 1999, 12).categories[0].color, "chart-pink-2")
        response = self.client.get("/exports/periods")
        self.assertEqual(response.status_code, 200)
        years = response.json()["years"]
        self.assertIn(1999, years)
        self.assertIn(2090, years)
        self.assertIn(date.today().year, years)
        self.assertEqual(years, sorted(set(years), reverse=True))

    def test_limits_reject_whole_export_and_requests_never_write(self):
        self.transaction()
        self.transaction()
        self.transaction()
        with patch("backend.services.exports.MAX_EXPORT_ROWS", 2):
            for endpoint in ["report.pdf", "transactions.csv"]:
                self.assertEqual(self.client.get(f"/exports/{endpoint}?month=10&year=2026").status_code, 413)
        statements = []
        def record(_conn, _cursor, statement, *_args):
            statements.append(statement)
        event.listen(self.engine, "before_cursor_execute", record)
        try:
            self.pdf()
            self.client.get("/exports/transactions.csv?month=10&year=2026")
        finally:
            event.remove(self.engine, "before_cursor_execute", record)
        self.assertEqual(len(statements), 3)  # Two report snapshots and saved PDF preferences.
        self.assertTrue(all(s.lstrip().startswith("SELECT") for s in statements))

    def test_large_amounts_and_unicode_text_render(self):
        self.transaction(amount="9999999999.99", merchant="Café – Résumé & São Paulo", category="Éducation")
        _, text = self.pdf()
        self.assertIn("$9,999,999,999.99", text)
        self.assertIn("Café – Résumé & São Paulo", text.replace("\n", " "))
        self.assertIn("Éducation", text)


if __name__ == "__main__":
    unittest.main()
