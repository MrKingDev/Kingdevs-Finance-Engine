from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.transaction import Transaction
from backend.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
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
    transaction = Transaction(**values)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    return find_transaction(db, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(transaction_id: int, data: TransactionUpdate, db: Session = Depends(get_db)):
    transaction = find_transaction(db, transaction_id)
    values = data.model_dump(exclude_unset=True)
    if "category" in values:
        values["category"] = resolve_category(db, values["category"])
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
