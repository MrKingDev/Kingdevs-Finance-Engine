from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, StringConstraints
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.bank_defaults import BANK_DEFAULTS, default_bank_color
from backend.models.bank import BankStyle
from backend.models.transaction import Transaction

router = APIRouter(prefix="/banks", tags=["Banks"])
BankName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class BankColor(BaseModel):
    color: Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class BankRename(BaseModel):
    name: BankName


def bank_options(db):
    names = {name.lower(): name for name in BANK_DEFAULTS}
    for name in db.scalars(select(Transaction.bank).distinct().order_by(Transaction.bank)):
        names.setdefault(name.strip().lower(), name.strip())
    styles = {row.name: row for row in db.scalars(select(BankStyle))}
    for key, row in styles.items():
        if row.hidden:
            names.pop(key, None)
        else:
            names[key] = row.display_name or names.get(key, key)
    counts = dict(db.execute(select(func.lower(func.trim(Transaction.bank)), func.count()).group_by(func.lower(func.trim(Transaction.bank)))).all())
    return {key: {"name": name, "color": styles[key].color if key in styles else None,
                  "transaction_count": counts.get(key, 0)} for key, name in sorted(names.items())}


def require_bank(db, name):
    key = name.strip().lower()
    option = bank_options(db).get(key)
    if option is None:
        raise HTTPException(404, "Bank not found.")
    return key, option


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Bank changed elsewhere. Refresh and try again.") from None


@router.get("")
def list_banks(db: Session = Depends(get_db)):
    return list(bank_options(db).values())


@router.delete("/color/{name:path}", status_code=204)
def reset_bank_color(name: str, db: Session = Depends(get_db)):
    key, _ = require_bank(db, name)
    row = db.get(BankStyle, key)
    if row is not None:
        row.color = None
        commit(db)


@router.put("/{name:path}")
def save_bank_color(name: str, data: BankColor, db: Session = Depends(get_db)):
    display_name, key = name.strip(), name.strip().lower()
    if not 1 <= len(key) <= 100:
        raise HTTPException(422, "Bank name must contain 1 to 100 characters.")
    row = db.get(BankStyle, key)
    if row is None:
        row = BankStyle(name=key, display_name=display_name, color=data.color.lower())
        db.add(row)
    else:
        row.color = data.color.lower()
        row.hidden = False
    commit(db)
    return {"name": row.display_name or display_name, "color": row.color}


@router.patch("/{name:path}")
def rename_bank(name: str, data: BankRename, db: Session = Depends(get_db)):
    key, option = require_bank(db, name)
    target = data.name.lower()
    if target != key and target in bank_options(db):
        raise HTTPException(409, "A bank with this name already exists.")
    original = db.get(BankStyle, key)
    color = option["color"] or default_bank_color(option["name"])
    if target == key:
        if original is None:
            original = BankStyle(name=key, color=color)
            db.add(original)
        original.display_name = data.name
    else:
        replacement = db.get(BankStyle, target)
        if replacement is None:
            replacement = BankStyle(name=target)
            db.add(replacement)
        replacement.display_name, replacement.color, replacement.hidden = data.name, color, False
        if original is None:
            original = BankStyle(name=key)
            db.add(original)
        original.hidden = True
    db.execute(update(Transaction).where(func.lower(func.trim(Transaction.bank)) == key).values(bank=data.name))
    commit(db)
    return {"name": data.name, "color": color}


@router.delete("/{name:path}", status_code=204)
def delete_bank(name: str, replacement: str | None = Query(None, max_length=100), db: Session = Depends(get_db)):
    key, option = require_bank(db, name)
    if option["transaction_count"]:
        if not replacement:
            raise HTTPException(409, "Choose a replacement bank for this bank's transactions before deleting it.")
        target, destination = require_bank(db, replacement)
        if target == key:
            raise HTTPException(422, "Choose a different replacement bank.")
        db.execute(update(Transaction).where(func.lower(func.trim(Transaction.bank)) == key).values(bank=destination["name"]))
    row = db.get(BankStyle, key)
    if row is None:
        row = BankStyle(name=key)
        db.add(row)
    row.hidden = True
    commit(db)
