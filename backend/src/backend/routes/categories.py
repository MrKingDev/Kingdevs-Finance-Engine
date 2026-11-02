from fastapi import APIRouter, Depends, HTTPException, status
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.category import Category
from backend.category_colors import COLOR_TOKENS
from backend.schemas.category import CategoryCreate, CategoryColorOption, CategoryUpdate, CategoryResponse

from backend.models.transaction import Transaction
from backend.models.budget import Budget
from backend.models.transaction_rule import TransactionRule
from backend.models.subscription import Subscription

CATEGORY_REFERENCES = (Transaction, Budget, TransactionRule, Subscription)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(func.lower(Category.name))).all()


@router.get("/colors", response_model=list[CategoryColorOption])
def list_category_colors():
    return [{"value": token, "label": token.split("-")[1].title()} for token in COLOR_TOKENS]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    category = Category(name=data.name, color=data.color)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name already exists.") from None
    db.refresh(category)
    return category


@router.patch("/{category_name:path}", response_model=CategoryResponse)
def update_category(category_name: str, data: CategoryUpdate, db: Session = Depends(get_db)):
    category = db.scalar(select(Category).where(func.lower(Category.name) == category_name.strip().lower()))
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    name = data.name if data.name is not None else category.name
    color = data.color if data.color is not None else category.color
    duplicate = db.scalar(select(Category).where(func.lower(Category.name) == name.lower()))
    if duplicate is not None and duplicate.name != category.name:
        raise HTTPException(status_code=409, detail="A category with this name already exists.")
    try:
        if name != category.name:
            # Stage references under a temporary valid key, including case-only renames.
            temporary = Category(name=f"__rename_{uuid4().hex}", color=color)
            db.add(temporary)
            db.flush()
            for model in CATEGORY_REFERENCES:
                db.execute(update(model).where(model.category == category.name).values(category=temporary.name))
            db.delete(category)
            db.flush()
            category = Category(name=name, color=color)
            db.add(category)
            db.flush()
            for model in CATEGORY_REFERENCES:
                db.execute(update(model).where(model.category == temporary.name).values(category=name))
            db.delete(temporary)
        else:
            category.color = color
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Unable to update category because of conflicting records.") from None
    db.refresh(category)
    return category


@router.delete("/{category_name:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_name: str, db: Session = Depends(get_db)):
    category = db.scalar(select(Category).where(func.lower(Category.name) == category_name.strip().lower()))
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    for model in CATEGORY_REFERENCES:
        if db.scalar(select(model.id).where(model.category == category.name).limit(1)) is not None:
            raise HTTPException(status_code=409, detail="This category is in use. Reassign its transactions, budgets, rules, and subscriptions before deleting it.")
    db.delete(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This category is in use and cannot be deleted.") from None
