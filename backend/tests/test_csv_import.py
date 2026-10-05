"""CSV import regressions; writes use a disposable database, never the user's ledger."""

import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, database
from backend.main import app
from backend.schemas.import_csv import MAX_CSV_BYTES


class CSVImportTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        factory_patch = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory_patch.start()
        self.addCleanup(factory_patch.stop)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        response = self.client.post("/categories", json={"name": "Dining", "color": "chart-blue-2"})
        self.assertEqual(response.status_code, 201)

    def preview(self, contents="Date,Description,Amount,Category\n10/01/2026,Coffee,-4.50,Dining\n", filename="bank.csv", **options):
        if isinstance(contents, str):
            contents = contents.encode("utf-8")
        return self.client.post("/imports/csv/preview", data={"bank": "Example Bank", "amount_mode": "signed", **options},
                                files={"file": (filename, contents, "text/csv")})

    def commit(self, rows=None, bank="Example Bank"):
        if rows is None:
            rows = [self.row()]
        return self.client.post("/imports/csv/commit", json={"bank": bank, "rows": rows})

    def row(self, **changes):
        return {"row_number": 2, "date": "2026-10-01", "merchant": "Coffee", "type": "expense",
                "amount": "4.50", "category": "Dining", **changes}

    def test_preview_parses_bom_quotes_and_does_not_write(self):
        response = self.preview('\ufeffTransaction Date,Description,Amount,Category\r\n10/01/2026,"Cafe, downtown",-$4.50, dining \r\n10/02/2026,Salary,"$2,500.00",Unknown\r\n', bank=" My Bank ")
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["bank"], "My Bank")
        self.assertEqual(result["mapping"]["date"], "Transaction Date")
        self.assertEqual(result["valid_rows"], 2)
        self.assertEqual(result["rows"][0]["merchant"], "Cafe, downtown")
        self.assertEqual(result["rows"][0]["amount"], "4.50")
        self.assertEqual(result["rows"][0]["type"], "expense")
        self.assertEqual(result["rows"][0]["category"], "Dining")
        self.assertEqual(result["rows"][1]["amount"], "2500.00")
        self.assertEqual(result["rows"][1]["type"], "income")
        self.assertIsNone(result["rows"][1]["category"])
        self.assertEqual(self.client.get("/transactions").json(), [])
        self.assertEqual(len(self.client.get("/categories").json()), 1)

    def test_amount_modes_do_not_depend_on_bank_name(self):
        examples = [
            ("signed", "Amount", "(12.34)", "expense"),
            ("positive_expense", "Amount", "12.34", "expense"),
            ("positive_expense", "Amount", "-12.34", "income"),
            ("debit_credit", "Debit,Credit", "12.34,", "expense"),
            ("debit_credit", "Withdrawals,Deposits", ",12.34", "income"),
            ("type_column", "Amount,Type", "12.34,DEBIT", "expense"),
            ("type_column", "Amount,Type", "12.34,credit", "income"),
        ]
        for mode, headers, values, kind in examples:
            with self.subTest(mode=mode, values=values):
                response = self.preview(f"Date,Payee,{headers}\n2026-10-01,Shop,{values}\n", amount_mode=mode, bank="Any bank")
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["valid_rows"], 1, response.text)
                self.assertEqual(response.json()["rows"][0]["type"], kind)
                self.assertEqual(response.json()["rows"][0]["amount"], "12.34")

    def test_mapping_recovers_unknown_headers_and_detects_delimiters(self):
        for delimiter in (",", ";", "\t"):
            with self.subTest(delimiter=delimiter):
                csv = delimiter.join(["When", "Who", "Value"]) + "\n" + delimiter.join(["01/10/2026", "Shop", "-12.34"]) + "\n"
                missing = self.preview(csv).json()
                self.assertEqual(missing["rows"], [])
                self.assertTrue(missing["errors"])
                mapped = self.preview(csv, mapping=json.dumps({"date": "When", "merchant": "Who", "amount": "Value"}), date_format="dmy")
                self.assertEqual(mapped.json()["valid_rows"], 1, mapped.text)
                self.assertEqual(mapped.json()["rows"][0]["date"], "2026-10-01")

    def test_invalid_mapping_and_modes_are_rejected(self):
        for mapping in ("not-json", "[]", '{"unexpected":"Date"}'):
            self.assertEqual(self.preview(mapping=mapping).status_code, 422)
        for mapping in ({"date": "Missing", "merchant": "Description", "amount": "Amount"},
                        {"date": "Date", "merchant": "Date", "amount": "Amount"}):
            response = self.preview(mapping=json.dumps(mapping))
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["errors"])
            self.assertEqual(response.json()["rows"], [])
        self.assertEqual(self.preview(amount_mode="guess").status_code, 422)
        self.assertEqual(self.preview(date_format="guess").status_code, 422)

    def test_quoted_delimiters_and_multiline_descriptions(self):
        response = self.preview('Date;"Description, memo, payee, details";Amount\n2026-10-01;"Coffee\nand cake";-.50\n',
                                mapping=json.dumps({"date": "Date", "merchant": "Description, memo, payee, details", "amount": "Amount"}))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["valid_rows"], 1, response.text)
        row = response.json()["rows"][0]
        self.assertEqual(row["merchant"], "Coffee\nand cake")
        self.assertEqual(row["row_number"], 3)
        self.assertEqual(row["amount"], "0.50")

    def test_dates_must_match_selected_format_and_calendar(self):
        cases = [("02/29/2024", "mdy", "2024-02-29"), ("29/02/2024", "dmy", "2024-02-29"),
                 ("2026-10-01", "iso", "2026-10-01"), ("02/29/2026", "mdy", None),
                 ("10/01/26", "mdy", None), ("10/01/2026", "iso", None),
                 ("31/01/2026", "mdy", None)]
        for value, mode, expected in cases:
            with self.subTest(value=value, mode=mode):
                row = self.preview(f"Date,Description,Amount\n{value},Shop,-2.00\n", date_format=mode).json()["rows"][0]
                self.assertEqual(row["date"], expected)
                self.assertEqual(bool(row["errors"]), expected is None)

    def test_invalid_rows_are_reported_without_discarding_valid_rows(self):
        response = self.preview("Date,Description,Amount\n2026-10-01,Good,-1.25\n2026-02-30,Bad date,-2\n2026-10-01,Bad amount,NaN\n2026-10-01,Wrong cells,-4,Extra\n2026-10-01,   ,-5\n")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_rows"], 5)
        self.assertEqual(response.json()["valid_rows"], 1)
        self.assertEqual([row["row_number"] for row in response.json()["rows"]], [2, 3, 4, 5, 6])
        self.assertTrue(all(row["errors"] for row in response.json()["rows"][1:]))
        self.assertEqual(self.client.get("/transactions").json(), [])

    def test_unsafe_or_ambiguous_amounts_are_row_errors(self):
        for value in ("0", "1.234", "10000000000.00", "NaN", "Infinity", "1e2", "12,34", "(-2.50)", "1$2"):
            with self.subTest(value=value):
                response = self.preview(f'Date,Description,Amount\n2026-10-01,Shop,"{value}"\n')
                self.assertEqual(response.json()["valid_rows"], 0, response.text)
                self.assertTrue(response.json()["rows"][0]["errors"])

    def test_ambiguous_debit_credit_and_unknown_types_are_errors(self):
        for values in ("0,0", "2,3", "-2,0"):
            result = self.preview(f"Date,Description,Debit,Credit\n2026-10-01,Shop,{values}\n", amount_mode="debit_credit").json()
            self.assertEqual(result["valid_rows"], 0)
        result = self.preview("Date,Description,Amount,Type\n2026-10-01,Shop,4.50,unknown\n", amount_mode="type_column").json()
        self.assertEqual(result["valid_rows"], 0)

    def test_file_errors_have_actionable_responses(self):
        files = (b"", b"\x00", b"\xff", b"Date,Description,Amount\n", b"Date,Description,Amount\n2026-10-01,\"unclosed,-2",
                 b"Date,Date,Amount\n2026-10-01,Shop,-2", b"Date,,Amount\n2026-10-01,Shop,-2")
        for contents in files:
            with self.subTest(contents=contents):
                response = self.preview(contents)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertIsInstance(response.json()["detail"], str)
        self.assertEqual(self.preview(filename="bank.xlsx").status_code, 422)

    def test_file_size_row_and_cell_limits(self):
        self.assertEqual(self.preview(b"x" * (MAX_CSV_BYTES + 1)).status_code, 413)
        with patch("backend.services.csv_stream.MAX_IMPORT_ROWS", 1000):
            self.assertEqual(self.preview("Date,Description,Amount\n" + "2026-10-01,Shop,-1\n" * 1001).status_code, 413)
        self.assertEqual(self.preview("Date,Description,Amount\n2026-10-01," + "x" * 4097 + ",-1\n").status_code, 422)
        maximum = self.preview("Date,Description,Amount\n" + "2026-10-01,Shop,-1\n" * 1000)
        self.assertEqual(maximum.status_code, 200)
        self.assertEqual(maximum.json()["total_rows"], 1000)
        self.assertEqual(maximum.json()["duplicate_rows"], 999)

    def test_bank_name_is_required_and_bounded(self):
        for value in ("   ", "x" * 101):
            self.assertEqual(self.preview(bank=value).status_code, 422)
            self.assertEqual(self.commit(bank=value).status_code, 422)
        self.assertEqual(self.client.post("/imports/csv/preview", data={"bank": "Bank"}).status_code, 422)

    def test_commit_updates_transactions_budget_totals_and_category_colors(self):
        budget = self.client.post("/budgets", json={"month": 10, "year": 2026, "amount": "100.00", "category": "Dining"})
        self.assertEqual(budget.status_code, 201)
        result = self.commit([self.row(category=" dining ", merchant=" Coffee "), self.row(row_number=3, merchant="Refund", type="income", amount="2.00")], bank=" My Bank ")
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json(), {"imported": 2, "skipped_duplicates": 0})
        transactions = self.client.get("/transactions").json()
        self.assertEqual(len(transactions), 2)
        self.assertTrue(all(row["bank"] == "My Bank" and row["category"] == "Dining" for row in transactions))
        self.assertTrue(all(row["pie-color"] == "var(--chart-blue-2)" for row in transactions))
        totals = self.client.get(f"/budgets/{budget.json()['id']}").json()
        self.assertEqual(totals["spent"], "4.50")
        self.assertEqual(totals["remaining"], "95.50")

    def test_preview_and_commit_skip_existing_and_in_file_duplicates(self):
        self.assertEqual(self.commit().json()["imported"], 1)
        preview = self.preview("Date,Description,Amount,Category\n2026-10-01, coffee ,-4.5,Other\n2026-10-02,New,-3,Dining\n2026-10-02,NEW,-3.00,Dining\n", bank=" EXAMPLE BANK ").json()
        self.assertEqual([row["duplicate"] for row in preview["rows"]], [True, False, True])
        result = self.commit([self.row(), self.row(row_number=3, merchant="New"), self.row(row_number=4, merchant="new")])
        self.assertEqual(result.json(), {"imported": 1, "skipped_duplicates": 2})
        retry = self.commit([self.row(), self.row(merchant="New")])
        self.assertEqual(retry.json(), {"imported": 0, "skipped_duplicates": 2})
        self.assertEqual(len(self.client.get("/transactions").json()), 2)

    def test_same_transaction_at_different_bank_is_not_duplicate(self):
        self.assertEqual(self.commit().json()["imported"], 1)
        self.assertEqual(self.commit(bank="Another Bank").json()["imported"], 1)

    def test_commit_rechecks_duplicates_after_preview(self):
        self.assertEqual(self.preview().json()["duplicate_rows"], 0)
        self.assertEqual(self.commit().json()["imported"], 1)
        self.assertEqual(self.commit().json(), {"imported": 0, "skipped_duplicates": 1})

    def test_unknown_category_rejects_entire_batch_without_creating_categories(self):
        response = self.commit([self.row(), self.row(row_number=3, merchant="Unknown", category="Not saved")])
        self.assertEqual(response.status_code, 422)
        self.assertIn("Row 3", response.json()["detail"])
        self.assertEqual(self.client.get("/transactions").json(), [])
        self.assertEqual(len(self.client.get("/categories").json()), 1)

    def test_commit_validates_untrusted_rows_independently_of_preview(self):
        for changes in ({"amount": "-2"}, {"amount": "0"}, {"amount": "1.234"}, {"amount": "10000000000"},
                        {"merchant": " "}, {"merchant": "x" * 256}, {"date": "2026-02-30"}, {"type": "transfer"},
                        {"category": None}, {"row_number": 1}, {"bank": "Unexpected per-row bank"}):
            with self.subTest(changes=changes):
                self.assertEqual(self.commit([self.row(), self.row(**changes)]).status_code, 422)
        self.assertEqual(self.commit([]).status_code, 422)
        self.assertEqual(self.commit([self.row()] * 1001).status_code, 422)
        self.assertEqual(self.client.get("/transactions").json(), [])

    def test_commit_failure_rolls_back_flushed_rows_and_hides_details(self):
        def fail_commit(session):
            session.flush()
            raise SQLAlchemyError("private database details")

        with patch.object(Session, "commit", fail_commit):
            result = self.commit([self.row(), self.row(merchant="Second")])
        self.assertEqual(result.status_code, 500)
        self.assertNotIn("private", result.text)
        self.assertEqual(self.client.get("/transactions").json(), [])
        self.assertEqual(self.commit().json()["imported"], 1)

    def test_database_unavailable_returns_safe_503(self):
        with patch.object(Session, "commit", side_effect=OperationalError("private", {}, Exception("secret"))):
            result = self.commit()
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.json(), {"detail": "Database is unavailable."})
        self.assertEqual(self.client.get("/transactions").json(), [])

    def create_rule(self, text="rent", kind="expense", category=None, enabled=True):
        response = self.client.post("/rules", json={"match_text": text, "type": kind, "category": category, "enabled": enabled})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_default_auto_uses_bank_type_instead_of_positive_sign(self):
        for header, debit, credit in (("Type", "Debit", "Credit"), ("Debit/Credit", "DR", "CR"), ("Transaction Type", "Sale", "Deposit")):
            with self.subTest(header=header):
                contents = f"Date,Description,Amount,{header}\n2026-10-01,Rent,1200,{debit}\n2026-10-02,Salary,2500,{credit}\n"
                result = self.client.post("/imports/csv/preview", data={"bank": "Bank"}, files={"file": ("sample.csv", contents.encode(), "text/csv")})
                self.assertEqual(result.status_code, 200, result.text)
                self.assertEqual([row["type"] for row in result.json()["rows"]], ["expense", "income"])
                self.assertFalse(result.json()["needs_direction"])

    def test_auto_detects_debit_credit_before_net_amount_column(self):
        result = self.preview("Date,Description,Amount,Debit,Credit\n2026-10-01,Rent,1200,1200,\n2026-10-02,Salary,-2500,,2500\n", amount_mode="auto").json()
        self.assertEqual([row["type"] for row in result["rows"]], ["expense", "income"])
        self.assertFalse(result["needs_direction"])

    def test_unsigned_amounts_need_a_rule_or_user_decision_not_income_guess(self):
        result = self.preview("Date,Description,Amount\n2026-10-01,Unknown,1200\n2026-10-02,Another,-5\n", amount_mode="auto").json()
        self.assertTrue(result["needs_direction"])
        self.assertEqual([row["type"] for row in result["rows"]], [None, None])
        self.assertEqual(result["valid_rows"], 2)
        self.assertEqual(self.commit([self.row(type=None)]).status_code, 422)
        resolved = self.preview("Date,Description,Amount\n2026-10-01,Unknown,1200\n2026-10-02,Another,-5\n", amount_mode="auto", expense_sign="positive").json()
        self.assertEqual([row["type"] for row in resolved["rows"]], ["expense", "income"])

    def test_rent_and_salary_rules_handle_all_positive_sample(self):
        self.create_rule(category="Dining")
        self.create_rule("salary", "income")
        result = self.preview("Date,Description,Amount\n2026-10-01,Apartment RENT,1200\n2026-10-02,Monthly salary,2500\n", amount_mode="auto").json()
        self.assertEqual([row["type"] for row in result["rows"]], ["expense", "income"])
        self.assertEqual(result["rows"][0]["matched_rule"], "rent")
        self.assertEqual(result["rows"][0]["category"], "Dining")
        self.assertFalse(result["needs_direction"])

    def test_bank_direction_wins_over_rules_and_sign_fallback(self):
        self.create_rule()
        result = self.preview("Date,Description,Amount,Type\n2026-10-01,Rent refund,100,Credit\n2026-10-02,Unknown,-10,Debit\n", amount_mode="auto", expense_sign="positive").json()
        self.assertEqual([row["type"] for row in result["rows"]], ["income", "expense"])
        self.assertIsNone(result["rows"][0]["matched_rule"])

    def test_specific_rule_wins_and_words_do_not_match_inside_other_words(self):
        self.create_rule()
        self.create_rule("rent refund", "income")
        result = self.preview("Date,Description,Amount\n2026-10-01,Rent refund,100\n2026-10-02,Parent,50\n", amount_mode="auto").json()
        self.assertEqual(result["rows"][0]["type"], "income")
        self.assertEqual(result["rows"][0]["matched_rule"], "rent refund")
        self.assertIsNone(result["rows"][1]["type"])

    def test_disabled_rules_do_not_classify_and_category_keeps_csv_match(self):
        self.create_rule(enabled=False)
        self.assertTrue(self.preview("Date,Description,Amount\n2026-10-01,Rent,1200\n", amount_mode="auto").json()["needs_direction"])
        self.client.post("/categories", json={"name": "Work", "color": "chart-blue-2"})
        self.create_rule("salary", "income", "Work")
        result = self.preview("Date,Description,Amount,Category\n2026-10-01,Salary,1200,Dining\n", amount_mode="auto").json()
        self.assertEqual(result["rows"][0]["category"], "Dining")

    def test_manual_type_correction_rechecks_both_directions_of_duplicates(self):
        self.commit()
        csv = "Date,Description,Amount,Type\n2026-10-01,Coffee,4.50,Credit\n"
        first = self.preview(csv, amount_mode="auto").json()
        self.assertFalse(first["rows"][0]["duplicate"])
        corrected = self.preview(csv, amount_mode="auto", type_overrides='{"2":"expense"}').json()
        self.assertTrue(corrected["rows"][0]["duplicate"])
        self.assertEqual(corrected["rows"][0]["type"], "expense")
        changed_back = self.preview(csv, amount_mode="auto", type_overrides='{"2":"income"}').json()
        self.assertFalse(changed_back["rows"][0]["duplicate"])

    def test_type_override_never_bypasses_amount_validation(self):
        result = self.preview("Date,Description,Amount\n2026-10-01,Shop,NaN\n", amount_mode="auto", type_overrides='{"2":"expense"}').json()
        self.assertEqual(result["valid_rows"], 0)
        for overrides in ('{"2":"transfer"}', '{"1":"income"}', '[]', '{"wrong":"income"}'):
            self.assertEqual(self.preview(type_overrides=overrides).status_code, 422)
        self.assertEqual(self.preview(expense_sign="guess").status_code, 422)

    def test_rules_crud_normalization_and_saved_category_validation(self):
        rule = self.create_rule("  Monthly   RENT  ", category=" dining ")
        self.assertEqual(rule["match_text"], "monthly rent")
        self.assertEqual(rule["category"], "Dining")
        self.assertEqual(self.client.post("/rules", json={"match_text": "MONTHLY RENT", "type": "income"}).status_code, 409)
        self.assertEqual(self.client.post("/rules", json={"match_text": "other", "type": "income", "category": "Missing"}).status_code, 422)
        for body in ({"match_text": " ", "type": "income"}, {"match_text": "other", "type": "transfer"}):
            self.assertEqual(self.client.post("/rules", json=body).status_code, 422)
        updated = self.client.put(f"/rules/{rule['id']}", json={"match_text": "Rent refund", "type": "income", "enabled": False})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertFalse(updated.json()["enabled"])
        self.assertIsNone(updated.json()["category"])
        self.assertEqual(self.client.delete(f"/rules/{rule['id']}").status_code, 204)
        self.assertEqual(self.client.get("/rules").json(), [])
        self.assertEqual(self.client.delete(f"/rules/{rule['id']}").status_code, 404)

    def test_rules_retain_matching_after_clear_data_but_drop_category_link(self):
        self.create_rule(category="Dining")
        self.assertEqual(self.client.request("DELETE", "/data/clear", json={"confirmation": "CLEAR"}).status_code, 200)
        rules = self.client.get("/rules").json()
        self.assertEqual(len(rules), 1)
        self.assertIsNone(rules[0]["category"])
        self.assertEqual(rules[0]["match_text"], "rent")


if __name__ == "__main__":
    unittest.main()
