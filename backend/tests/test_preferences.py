"""Saved settings, older backup compatibility, regional reports and local days."""
from datetime import datetime, timezone
from io import BytesIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import sessionmaker

from backend.database import Base, database
from backend.main import app
from backend.models import Preferences
from backend.schemas.preferences import PreferencesWrite, TIME_ZONES
from test_backup_import import sample_backup


class PreferencesTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="finance-preferences-")
        self.addCleanup(self.directory.cleanup)
        self.url = "sqlite:///" + str(Path(self.directory.name) / "saved.sqlite")
        self.engine = create_engine(self.url, connect_args={"check_same_thread": False})
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        factory = patch.object(database, "get_session_factory", side_effect=lambda: self.sessions)
        factory.start()
        self.addCleanup(factory.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.german = dict(locale="de-DE", currency="EUR", time_zone="Europe/Berlin")

    def save(self, values):
        result = self.client.put("/preferences", json=values)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json(), values)

    def test_defaults_are_usd_eastern_and_reads_do_not_write(self):
        self.assertEqual(self.client.get("/preferences").json(), PreferencesWrite().model_dump())
        with self.sessions() as db:
            self.assertIsNone(db.get(Preferences, 1))
        options = self.client.get("/preferences/options").json()
        self.assertIn("USD", options["currency"])
        for zone in TIME_ZONES:
            self.assertIsNotNone(ZoneInfo(zone))

    def test_preferences_survive_reconnection_without_changing_financial_data(self):
        backup = sample_backup()
        self.assertEqual(self.client.post("/imports/backup", files={"file": ("backup.json", json.dumps(backup))}).status_code, 200)
        before = self.client.get("/transactions").json()
        self.save(self.german)
        self.engine.dispose()
        self.sessions = sessionmaker(bind=create_engine(self.url, connect_args={"check_same_thread": False}))
        self.addCleanup(self.sessions.kw["bind"].dispose)
        self.assertEqual(self.client.get("/preferences").json(), self.german)
        self.assertEqual(self.client.get("/transactions").json(), before)
        with self.sessions() as db:
            self.assertEqual(len(db.scalars(select(Preferences)).all()), 1)

    def test_invalid_settings_leave_saved_preferences_unchanged(self):
        self.save(self.german)
        for key, value in [("currency", "NOT"), ("locale", "invalid"), ("time_zone", "EST"), ("currency", None), ("unknown", True)]:
            response = self.client.put("/preferences", json={**self.german, key: value})
            self.assertEqual(response.status_code, 422, response.text)
            self.assertEqual(self.client.get("/preferences").json(), self.german)

    def test_backup_restores_preferences_and_merge_keeps_current_settings(self):
        self.save(self.german)
        backup = self.client.get("/exports/backup.json").json()
        self.assertEqual(backup["data"]["preferences"], [{"id": 1, **self.german}])
        with self.sessions() as db:
            db.execute(delete(Preferences))
            db.commit()
        def restore(payload):
            response = self.client.post("/imports/backup", files={"file": ("backup.json", json.dumps(payload))})
            self.assertEqual(response.status_code, 200, response.text)
            return response.json()
        self.assertEqual(restore(backup)["counts"]["preferences"]["new"], 1)
        self.assertEqual(self.client.get("/preferences").json(), self.german)
        self.save(PreferencesWrite().model_dump())
        self.assertEqual(restore(backup)["counts"]["preferences"]["skipped"], 1)
        self.assertEqual(self.client.get("/preferences").json(), PreferencesWrite().model_dump())
        del backup["data"]["preferences"]
        self.assertEqual(restore(backup)["counts"]["preferences"], {"new": 0, "skipped": 0})

    def test_subscription_status_and_future_payment_validation_use_local_day(self):
        instant = datetime(2026, 11, 1, 2, 30, tzinfo=timezone.utc)
        with patch("backend.services.preferences.datetime") as clock:
            clock.now.side_effect = lambda zone: instant.astimezone(zone)
            subscription = self.client.post("/subscriptions", json={"name": "Plan", "amount": "10.00", "billing_cycle": "monthly", "next_due_date": "2026-10-31"}).json()
            self.assertEqual(subscription["next_bill_status"], "due_today")
            overview = self.client.get("/subscriptions/overview").json()
            self.assertEqual(overview["summary"]["as_of_date"], "2026-10-31")
            response = self.client.post(f"/subscriptions/{subscription['id']}/payments", json={"due_date": "2026-10-31", "paid_on": "2026-11-01", "amount": "10.00"})
            self.assertEqual(response.status_code, 422)
            self.save(self.german)
            overview = self.client.get("/subscriptions/overview").json()
            self.assertEqual(overview["summary"]["as_of_date"], "2026-11-01")
            self.assertEqual(overview["summary"]["currency"], "EUR")
            self.assertEqual(overview["items"][0]["currency"], "EUR")
            self.assertEqual(overview["items"][0]["next_bill_status"], "overdue")

    def test_pdf_uses_saved_currency_and_region(self):
        self.client.post("/imports/backup", files={"file": ("backup.json", json.dumps(sample_backup()))}).raise_for_status()
        self.save(self.german)
        for style in ("styled", "basic"):
            response = self.client.get(f"/exports/report.pdf?month=11&year=2026&style={style}")
            self.assertEqual(response.status_code, 200)
            text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)
            self.assertIn("Currency: EUR", text)
            self.assertIn("0,10", text)
            self.assertIn("€", text)
            self.assertNotIn("$", text)
