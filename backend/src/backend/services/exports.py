"""Read-only monthly exports; all totals come from the same transaction snapshot."""

import csv
from calendar import month_name, monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from io import StringIO

from fastapi import HTTPException
from sqlalchemy import extract, select
from sqlalchemy.orm import Session

from backend.models.category import Category
from backend.models.transaction import Transaction

MAX_EXPORT_ROWS = 10_000
ZERO = Decimal("0.00")


@dataclass(frozen=True)
class ExportTransaction:
    date: date
    merchant: str
    category: str
    bank: str
    type: str
    amount: Decimal


@dataclass(frozen=True)
class CategorySpending:
    name: str
    amount: Decimal
    color: str


@dataclass(frozen=True)
class MonthlyReport:
    year: int
    month: int
    transactions: list[ExportTransaction]
    categories: list[CategorySpending]
    income: Decimal
    expenses: Decimal

    @property
    def period(self) -> str:
        return f"{month_name[self.month]} {self.year}"

    @property
    def net(self) -> Decimal:
        return self.income - self.expenses


def export_years(db: Session) -> list[int]:
    saved = db.scalars(select(extract("year", Transaction.date)).distinct()).all()
    # Include older/future saved dates, plus convenient empty periods to select.
    return sorted({*range(2000, date.today().year + 2), *(int(year) for year in saved)}, reverse=True)


def monthly_report(db: Session, year: int, month: int) -> MonthlyReport:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    rows = db.execute(select(
        Transaction.date, Transaction.merchant, Transaction.category,
        Transaction.bank, Transaction.type, Transaction.amount, Category.color,
    ).join(Category, Category.name == Transaction.category).where(
        Transaction.date >= start, Transaction.date <= end,
    ).order_by(Transaction.date, Transaction.id).limit(MAX_EXPORT_ROWS + 1)).all()
    if len(rows) > MAX_EXPORT_ROWS:
        raise HTTPException(413, "This month exceeds the 10,000-transaction export limit. No partial file was generated.")

    transactions = []
    totals: dict[str, Decimal] = {}
    colors = {}
    income = expenses = ZERO
    for row in rows:
        transactions.append(ExportTransaction(row.date, row.merchant, row.category, row.bank, row.type, row.amount))
        if row.type == "income":
            income += row.amount
        else:
            expenses += row.amount
            totals[row.category] = totals.get(row.category, ZERO) + row.amount
            colors[row.category] = row.color
    categories = [CategorySpending(name, amount, colors[name]) for name, amount in
                  sorted(totals.items(), key=lambda item: (-item[1], item[0]))]
    return MonthlyReport(year, month, transactions, categories, income, expenses)


def spreadsheet_text(value: str) -> str:
    """Quote formula-like text as text; CSV quoting alone does not prevent formulas."""
    if value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")):
        return "'" + value
    return value


def transaction_csv(report: MonthlyReport) -> bytes:
    output = StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(["date", "merchant", "category", "bank", "type", "amount"])
    for row in report.transactions:
        writer.writerow([
            row.date.isoformat(), spreadsheet_text(row.merchant), spreadsheet_text(row.category),
            spreadsheet_text(row.bank), row.type, f"{row.amount:.2f}",
        ])
    # Excel recognizes UTF-8 reliably with a BOM. Direction is explicit, never inferred from a sign.
    return output.getvalue().encode("utf-8-sig")
