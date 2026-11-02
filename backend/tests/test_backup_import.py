"""Complete restore, additive merge, validation, atomicity, and durable saves."""

import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql.dml import Insert

from backend.database import Base, database
from backend.main import app
from backend.models import Goal, Transaction


def sample_backup():
    stamp = "2026-11-01T12:00:00+00:00"
    return {
        "format": "kingdevs-finance-engine", "version": 1, "exported_at": stamp,
        "data": {
            "categories": [{"name": "Food", "color": "chart-red-2"}],
            "bank_styles": [{"name": "test bank", "display_name": "Test Bank", "color": "#123456", "hidden": False}],
            "transactions": [{"id": 30, "date": "2026-11-01", "merchant": 'Café "Lunch"\n二', "category": "Food", "bank": "Test Bank", "type": "expense", "amount": "0.10", "pie_color": "var(--chart-red-2)"}],
            "budgets": [{"id": 20, "month": 11, "year": 2026, "category": "Food", "amount": "100.01"}],
            "transaction_rules": [{"id": 80, "match_text": "lunch", "type": "expense", "category": "Food", "enabled": True}],
            "goals": [{"id": 70, "name": "Vacation", "type": "Savings", "target_amount": "9999999999.99", "target_date": None}],
            "goal_entries": [{"id": 40, "goal_id": 70, "type": "contribution", "date": "2026-11-01", "note": "Saved", "amount": "15.25"}],
            "subscriptions": [{"id": 60, "name": "Monthly plan", "amount": "12.34", "billing_cycle": "monthly", "next_due_date": "2026-12-01", "billing_anchor_date": "2026-11-01", "category": "Food", "payment_method_label": "Card", "icon": None, "is_active": False, "created_at": stamp, "updated_at": stamp}],
            "subscription_payments": [{"id": 50, "subscription_id": 60, "due_date": "2026-11-01", "paid_on": "2026-11-01", "amount": "12.34", "created_at": stamp}],
        },
        "browser_data": {"what-to-buy-items": "[]", "what-to-buy-budget": "123.45", "theme": "dark"},
    }


class BackupImportTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="finance-backup-test-")
        self.addCleanup(self.directory.cleanup)
        self.url = "sqlite:///" + str(Path(self.directory.name) / "saved.sqlite")
        self.engine = create_engine(self.url, connect_args={"check_same_thread": False})
        event.listen(self.engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        factory = patch.object(database, "get_session_factory", side_effect=lambda: self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def send(self, backup=None, preview=False, raw=None):
        contents = raw if raw is not None else json.dumps(backup or sample_backup()).encode()
        return self.client.post("/imports/backup" + ("/preview" if preview else ""), files={"file": ("backup.json", contents, "application/json")})

    def export(self):
        response = self.client.get("/exports/backup.json")
        self.assertEqual(response.status_code, 200)
        return response.json()["data"]

    def test_preview_does_not_write_and_roundtrip_restores_every_record_and_link(self):
        preview = self.send(preview=True)
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertEqual(sum(c["new"] for c in preview.json()["counts"].values()), 9)
        self.assertTrue(all(not rows for rows in self.export().values()))
        response = self.send()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["browser_data"]["theme"], "dark")
        saved = self.export()
        for table, rows in sample_backup()["data"].items():
            self.assertEqual(len(saved[table]), len(rows))
        self.assertEqual(saved["transactions"][0]["amount"], "0.10")
        self.assertEqual(saved["transactions"][0]["merchant"], 'Café "Lunch"\n二')
        self.assertEqual(saved["goals"][0]["target_amount"], "9999999999.99")
        self.assertEqual(saved["goal_entries"][0]["goal_id"], saved["goals"][0]["id"])
        self.assertEqual(saved["subscription_payments"][0]["subscription_id"], saved["subscriptions"][0]["id"])
        self.assertFalse(saved["subscriptions"][0]["is_active"])
        self.assertEqual(saved["bank_styles"][0]["color"], "#123456")

    def test_repeated_import_skips_existing_and_retains_legitimate_duplicate_counts(self):
        backup = sample_backup()
        backup["data"]["transactions"].append({**backup["data"]["transactions"][0], "id": 31})
        backup["data"]["goal_entries"].append({**backup["data"]["goal_entries"][0], "id": 41})
        self.assertEqual(self.send(backup).status_code, 200)
        before = self.export()
        repeated = self.send(backup)
        self.assertEqual(repeated.status_code, 200, repeated.text)
        self.assertEqual(sum(c["new"] for c in repeated.json()["counts"].values()), 0)
        self.assertEqual(before, self.export())
        self.assertEqual(len(before["transactions"]), 2)
        self.assertEqual(len(before["goal_entries"]), 2)

    def test_conflicts_preserve_current_values_and_case_insensitive_category_links(self):
        self.assertEqual(self.send().status_code, 200)
        before = self.export()
        changed = sample_backup()
        changed["data"]["categories"][0] = {"name": "FOOD", "color": "chart-blue-2"}
        for table in ("transactions", "budgets", "transaction_rules", "subscriptions"):
            changed["data"][table][0]["category"] = "FOOD"
        changed["data"]["bank_styles"][0]["color"] = "#abcdef"
        changed["data"]["budgets"][0]["amount"] = "999.99"
        changed["data"]["transaction_rules"][0]["enabled"] = False
        changed["data"]["goals"][0]["target_amount"] = "1.00"
        changed["data"]["subscriptions"][0]["next_due_date"] = "2027-01-01"
        changed["data"]["subscription_payments"][0]["amount"] = "50.00"
        result = self.send(changed)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(before, self.export())

    def test_colliding_ids_are_remapped_without_attaching_history_to_unrelated_records(self):
        with self.sessions.begin() as db:
            db.add(Goal(id=70, name="Existing", type="Savings", target_amount=100))
        self.assertEqual(self.send().status_code, 200)
        saved = self.export()
        imported = next(row for row in saved["goals"] if row["name"] == "Vacation")
        self.assertNotEqual(imported["id"], 70)
        self.assertEqual(saved["goal_entries"][0]["goal_id"], imported["id"])

    def test_identical_goals_remain_separate_and_history_is_correct_on_reimport(self):
        backup = sample_backup()
        backup["data"]["goals"].append({**backup["data"]["goals"][0], "id": 71})
        backup["data"]["goal_entries"].append({**backup["data"]["goal_entries"][0], "id": 41, "goal_id": 71, "amount": "9.99"})
        self.assertEqual(self.send(backup).status_code, 200)
        before = self.export()
        self.assertEqual(len(before["goals"]), 2)
        self.assertNotEqual(before["goal_entries"][0]["goal_id"], before["goal_entries"][1]["goal_id"])
        self.assertEqual(self.send(backup).status_code, 200)
        self.assertEqual(before, self.export())

    def test_validation_rejects_whole_file_without_mutating_existing_data(self):
        self.assertEqual(self.send().status_code, 200)
        before = self.export()
        invalid = []
        for change in [
            lambda b: b.update(version=2),
            lambda b: b.update(version=True),
            lambda b: b["data"].pop("goals"),
            lambda b: b["data"]["transactions"][0].update(amount="-1.00"),
            lambda b: b["data"]["transactions"][0].update(amount="NaN"),
            lambda b: b["data"]["transactions"][0].update(amount="1.001"),
            lambda b: b["data"]["transactions"][0].update(category="Missing"),
            lambda b: b["data"]["goal_entries"][0].update(goal_id=999),
            lambda b: b["data"]["subscription_payments"][0].update(subscription_id=999),
            lambda b: b["data"]["transactions"].append(copy.deepcopy(b["data"]["transactions"][0])),
            lambda b: b["data"]["budgets"].append({**b["data"]["budgets"][0], "id": 21}),
            lambda b: b["data"]["subscriptions"][0].update(icon="data:image/svg+xml,<script>"),
            lambda b: b["browser_data"].update({"what-to-buy-items": '{"bad":1}'}),
            lambda b: b["browser_data"].update({"what-to-buy-budget": "NaN"}),
        ]:
            backup = sample_backup()
            change(backup)
            invalid.append(backup)
        for backup in invalid:
            with self.subTest(backup=backup):
                self.assertEqual(self.send(backup).status_code, 422)
                self.assertEqual(before, self.export())
        for raw in (b"not json", b'{"data":{},"data":{}}', b"\xff\xfe"):
            self.assertEqual(self.send(raw=raw).status_code, 422)

    def test_late_database_failure_rolls_back_every_new_record(self):
        original = self.sessions.class_.execute
        def fail(session, statement, *args, **kwargs):
            if isinstance(statement, Insert) and statement.table.name == "subscription_payments":
                raise IntegrityError("forced failure", {}, Exception("test"))
            return original(session, statement, *args, **kwargs)
        with patch.object(self.sessions.class_, "execute", fail):
            response = self.send()
        self.assertEqual(response.status_code, 409, response.text)
        self.assertTrue(all(not rows for rows in self.export().values()))

    def test_oversized_backup_is_rejected(self):
        with patch("backend.services.backup_import.MAX_BACKUP_BYTES", 10):
            self.assertEqual(self.send().status_code, 413)
        self.assertTrue(all(not rows for rows in self.export().values()))

    def test_saved_records_survive_reopening_database_and_clear_stays_cleared(self):
        self.assertEqual(self.send().status_code, 200)
        self.engine.dispose()
        reopened = create_engine(self.url, connect_args={"check_same_thread": False})
        self.addCleanup(reopened.dispose)
        self.sessions = sessionmaker(bind=reopened)
        with self.sessions() as db:
            self.assertEqual(len(db.scalars(select(Transaction)).all()), 1)
        response = self.client.request("DELETE", "/data/clear", json={"confirmation": "CLEAR"})
        self.assertEqual(response.status_code, 200)
        reopened.dispose()
        with self.sessions() as db:
            self.assertEqual(len(db.scalars(select(Transaction)).all()), 0)


if __name__ == "__main__":
    unittest.main()
