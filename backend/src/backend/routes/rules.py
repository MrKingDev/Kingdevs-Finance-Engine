from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Category, TransactionRule
from backend.schemas.transaction_rule import RuleResponse, RuleWrite

router = APIRouter(prefix="/rules", tags=["Import rules"])


@router.get("", response_model=list[RuleResponse])
def list_rules(db: Session = Depends(get_db)):
    return db.scalars(select(TransactionRule).order_by(func.length(TransactionRule.match_text).desc(), TransactionRule.id)).all()


def save_rule(db: Session, rule: TransactionRule, data: RuleWrite):
    values = data.model_dump()
    if data.category is not None:
        category = db.scalar(select(Category).where(func.lower(Category.name) == data.category.lower()))
        if category is None:
            raise HTTPException(422, "Choose a saved category from Settings.")
        values["category"] = category.name
    for name, value in values.items():
        setattr(rule, name, value)
    db.add(rule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A rule for this description already exists.") from None
    db.refresh(rule)
    return rule


@router.post("", response_model=RuleResponse, status_code=201)
def create_rule(data: RuleWrite, db: Session = Depends(get_db)):
    return save_rule(db, TransactionRule(), data)


@router.put("/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: int, data: RuleWrite, db: Session = Depends(get_db)):
    rule = db.get(TransactionRule, rule_id)
    if rule is None:
        raise HTTPException(404, "Rule not found.")
    return save_rule(db, rule, data)


@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(TransactionRule, rule_id)
    if rule is None:
        raise HTTPException(404, "Rule not found.")
    db.delete(rule)
    db.commit()
    return Response(status_code=204)
