from sqlalchemy import CheckConstraint, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base
from backend.category_colors import COLOR_TOKENS, DEFAULT_CATEGORY_COLOR


class Category(Base):
    __tablename__ = "categories"

    # Renames must update all references atomically through the categories route.
    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    color: Mapped[str] = mapped_column(
        String(32), nullable=False, default=DEFAULT_CATEGORY_COLOR,
        server_default=DEFAULT_CATEGORY_COLOR,
    )

    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="check_category_name"),
        Index("uq_categories_name_lower", func.lower(name), unique=True),
        CheckConstraint(
            "color IN (" + ", ".join(repr(color) for color in COLOR_TOKENS) + ")",
            name="check_category_color",
        ),
    )
