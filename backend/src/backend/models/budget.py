from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    month: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    category: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("categories.name", name="fk_budgets_category", ondelete="RESTRICT"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "month",
            "year",
            "category",
            name="uq_budget_month_year_category",
        ),
        Index(
            "uq_budget_overall_month_year", "month", "year", unique=True,
            postgresql_where=text("category IS NULL"), sqlite_where=text("category IS NULL"),
        ),
        CheckConstraint(
            "month >= 1 AND month <= 12",
            name="check_budget_month",
        ),
        CheckConstraint(
            "amount > 0",
            name="check_budget_amount",
        ),
        CheckConstraint(
            "year >= 2000 AND year <= 2100",
            name="check_budget_year",
        ),
    )
