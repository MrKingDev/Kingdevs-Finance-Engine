"""Persist subscriptions and their payment history without seeding financial data."""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("billing_cycle", sa.String(7), nullable=False),
        sa.Column("next_due_date", sa.Date(), nullable=False),
        sa.Column("billing_anchor_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("payment_method_label", sa.String(100), nullable=True),
        sa.Column("icon", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["category"], ["categories.name"], name="fk_subscriptions_category", ondelete="SET NULL"),
        sa.CheckConstraint("length(trim(name)) > 0", name="check_subscription_name"),
        sa.CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_subscription_amount"),
        sa.CheckConstraint("billing_cycle IN ('monthly', 'annual')", name="check_subscription_cycle"),
        sa.CheckConstraint("next_due_date >= billing_anchor_date", name="check_subscription_anchor"),
    )
    op.create_index("ix_subscriptions_active_due", "subscriptions", ["is_active", "next_due_date"])
    op.create_index("ix_subscriptions_category", "subscriptions", ["category"])
    op.create_table(
        "subscription_payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subscription_id", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("paid_on", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], name="fk_subscription_payments_subscription", ondelete="RESTRICT"),
        sa.UniqueConstraint("subscription_id", "due_date", name="uq_subscription_payment_occurrence"),
        sa.CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_subscription_payment_amount"),
    )


def downgrade() -> None:
    op.drop_table("subscription_payments")
    op.drop_index("ix_subscriptions_category", table_name="subscriptions")
    op.drop_index("ix_subscriptions_active_due", table_name="subscriptions")
    op.drop_table("subscriptions")
