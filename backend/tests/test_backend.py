"""Backend regressions; all database writes stay in disposable SQLite memory."""

from datetime import date
from decimal import Decimal
from io import StringIO
from pathlib import Path
import unittest
from unittest.mock import patch

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.util import CommandError
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.database import database
from backend.database.base import Base as ModelBase
from backend.main import app
from backend.models import Budget, Category, Transaction


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def migration_config():
    return Config(str(BACKEND_ROOT / "alembic.ini"))


class ConfigurationTests(unittest.TestCase):
    def test_models_share_one_registry(self):
        self.assertIs(Base, ModelBase)
        self.assertIs(Budget.metadata, Transaction.metadata)
        self.assertEqual(set(Base.metadata.tables), {"budgets", "categories", "transactions"})

    def test_missing_database_does_not_break_public_routes(self):
        with patch.object(database.os, "environ", {"DATABASE_URL": ""}):
            with TestClient(app) as client:
                self.assertEqual(client.get("/health").json(), {"status": "Ok"})
                self.assertEqual(client.get("/transactions").status_code, 503)
                schema = client.get("/openapi.json")
                self.assertEqual(schema.status_code, 200)
                self.assertIn("/budgets", schema.json()["paths"])
                self.assertEqual(client.get("/docs").status_code, 200)
                response = client.get("/budgets")
                self.assertEqual(response.status_code, 503)
                self.assertIn("Database is not configured", response.json()["detail"])

    def test_environment_overrides_env_file_and_normalizes_driver(self):
        with patch.object(database.os, "environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            with patch.object(database, "dotenv_values") as env_file:
                url = database.get_database_url()
                self.assertEqual(url.drivername, "postgresql+psycopg")
                self.assertEqual(url.database, "test")
                env_file.assert_not_called()

    def test_env_file_is_resolved_relative_to_backend(self):
        with patch.object(database.os, "environ", {}):
            with patch.object(database, "dotenv_values", return_value={
                "DATABASE_URL": "postgresql+psycopg://localhost/test"
            }) as env_file:
                self.assertEqual(database.get_database_url().database, "test")
                env_file.assert_called_once_with(BACKEND_ROOT / ".env")

    def test_invalid_configuration_never_echoes_credentials(self):
        for url in ("", "private-secret", "postgresql://localhost", "sqlite:///private-secret"):
            with self.subTest(url=url):
                with patch.object(database.os, "environ", {"DATABASE_URL": url}):
                    with self.assertRaises(database.DatabaseConfigurationError) as error:
                        database.get_database_url()
                    self.assertNotIn("private-secret", str(error.exception))

    def test_database_failure_is_safe_503(self):
        class BrokenSession:
            def __enter__(self):
                raise OperationalError("SELECT", {}, Exception("private-secret"))

            def __exit__(self, *args):
                pass

        with patch.object(database, "get_session_factory", return_value=BrokenSession):
            with TestClient(app) as client:
                response = client.get("/budgets")
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json(), {"detail": "Database is unavailable."})

    def test_alembic_reports_missing_configuration(self):
        with patch.object(database.os, "environ", {"DATABASE_URL": ""}):
            with self.assertRaisesRegex(CommandError, "DATABASE_URL is not configured"):
                command.current(migration_config())

    def test_postgres_migration_can_render_without_connecting(self):
        config = migration_config()
        config.output_buffer = StringIO()
        with patch.object(database.os, "environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            command.upgrade(config, "head", sql=True)
        sql = config.output_buffer.getvalue()
        self.assertIn("CREATE TABLE budgets", sql)
        self.assertIn("CREATE TABLE transactions", sql)
        self.assertIn("NUMERIC(12, 2)", sql)


class BudgetTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.addCleanup(self.engine.dispose)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")
        with self.engine.begin() as connection:
            config = migration_config()
            config.attributes["connection"] = connection
            command.upgrade(config, "head")

        self.sessions = sessionmaker(bind=self.engine)
        # Exercise the real session dependency using a test-only session factory.
        factory_patch = patch.object(database, "get_session_factory", return_value=self.sessions)
        factory_patch.start()
        self.addCleanup(factory_patch.stop)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def create_budget(self, **overrides):
        data = {"month": 2, "year": 2024, "amount": "100.00"}
        data.update(overrides)
        return self.client.post("/budgets", json=data)

    def test_migration_matches_models_and_can_roll_back(self):
        with self.engine.begin() as connection:
            context = MigrationContext.configure(connection)
            self.assertEqual(compare_metadata(context, Base.metadata), [])
            config = migration_config()
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            tables = inspect(connection).get_table_names()
            self.assertNotIn("budgets", tables)
            self.assertNotIn("transactions", tables)

    def test_create_read_update_delete(self):
        response = self.create_budget()
        self.assertEqual(response.status_code, 201)
        budget_id = response.json()["id"]
        self.assertEqual(response.json()["budget"], "100.00")
        self.assertEqual(Decimal(response.json()["spent"]), Decimal("0"))
        self.assertEqual(len(self.client.get("/budgets").json()), 1)
        self.assertEqual(self.client.get(f"/budgets/{budget_id}").status_code, 200)
        updated = self.client.put(f"/budgets/{budget_id}", json={"amount": "150.00"})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["budget"], "150.00")
        self.assertEqual(updated.json()["month"], 2)
        self.assertEqual(self.client.delete(f"/budgets/{budget_id}").status_code, 204)
        self.assertEqual(self.client.get(f"/budgets/{budget_id}").status_code, 404)

    def test_duplicate_month_is_409_and_next_request_succeeds(self):
        self.assertEqual(self.create_budget().status_code, 201)
        self.assertEqual(self.create_budget().status_code, 409)
        self.assertEqual(self.create_budget(month=3).status_code, 201)

    def test_update_conflict_rolls_back(self):
        self.create_budget()
        second_id = self.create_budget(month=3).json()["id"]
        response = self.client.put(f"/budgets/{second_id}", json={"month": 2})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.client.get(f"/budgets/{second_id}").json()["month"], 3)

    def test_invalid_amount_and_period_are_rejected(self):
        for data in ({"amount": "0"}, {"amount": "-1"}, {"amount": "1.001"},
                     {"amount": "10000000000.00"}, {"month": 13}, {"year": 1999}):
            with self.subTest(data=data):
                self.assertEqual(self.create_budget(**data).status_code, 422)
        self.assertEqual(self.client.get("/budgets").json(), [])

    def test_explicit_null_updates_are_422_and_do_not_modify_budget(self):
        budget_id = self.create_budget().json()["id"]
        for field in ("month", "year", "amount"):
            with self.subTest(field=field):
                response = self.client.put(f"/budgets/{budget_id}", json={field: None})
                self.assertEqual(response.status_code, 422)
        budget = self.client.get(f"/budgets/{budget_id}").json()
        self.assertEqual(budget["budget"], "100.00")
        self.assertEqual(budget["month"], 2)
        self.assertEqual(budget["year"], 2024)

    def test_spending_counts_only_expenses_including_leap_day(self):
        with self.sessions() as session:
            session.add(Category(name="Test"))
            session.flush()
            for transaction_date, kind, amount in (
                (date(2024, 2, 1), "expense", "10.10"),
                (date(2024, 2, 29), "expense", "20.20"),
                (date(2024, 2, 10), "income", "1000.00"),
                (date(2024, 1, 31), "expense", "90.00"),
                (date(2024, 3, 1), "expense", "80.00"),
                (date(2025, 2, 1), "expense", "70.00"),
            ):
                session.add(Transaction(
                    date=transaction_date, merchant="Test", category="Test", bank="Test",
                    type=kind, amount=Decimal(amount),
                ))
            session.commit()
        response = self.create_budget()
        self.assertEqual(response.status_code, 201)
        budget = response.json()
        self.assertEqual(budget["spent"], "30.30")
        self.assertEqual(budget["remaining"], "69.70")
        self.assertAlmostEqual(budget["usage_percentage"], 30.3)

    def test_overspending_keeps_negative_remaining(self):
        with self.sessions() as session:
            session.add(Category(name="Test"))
            session.flush()
            session.add(Transaction(
                date=date(2024, 2, 1), merchant="Test", category="Test", bank="Test",
                type="expense", amount=Decimal("125.00"),
            ))
            session.commit()
        budget = self.create_budget().json()
        self.assertEqual(budget["remaining"], "-25.00")
        self.assertEqual(budget["usage_percentage"], 125.0)

    def test_missing_budget_is_404(self):
        self.assertEqual(self.client.get("/budgets/999").status_code, 404)
        self.assertEqual(self.client.put("/budgets/999", json={"amount": "50"}).status_code, 404)
        self.assertEqual(self.client.delete("/budgets/999").status_code, 404)

    def create_transaction(self, **overrides):
        data = {"date": "2024-02-15", "merchant": "Test store", "bank": "Test account",
                "category": "Groceries", "type": "expense", "amount": "25.50"}
        data.update(overrides)
        return self.client.post("/transactions", json=data)

    def test_category_budget_counts_only_matching_month_and_expenses(self):
        groceries = self.create_budget(category="Groceries", amount="400").json()
        dining = self.create_budget(category="Dining").json()
        overall = self.create_budget(amount="1000").json()
        self.assertEqual(self.create_transaction().status_code, 201)
        self.create_transaction(category="Dining", amount="10.25")
        self.create_transaction(type="income", amount="2000")
        self.create_transaction(date="2024-03-01", amount="90")
        self.assertEqual(self.client.get(f"/budgets/{groceries['id']}").json()["spent"], "25.50")
        self.assertEqual(self.client.get(f"/budgets/{dining['id']}").json()["spent"], "10.25")
        self.assertEqual(self.client.get(f"/budgets/{overall['id']}").json()["spent"], "35.75")

    def test_category_names_are_shared_and_case_insensitive(self):
        self.assertEqual(self.create_budget(category="  Groceries  ").status_code, 201)
        transaction = self.create_transaction(category="groceries").json()
        self.assertEqual(transaction["category"], "Groceries")
        self.assertEqual(self.client.get("/categories").json(), [{"name": "Groceries"}])
        self.assertEqual(self.create_budget(category=" GROCERIES ").status_code, 409)
        self.assertEqual(self.create_budget(category="Dining").status_code, 201)
        self.assertEqual(self.create_budget(category="Groceries", month=3).status_code, 201)

    def test_expenses_before_budget_creation_count_immediately(self):
        self.create_transaction(amount="10.10")
        budget = self.create_budget(category="Groceries").json()
        self.assertEqual(budget["spent"], "10.10")
        self.assertEqual(budget["remaining"], "89.90")

    def test_transaction_update_and_delete_recalculate_budgets(self):
        groceries = self.create_budget(category="Groceries").json()
        dining = self.create_budget(category="Dining").json()
        transaction = self.create_transaction().json()
        endpoint = f"/transactions/{transaction['id']}"
        self.assertEqual(self.client.get(endpoint).json()["amount"], "25.50")
        changed = self.client.patch(endpoint, json={"category": "Dining", "amount": "30.25"})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(Decimal(self.client.get(f"/budgets/{groceries['id']}").json()["spent"]), 0)
        self.assertEqual(self.client.get(f"/budgets/{dining['id']}").json()["spent"], "30.25")
        self.assertEqual(self.client.delete(endpoint).status_code, 204)
        self.assertEqual(self.client.get(endpoint).status_code, 404)
        self.assertEqual(Decimal(self.client.get(f"/budgets/{dining['id']}").json()["spent"]), 0)

    def test_transaction_date_and_type_updates_change_spending(self):
        budget_id = self.create_budget(category="Groceries").json()["id"]
        transaction_id = self.create_transaction().json()["id"]
        endpoint = f"/transactions/{transaction_id}"
        self.client.patch(endpoint, json={"date": "2024-03-01"})
        self.assertEqual(Decimal(self.client.get(f"/budgets/{budget_id}").json()["spent"]), 0)
        self.client.patch(endpoint, json={"date": "2024-02-29", "type": "income"})
        self.assertEqual(Decimal(self.client.get(f"/budgets/{budget_id}").json()["spent"]), 0)
        self.client.patch(endpoint, json={"type": "expense"})
        self.assertEqual(self.client.get(f"/budgets/{budget_id}").json()["spent"], "25.50")

    def test_budget_category_updates_and_conflicts(self):
        first = self.create_budget(category="Groceries").json()["id"]
        second = self.create_budget(category="Dining").json()["id"]
        self.assertEqual(self.client.put(f"/budgets/{second}", json={"category": "groceries"}).status_code, 409)
        self.assertEqual(self.client.get(f"/budgets/{second}").json()["category"], "Dining")
        self.assertEqual(self.client.put(f"/budgets/{first}", json={"category": None}).status_code, 200)
        self.assertIsNone(self.client.get(f"/budgets/{first}").json()["category"])
        self.assertEqual(self.create_budget().status_code, 409)

    def test_invalid_categories_and_null_transaction_updates(self):
        for category in ("", "   ", "a" * 101):
            self.assertEqual(self.create_budget(category=category).status_code, 422)
            self.assertEqual(self.create_transaction(category=category).status_code, 422)
        transaction_id = self.create_transaction().json()["id"]
        self.assertEqual(self.client.patch(f"/transactions/{transaction_id}", json={"category": None}).status_code, 422)

    def test_budget_list_filters_period(self):
        self.create_budget(category="Groceries")
        self.create_budget(category="Dining", month=3)
        self.create_budget(category="Groceries", year=2025)
        result = self.client.get("/budgets?month=2&year=2024")
        self.assertEqual(len(result.json()), 1)
        self.assertEqual(result.json()[0]["category"], "Groceries")
        self.assertEqual(self.client.get("/budgets?month=13").status_code, 422)

    def test_category_reference_is_enforced_by_database(self):
        with self.sessions() as session:
            session.add(Budget(month=2, year=2024, amount=Decimal("100"), category="Missing"))
            with self.assertRaises(IntegrityError):
                session.commit()
            session.rollback()

    def test_downgrade_refuses_to_discard_multiple_category_budgets(self):
        self.create_budget(category="Groceries")
        self.create_budget(category="Dining")
        with self.engine.begin() as connection:
            config = migration_config()
            config.attributes["connection"] = connection
            with self.assertRaisesRegex(CommandError, "multiple category budgets"):
                command.downgrade(config, "0001")
        self.assertEqual(len(self.client.get("/budgets").json()), 2)


class MigrationPreservationTests(unittest.TestCase):
    def test_existing_budget_and_transactions_survive_category_migration(self):
        engine = create_engine("sqlite://")
        self.addCleanup(engine.dispose)
        with engine.begin() as connection:
            config = migration_config()
            config.attributes["connection"] = connection
            command.upgrade(config, "0001")
            connection.execute(text("INSERT INTO budgets (id, month, year, amount) VALUES (42, 2, 2024, 500)"))
            for category in (" Groceries ", "groceries"):
                connection.execute(text("INSERT INTO transactions (date, merchant, category, bank, type, amount, pie_color) VALUES ('2024-02-01', 'Test', :category, 'Test', 'expense', 10, 'blue')"), {"category": category})
            command.upgrade(config, "head")
            row = connection.execute(text("SELECT id, amount, category FROM budgets")).one()
            self.assertEqual(tuple(row), (42, 500, None))
            self.assertEqual(connection.scalar(text("SELECT count(*) FROM transactions")), 2)
            self.assertEqual(connection.scalar(text("SELECT count(*) FROM categories")), 1)
            self.assertEqual(connection.scalar(text("SELECT count(DISTINCT category) FROM transactions")), 1)


if __name__ == "__main__":
    unittest.main()
