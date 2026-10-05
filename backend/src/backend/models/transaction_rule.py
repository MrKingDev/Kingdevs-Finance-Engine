from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, true
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class TransactionRule(Base):
    __tablename__ = "transaction_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_text: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    type: Mapped[str] = mapped_column(String(7), nullable=False)
    category: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("categories.name", name="fk_transaction_rules_category", ondelete="SET NULL"),
        nullable=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_rule_type"),
        CheckConstraint("length(trim(match_text)) > 0", name="check_rule_match_text"),
    )
