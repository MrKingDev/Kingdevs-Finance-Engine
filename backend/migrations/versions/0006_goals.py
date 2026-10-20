"""Persist goals and their income, expense and contribution entries."""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("type", sa.String(11), nullable=False),
        sa.Column("target_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.CheckConstraint("length(trim(name)) > 0", name="check_goal_name"),
        sa.CheckConstraint("type IN ('Savings', 'Debt Payoff')", name="check_goal_type"),
        sa.CheckConstraint("target_amount > 0 AND target_amount <= 9999999999.99", name="check_goal_target"),
    )
    op.create_table(
        "goal_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(12), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], name="fk_goal_entries_goal", ondelete="CASCADE"),
        sa.CheckConstraint("type IN ('income', 'expense', 'contribution')", name="check_goal_entry_type"),
        sa.CheckConstraint("amount > 0 AND amount <= 9999999999.99", name="check_goal_entry_amount"),
    )
    op.create_index("ix_goal_entries_goal_id", "goal_entries", ["goal_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_entries_goal_id", table_name="goal_entries")
    op.drop_table("goal_entries")
    op.drop_table("goals")
