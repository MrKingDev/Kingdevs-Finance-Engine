"""Bounded CSV preview and atomic import using the existing financial tables."""

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.models import Category, Transaction, TransactionRule
from backend.schemas.import_csv import (
    MAX_CSV_BYTES, MAX_IMPORT_ROWS, AmountMode, CSVColumnMapping,
    CSVImportRequest, CSVImportResponse, CSVPreviewResponse, CSVPreviewRow, DateFormat,
    ExpenseSign, TransactionType,
)
from backend.schemas.transaction import TransactionCreate


HEADER_ALIASES = {
    "date": ("transactiondate", "date", "postingdate", "posteddate", "postdate"),
    "merchant": ("merchant", "description", "payee", "transactiondescription", "originaldescription", "details"),
    "amount": ("amount", "transactionamount"),
    "debit": ("debit", "debits", "withdrawal", "withdrawals", "withdrawalamount", "debitamount"),
    "credit": ("credit", "credits", "deposit", "deposits", "depositamount", "creditamount"),
    "type": ("type", "transactiontype", "debitcredit", "creditdebit", "drcr", "crdr"),
    "category": ("category", "transactioncategory"),
}

# Only explicit direction labels, never merchant-name guesses. "Payment" is
# intentionally absent: its direction depends on the account/export.
TYPE_LABELS = {
    "income": "income", "credit": "income", "cr": "income", "crdt": "income",
    "deposit": "income", "direct deposit": "income",
    "expense": "expense", "debit": "expense", "dr": "expense", "dbit": "expense",
    "withdrawal": "expense", "purchase": "expense", "sale": "expense",
}


def read_csv(contents: bytes) -> tuple[list[str], list[tuple[int, list[str]]]]:
    if len(contents) > MAX_CSV_BYTES:
        raise HTTPException(413, "CSV files must be 50 MB (50,000,000 bytes) or smaller.")
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "Save the file as CSV UTF-8 and upload it again.") from None
    if not decoded.strip() or "\x00" in decoded:
        raise HTTPException(422, "Upload a nonempty UTF-8 CSV file with a header row.")
    try:
        # Restrict detection to supported delimiters. A malformed file must not
        # make the sniffer reinterpret part of a quoted value as a separator.
        header_line = re.sub(r'"(?:[^"]|"")*"', "", decoded.splitlines()[0])
        delimiter = max((",", ";", "\t"), key=header_line.count)
        reader = csv.reader(io.StringIO(decoded, newline=""), delimiter=delimiter, strict=True)
        headers = [value.strip() for value in next(reader)]
        normalized = [re.sub(r"[^a-z0-9]", "", name.lower()) for name in headers]
        if len(headers) < 2 or len(headers) > 50 or any(not name for name in normalized):
            raise HTTPException(422, "Use a header row with 2–50 nonempty column names.")
        if len(set(normalized)) != len(normalized):
            raise HTTPException(422, "CSV column names must be unique, ignoring spaces and case.")
        rows = []
        for values in reader:
            if not any(value.strip() for value in values):
                continue
            rows.append((reader.line_num, values))
            if len(rows) > MAX_IMPORT_ROWS:
                raise HTTPException(413, "Import at most 500,000 data rows per file.")
            if any(len(value) > 4096 for value in values):
                raise HTTPException(422, f"Row {reader.line_num}: a cell exceeds 4,096 characters.")
    except (csv.Error, StopIteration):
        raise HTTPException(422, "Malformed CSV. Check quoting and export it again as CSV UTF-8.") from None
    if not rows:
        raise HTTPException(422, "The CSV has headers but no transaction rows.")
    return headers, rows


def detect_mapping(headers: list[str]) -> CSVColumnMapping:
    normalized = {re.sub(r"[^a-z0-9]", "", name.lower()): name for name in headers}
    return CSVColumnMapping(**{
        field: next((normalized[alias] for alias in aliases if alias in normalized), None)
        for field, aliases in HEADER_ALIASES.items()
    })


def parse_date(value: str, date_format: DateFormat) -> date:
    patterns = ["%Y-%m-%d"]
    if date_format == "mdy":
        patterns += ["%m/%d/%Y", "%m-%d-%Y"]
    elif date_format == "dmy":
        patterns += ["%d/%m/%Y", "%d-%m-%Y"]
    for pattern in patterns:
        try:
            return datetime.strptime(value.strip(), pattern).date()
        except ValueError:
            pass
    raise ValueError("Date does not match the selected format (use a four-digit year).")


def parse_amount(value: str) -> Decimal:
    value = value.strip()
    negative_parentheses = value.startswith("(") and value.endswith(")")
    if negative_parentheses:
        value = value[1:-1].strip()
    # US decimal notation only. Validate before removing the currency prefix
    # so a malformed amount such as 1$2 cannot silently become 12.
    if not re.fullmatch(r"(?:[+-]?\$?|\$[+-]?)(?:(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]{1,2})?|\.[0-9]{1,2})", value):
        raise ValueError("Amount must use a decimal point and at most two decimal places.")
    try:
        amount = Decimal(value.replace("$", "").replace(",", ""))
    except InvalidOperation:
        raise ValueError("Invalid amount.") from None
    if negative_parentheses:
        if amount < 0:
            raise ValueError("Use a minus sign or parentheses for a negative amount, not both.")
        amount = -amount
    if not amount.is_finite() or abs(amount) >= Decimal("10000000000"):
        raise ValueError("Amount is outside the supported range.")
    return amount


def transaction_key(row, bank: str) -> tuple:
    return (row.date, row.merchant.strip().lower(), bank.strip().lower(), row.type, row.amount)


def existing_keys(db: Session, bank: str, rows: list) -> set[tuple]:
    if not rows:
        return set()
    dates = [row.date for row in rows]
    saved = db.execute(select(
        Transaction.date, Transaction.merchant, Transaction.bank, Transaction.type, Transaction.amount,
    ).where(
        func.lower(func.trim(Transaction.bank)) == bank.strip().lower(),
        Transaction.date >= min(dates), Transaction.date <= max(dates),
    ))
    return {transaction_key(row, row.bank) for row in saved}


def preview_context(db: Session):
    categories = {category.name.lower(): category.name for category in db.scalars(select(Category))}
    rules = [(rule, re.compile(r"(?<!\w)" + re.escape(rule.match_text) + r"(?!\w)", re.IGNORECASE))
             for rule in db.scalars(select(TransactionRule).where(TransactionRule.enabled.is_(True))
                                    .order_by(func.length(TransactionRule.match_text).desc(), TransactionRule.id))]
    return categories, rules


def preview_csv(db: Session, contents: bytes, bank: str, mapping: CSVColumnMapping | None,
                amount_mode: AmountMode, date_format: DateFormat,
                expense_sign: ExpenseSign | None = None,
                type_overrides: dict[int, TransactionType] | None = None) -> CSVPreviewResponse:
    headers, raw_rows = read_csv(contents)
    return preview_rows(db, headers, raw_rows, bank, mapping, amount_mode, date_format,
                        expense_sign, type_overrides)


def preview_rows(db: Session, headers: list[str], raw_rows: list, bank: str,
                 mapping: CSVColumnMapping | None, amount_mode: AmountMode, date_format: DateFormat,
                 expense_sign: ExpenseSign | None = None, type_overrides: dict | None = None,
                 *, context=None, check_duplicates=True) -> CSVPreviewResponse:
    mapping = mapping if mapping is not None else detect_mapping(headers)
    mapped = mapping.model_dump()
    type_overrides = type_overrides or {}
    # In auto mode explicit debit/credit columns take precedence over a net
    # Amount column. A single Amount's sign alone does not identify direction.
    effective_mode = "debit_credit" if amount_mode == "auto" and mapped["debit"] and mapped["credit"] else amount_mode
    required = ["date", "merchant"] + (
        ["debit", "credit"] if effective_mode == "debit_credit" else
        ["amount", "type"] if effective_mode == "type_column" else ["amount"]
    )
    errors = [f"Choose a column for {field}." for field in required if not mapped[field]]
    errors += [f"Unknown column: {column}." for column in mapped.values() if column and column not in headers]
    active_columns = [mapped[field] for field in required + ["category"] if mapped[field]]
    if effective_mode == "auto" and mapped["type"]:
        active_columns.append(mapped["type"])
    if len(set(active_columns)) != len(active_columns):
        errors.append("Each transaction field must use a different CSV column.")
    result = CSVPreviewResponse(bank=bank, columns=headers, mapping=mapping, amount_mode=amount_mode,
                                date_format=date_format, rows=[], errors=errors, total_rows=len(raw_rows))
    if errors:
        return result
    categories, rules = context if context is not None else preview_context(db)
    for row_number, cells in raw_rows:
        row = CSVPreviewRow(row_number=row_number)
        if len(cells) != len(headers):
            row.errors.append("Row has a different number of cells than the header.")
            result.rows.append(row)
            continue
        values = dict(zip(headers, (cell.strip() for cell in cells)))
        def get(field: str) -> str:
            return values.get(mapped[field], "")
        row.merchant = get("merchant")
        row.source_category = get("category")
        row.source_amount = get("amount")
        row.source_type = get("type")
        row.category = categories.get(row.source_category.lower())
        matched_rule = next((rule for rule, pattern in rules if pattern.search(" ".join(row.merchant.split()))), None)
        if matched_rule:
            if row.category is None and matched_rule.category is not None:
                row.category = matched_rule.category
                row.matched_rule = matched_rule.match_text
        try:
            row.date = parse_date(get("date"), date_format)
        except ValueError as error:
            row.errors.append(str(error))
        try:
            if effective_mode == "debit_credit":
                debit = parse_amount(get("debit")) if get("debit") else Decimal(0)
                credit = parse_amount(get("credit")) if get("credit") else Decimal(0)
                if debit < 0 or credit < 0 or bool(debit) == bool(credit):
                    raise ValueError("Use exactly one positive debit or credit per row.")
                row.type, row.amount = ("expense", debit) if debit else ("income", credit)
            else:
                signed = parse_amount(get("amount"))
                row.amount = abs(signed)
                if effective_mode in ("auto", "type_column"):
                    row.type = TYPE_LABELS.get(" ".join(row.source_type.lower().split()))
                    if row.type is None and effective_mode == "auto" and matched_rule:
                        row.type = matched_rule.type
                        row.matched_rule = matched_rule.match_text
                    if row.type is None and effective_mode == "type_column" and row_number not in type_overrides:
                        raise ValueError("Type must be income/credit or expense/debit.")
                    if row.type is None and expense_sign is not None:
                        is_expense = signed > 0 if expense_sign == "positive" else signed < 0
                        row.type = "expense" if is_expense else "income"
                else:
                    is_expense = signed < 0 if effective_mode == "signed" else signed > 0
                    row.type = "expense" if is_expense else "income"
            if row.amount == 0:
                raise ValueError("Amount must be greater than zero.")
        except ValueError as error:
            row.errors.append(str(error))
        if row_number in type_overrides:
            row.type = type_overrides[row_number]
        if not row.errors:
            try:
                # A missing direction is a review decision, not a malformed
                # amount/date. Use a placeholder ONLY to validate other fields;
                # keep row.type null so the UI cannot silently import it.
                TransactionCreate(date=row.date, merchant=row.merchant, amount=row.amount,
                                  type=row.type or "expense", category=row.category or "Unassigned", bank=bank)
            except ValidationError as error:
                row.errors.extend(f"{item['loc'][0]}: {item['msg']}" for item in error.errors())
        result.rows.append(row)
    valid_rows = [row for row in result.rows if not row.errors]
    result.valid_rows = len(valid_rows)
    result.needs_direction = any(row.type is None for row in valid_rows)
    if not check_duplicates:
        return result
    typed_rows = [row for row in valid_rows if row.type is not None]
    seen = existing_keys(db, bank, typed_rows)
    for row in typed_rows:
        key = transaction_key(row, bank)
        row.duplicate = key in seen
        seen.add(key)
    result.valid_rows = len(valid_rows)
    result.duplicate_rows = sum(row.duplicate for row in valid_rows)
    result.needs_direction = any(row.type is None for row in valid_rows)
    return result


def import_csv_rows(db: Session, request: CSVImportRequest) -> CSVImportResponse:
    try:
        # Serialize CSV commits for this local single-user database. Check for
        # duplicates after obtaining the lock, including simultaneous retries.
        if db.get_bind().dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(734918520)"))
        categories = {category.name.lower(): category for category in db.scalars(select(Category))}
        for row in request.rows:
            if row.category.lower() not in categories:
                raise HTTPException(422, f"Row {row.row_number}: choose a saved category from Settings.")
        seen = existing_keys(db, request.bank, request.rows)
        imported = skipped = 0
        for row in request.rows:
            key = transaction_key(row, request.bank)
            if key in seen:
                skipped += 1
                continue
            seen.add(key)
            category = categories[row.category.lower()]
            db.add(Transaction(date=row.date, merchant=row.merchant, bank=request.bank, type=row.type,
                               amount=row.amount, category=category.name, pie_color=f"var(--{category.color})"))
            imported += 1
        db.commit()
        return CSVImportResponse(imported=imported, skipped_duplicates=skipped)
    except (HTTPException, OperationalError):
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(500, "CSV import failed. The import was rolled back.") from None
