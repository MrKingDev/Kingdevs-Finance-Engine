from datetime import date as Date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date as SQLDate, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[Date] = mapped_column(SQLDate, nullable=False)
    merchant: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        String(100), ForeignKey("categories.name", name="fk_transactions_category", ondelete="RESTRICT"),
        nullable=False,
    )
    bank: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(7), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    pie_color: Mapped[str] = mapped_column(
        String(100), nullable=False, default="var(--chart-1)"
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_transaction_amount"),
        CheckConstraint("type IN ('income', 'expense')", name="check_transaction_type"),
        Index("ix_transactions_type_date", "type", "date"),
        Index("ix_transactions_category_type_date", "category", "type", "date"),
    )
