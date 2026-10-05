from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.category import Category
from backend.category_colors import COLOR_TOKENS
from backend.schemas.category import CategoryCreate, CategoryColorOption, CategoryColorUpdate, CategoryResponse

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
def update_category_color(category_name: str, data: CategoryColorUpdate, db: Session = Depends(get_db)):
    category = db.scalar(select(Category).where(func.lower(Category.name) == category_name.strip().lower()))
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    category.color = data.color
    db.commit()
    db.refresh(category)
    return category
