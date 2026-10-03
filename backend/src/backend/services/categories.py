from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models.category import Category


def resolve_category(db: Session, name: str) -> str:
    """Use one stored spelling for names that differ only in case or outer spaces."""
    name = name.strip()
    query = select(Category).where(func.lower(Category.name) == name.lower())
    existing = db.scalar(query)
    if existing is not None:
        return existing.name
    try:
        with db.begin_nested():
            db.add(Category(name=name))
            db.flush()
    except IntegrityError:
        # A concurrent writer may have created this name during our request.
        existing = db.scalar(query)
        if existing is None:
            raise
        return existing.name
    return name
