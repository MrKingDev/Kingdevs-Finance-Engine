"""Create the tables required by the budget routes.

Revision ID: 0001
Revises: None
"""

from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("month", "year", name="uq_budget_month_year"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="check_budget_month"),
        sa.CheckConstraint("year >= 2000 AND year <= 2100", name="check_budget_year"),
        sa.CheckConstraint("amount > 0", name="check_budget_amount"),
    )
    op.create_index("ix_budgets_id", "budgets", ["id"])
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("merchant", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("bank", sa.String(100), nullable=False),
        sa.Column("type", sa.String(7), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("pie_color", sa.String(100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("amount > 0", name="check_transaction_amount"),
        sa.CheckConstraint("type IN ('income', 'expense')", name="check_transaction_type"),
    )
    op.create_index("ix_transactions_type_date", "transactions", ["type", "date"])


def downgrade() -> None:
    op.drop_index("ix_transactions_type_date", table_name="transactions")
    op.drop_table("transactions")
    op.drop_index("ix_budgets_id", table_name="budgets")
    op.drop_table("budgets")
