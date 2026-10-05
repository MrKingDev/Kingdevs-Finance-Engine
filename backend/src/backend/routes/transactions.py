from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.transaction import Transaction
from backend.models.category import Category
from backend.schemas.transaction import TransactionCreate, TransactionPage, TransactionRead, TransactionUpdate
from backend.services.categories import resolve_category

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def find_transaction(db: Session, transaction_id: int) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return transaction


@router.get("", response_model=list[TransactionRead])
def list_transactions(db: Session = Depends(get_db)):
    return db.scalars(select(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc())).all()


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    values = data.model_dump()
    values["category"] = resolve_category(db, values["category"])
    values["pie_color"] = f"var(--{db.get(Category, values['category']).color})"
    transaction = Transaction(**values)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/banks", response_model=list[str])
def bank_names(db: Session = Depends(get_db)):
    return db.scalars(select(Transaction.bank).distinct().order_by(Transaction.bank)).all()


@router.get("/page", response_model=TransactionPage)
def transaction_page(
    page: int = Query(1, ge=1), search: str = Query("", max_length=255),
    type: Literal["income", "expense"] | None = None,
    category: str | None = Query(None, max_length=100), bank: str | None = Query(None, max_length=100),
    start_date: date | None = None, end_date: date | None = None,
    min_amount: Decimal | None = Query(None, ge=0), max_amount: Decimal | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    """Stable newest-first ordering; apply every filter before counting and selecting 50 rows."""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422, "Start date must be on or before end date.")
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise HTTPException(422, "Minimum amount must be no greater than maximum amount.")
    filters = []
    if search:
        filters.append(or_(*(func.lower(column).contains(search.lower(), autoescape=True)
                             for column in (Transaction.merchant, Transaction.category, Transaction.bank))))
    for column, value in [(Transaction.type, type), (Transaction.category, category), (Transaction.bank, bank)]:
        if value is not None:
            filters.append(column == value)
    for condition, value in [(Transaction.date >= start_date if start_date else None, start_date),
                             (Transaction.date <= end_date if end_date else None, end_date)]:
        if value is not None:
            filters.append(condition)
    if min_amount is not None:
        filters.append(Transaction.amount >= min_amount)
    if max_amount is not None:
        filters.append(Transaction.amount <= max_amount)
    total = db.scalar(select(func.count()).select_from(Transaction).where(*filters))
    overall = db.scalar(select(func.count()).select_from(Transaction)) if filters else total
    pages = max(1, (total + 49) // 50)
    current = min(page, pages)
    items = db.scalars(select(Transaction).where(*filters).order_by(Transaction.date.desc(), Transaction.id.desc())
                       .offset((current - 1) * 50).limit(50)).all()
    return TransactionPage(items=items, total=total, overall_total=overall, page=current, pages=pages)


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    return find_transaction(db, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(transaction_id: int, data: TransactionUpdate, db: Session = Depends(get_db)):
    transaction = find_transaction(db, transaction_id)
    values = data.model_dump(exclude_unset=True)
    if "category" in values:
        values["category"] = resolve_category(db, values["category"])
    # Keep the legacy column compatible; API responses use the shared category color.
    name = values.get("category", transaction.category)
    values["pie_color"] = f"var(--{db.get(Category, name).color})"
    for name, value in values.items():
        setattr(transaction, name, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db.delete(find_transaction(db, transaction_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
