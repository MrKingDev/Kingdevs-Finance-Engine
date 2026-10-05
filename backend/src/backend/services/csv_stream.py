"""Bounded-memory CSV processing, sampled previews and atomic bulk insertion."""
from contextlib import contextmanager
import csv
import hashlib
import io
from itertools import islice
import json
from pathlib import Path
import re
import sqlite3
import tempfile

from fastapi import HTTPException
from sqlalchemy import func, insert, select, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from backend.models import Category, Transaction
from backend.schemas.import_csv import MAX_CSV_BYTES, MAX_IMPORT_ROWS, MAX_PREVIEW_ROWS, CSVImportResponse
from backend.services.csv_import import detect_mapping, preview_context, preview_rows

BATCH_SIZE = 1000


@contextmanager
def csv_records(file):
    file.seek(0, 2)
    if file.tell() > MAX_CSV_BYTES:
        raise HTTPException(413, "CSV files must be 50 MB (50,000,000 bytes) or smaller.")
    file.seek(0)
    source = io.TextIOWrapper(file, encoding="utf-8-sig", newline="")
    try:
        line = source.readline(262144)
        if not line.strip() or "\x00" in line:
            raise HTTPException(422, "Upload a nonempty UTF-8 CSV file with a header row.")
        header_line = re.sub(r'"(?:[^"]|"")*"', "", line)
        delimiter = max((",", ";", "\t"), key=header_line.count)
        source.seek(0)
        reader = csv.reader(source, delimiter=delimiter, strict=True)
        headers = [value.strip() for value in next(reader)]
        normalized = [re.sub(r"[^a-z0-9]", "", h.lower()) for h in headers]
        if len(headers) < 2 or len(headers) > 50 or any(not h for h in normalized):
            raise HTTPException(422, "Use a header row with 2–50 nonempty column names.")
        if len(set(normalized)) != len(normalized):
            raise HTTPException(422, "CSV column names must be unique, ignoring spaces and case.")

        def records():
            count = 0
            for values in reader:
                if not any(v.strip() for v in values):
                    continue
                count += 1
                if count > MAX_IMPORT_ROWS:
                    raise HTTPException(413, "Import at most 500,000 data rows per file.")
                if any(len(v) > 4096 or "\x00" in v for v in values):
                    raise HTTPException(422, f"Row {reader.line_num}: cells must be at most 4,096 characters without NUL bytes.")
                yield reader.line_num, values
            if not count:
                raise HTTPException(422, "The CSV has headers but no transaction rows.")
        yield headers, records()
    except UnicodeDecodeError:
        raise HTTPException(422, "Save the file as CSV UTF-8 and upload it again.") from None
    except (csv.Error, StopIteration):
        raise HTTPException(422, "Malformed CSV. Check quoting and export it again as CSV UTF-8.") from None
    finally:
        source.detach()  # The request, not TextIOWrapper, owns the uploaded file.


class DuplicateIndex:
    """Temporary disk index: bounded RAM even for 500,000 unique transactions."""
    def __init__(self, path):
        self.connection = sqlite3.connect(path)
        self.connection.execute("PRAGMA journal_mode=OFF")
        self.connection.execute("PRAGMA cache_size=-2048")
        self.connection.execute("CREATE TABLE seen (key BLOB PRIMARY KEY) WITHOUT ROWID")

    def close(self):
        self.connection.close()

    @staticmethod
    def key(row, bank):
        values = [row.date.isoformat(), row.merchant.strip().lower(), bank.strip().lower(), row.type, f"{row.amount:.2f}"]
        return hashlib.sha256(json.dumps(values, ensure_ascii=False).encode("utf-8")).digest()

    def add(self, row, bank):
        cursor = self.connection.execute("INSERT OR IGNORE INTO seen VALUES (?)", (self.key(row, bank),))
        return cursor.rowcount == 1

    def preload(self, db, bank):
        saved = db.execute(select(Transaction.date, Transaction.merchant, Transaction.type, Transaction.amount).where(
            func.lower(func.trim(Transaction.bank)) == bank.strip().lower(),
        ).execution_options(yield_per=BATCH_SIZE))
        try:
            for batch in saved.partitions(BATCH_SIZE):
                self.connection.executemany("INSERT OR IGNORE INTO seen VALUES (?)", [(self.key(row, bank),) for row in batch])
        finally:
            saved.close()


def process_file(db, file, bank, mapping, amount_mode, date_format, expense_sign=None,
                 type_overrides=None, default_category=None, *, commit=False):
    """Scan every row, return <=1,000 preview rows, insert in batches with ONE final commit."""
    try:
        if commit and db.get_bind().dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(734918520)"))
        context = preview_context(db)
        categories = {c.name: c for c in db.scalars(select(Category))}
        fallback = context[0].get(default_category.strip().lower()) if default_category else None
        if default_category and fallback is None:
            raise HTTPException(422, "Choose a saved fallback category from Settings.")
        with tempfile.TemporaryDirectory(prefix="finance-csv-") as directory, csv_records(file) as (headers, records):
            seen = DuplicateIndex(Path(directory) / "duplicates.sqlite3")
            try:
                seen.preload(db, bank)
                mapping = mapping or detect_mapping(headers)
                result = preview_rows(db, headers, [], bank, mapping, amount_mode, date_format,
                                      expense_sign, type_overrides, context=context, check_duplicates=False)
                imported = skipped = 0
                while batch := list(islice(records, BATCH_SIZE)):
                    normalized = preview_rows(db, headers, batch, bank, mapping, amount_mode, date_format,
                                              expense_sign, type_overrides, context=context, check_duplicates=False)
                    result.total_rows += len(batch)
                    if normalized.errors:
                        if commit:
                            raise HTTPException(422, " ".join(normalized.errors))
                        continue
                    pending = []
                    for row in normalized.rows:
                        if row.category is None:
                            row.category = fallback
                        if not row.errors:
                            result.valid_rows += 1
                        if not row.errors and row.type is not None:
                            row.duplicate = not seen.add(row, bank)
                        issue = None
                        if row.errors:
                            issue = " ".join(row.errors)
                        elif row.duplicate:
                            result.duplicate_rows += 1
                            skipped += 1
                        else:
                            if row.type is None:
                                result.needs_direction = True
                                issue = "Choose the expense sign or add a type rule."
                            elif row.type == "expense":
                                result.expense_rows += 1
                            else:
                                result.income_rows += 1
                            if row.category is None:
                                result.missing_categories += 1
                                issue = issue or "Choose a fallback category or add a category rule."
                        if issue:
                            result.first_issue = result.first_issue or f"Row {row.row_number}: {issue}"
                            if commit:
                                raise HTTPException(422, f"Row {row.row_number}: {issue} No transactions were saved.")
                        if len(result.rows) < MAX_PREVIEW_ROWS and not commit:
                            result.rows.append(row)
                        if commit and not row.duplicate:
                            category = categories[row.category]
                            pending.append(dict(date=row.date, merchant=row.merchant, bank=bank, type=row.type,
                                                amount=row.amount, category=category.name, pie_color=f"var(--{category.color})"))
                    if pending:
                        db.execute(insert(Transaction), pending)
                        imported += len(pending)
                result.bulk_import = result.total_rows > MAX_PREVIEW_ROWS
            finally:
                seen.close()
        if commit:
            db.commit()
            return CSVImportResponse(imported=imported, skipped_duplicates=skipped)
        return result
    except (HTTPException, OperationalError):
        if commit:
            db.rollback()
        raise
    except SQLAlchemyError:
        if commit:
            db.rollback()
        raise HTTPException(500, "CSV import failed. The import was rolled back.") from None
