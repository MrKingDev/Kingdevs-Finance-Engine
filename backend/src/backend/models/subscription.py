from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    billing_cycle: Mapped[str] = mapped_column(String(7))
    next_due_date: Mapped[date] = mapped_column(Date)
    billing_anchor_date: Mapped[date] = mapped_column(Date)
    category: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("categories.name", name="fk_subscriptions_category", ondelete="SET NULL")
    )
    payment_method_label: Mapped[str | None] = mapped_column(String(100))
    icon: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="check_subscription_name"),
        CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_subscription_amount"),
        CheckConstraint("billing_cycle IN ('monthly', 'annual')", name="check_subscription_cycle"),
        CheckConstraint("next_due_date >= billing_anchor_date", name="check_subscription_anchor"),
        Index("ix_subscriptions_active_due", "is_active", "next_due_date"),
        Index("ix_subscriptions_category", "category"),
    )


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", name="fk_subscription_payments_subscription", ondelete="RESTRICT")
    )
    due_date: Mapped[date] = mapped_column(Date)
    paid_on: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("subscription_id", "due_date", name="uq_subscription_payment_occurrence"),
        CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_subscription_payment_amount"),
    )
