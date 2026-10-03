from sqlalchemy import CheckConstraint, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Category(Base):
    __tablename__ = "categories"

    # Names are shared keys until category editing/renaming is introduced.
    name: Mapped[str] = mapped_column(String(100), primary_key=True)

    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="check_category_name"),
        Index("uq_categories_name_lower", func.lower(name), unique=True),
    )
