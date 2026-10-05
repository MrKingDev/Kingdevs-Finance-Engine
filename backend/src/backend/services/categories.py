from sqlalchemy import func, select
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.category import Category


def resolve_category(db: Session, name: str) -> str:
    """Select an existing category; only Settings creates categories now."""
    name = name.strip()
    query = select(Category).where(func.lower(Category.name) == name.lower())
    existing = db.scalar(query)
    if existing is not None:
        return existing.name
    raise HTTPException(status_code=422, detail="Choose an existing category. Create it in Settings > Categories first.")
