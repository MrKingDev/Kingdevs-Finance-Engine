"""Exercise the real 500,000-row / 50 MB boundary on the isolated verification stack.

Only targets ports 13001/15433. Generates fictional rows, then deletes exactly
its own bank/category fixtures. Never uses backend/.env or the normal database.
"""
from pathlib import Path
import tempfile
import time
from uuid import uuid4

import httpx
from sqlalchemy import create_engine, delete

from backend.models import Category, Transaction

BASE = "http://127.0.0.1:13001/api"
bank = "CSV scale " + uuid4().hex
category = "CSV scale " + uuid4().hex
engine = create_engine("postgresql+psycopg://finance_user:finance_verify_local@127.0.0.1:15433/finance_engine")
try:
    with tempfile.TemporaryDirectory(prefix="finance-scale-") as directory, httpx.Client(timeout=600) as client:
        client.get(BASE + "/health/ready").raise_for_status()
        client.post(BASE + "/categories", json={"name": category, "color": "chart-blue-2"}).raise_for_status()
        path = Path(directory) / "scale.csv"
        with path.open("wb") as file:
            file.write(b"date,merchant,type,amount\n")
            for index in range(500_000):
                file.write(f"2026-10-01,Scale merchant {index:06},expense,1.00\n".encode())
            # Fill with blank records to test the exact byte ceiling without adding data rows.
            remaining = 50_000_000 - file.tell()
            while remaining:
                size = min(4096, remaining)
                file.write(b" " * (size - 1) + b"\n")
                remaining -= size
        assert path.stat().st_size == 50_000_000

        def upload(action):
            with path.open("rb") as file:
                started = time.perf_counter()
                response = client.post(BASE + "/imports/csv/" + action,
                                       data={"bank": bank, "default_category": category},
                                       files={"file": ("scale.csv", file, "text/csv")})
                response.raise_for_status()
                print(action, f"{time.perf_counter() - started:.1f}s", flush=True)
                return response.json()

        preview = upload("preview")
        assert preview["total_rows"] == 500_000 and preview["valid_rows"] == 500_000
        assert len(preview["rows"]) == 1000 and preview["expense_rows"] == 500_000
        assert preview["missing_categories"] == 0 and not preview["needs_direction"]
        imported = upload("file")
        assert imported == {"imported": 500_000, "skipped_duplicates": 0}, imported
        page = client.get(BASE + "/transactions/page", params={"bank": bank, "page": 10000}).json()
        assert page["total"] == 500_000 and len(page["items"]) == 50 and page["pages"] == 10000
        retry = upload("file")
        assert retry == {"imported": 0, "skipped_duplicates": 500_000}, retry
        with path.open("ab") as file:
            file.write(b"\n")
        with path.open("rb") as file:
            assert client.post(BASE + "/imports/csv/preview", data={"bank": bank},
                               files={"file": ("scale.csv", file, "text/csv")}).status_code == 413
        print("Passed: 500,000 unique rows, exact 50 MB through Next proxy, sampled preview, PostgreSQL commit, duplicate retry, 10,000 pages, and oversize rejection.")
finally:
    with engine.begin() as connection:
        connection.execute(delete(Transaction).where(Transaction.bank == bank))
        connection.execute(delete(Category).where(Category.name == category))
    engine.dispose()
