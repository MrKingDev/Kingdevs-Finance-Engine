from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(11))
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    target_date: Mapped[date | None] = mapped_column(Date)

    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="check_goal_name"),
        CheckConstraint("type IN ('Savings', 'Debt Payoff')", name="check_goal_type"),
        CheckConstraint("target_amount > 0 AND target_amount <= 9999999999.99", name="check_goal_target"),
    )


class GoalEntry(Base):
    __tablename__ = "goal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goals.id", name="fk_goal_entries_goal", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(12))
    date: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(String(500), default="")
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense', 'contribution')", name="check_goal_entry_type"),
        CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_goal_entry_amount"),
    )
