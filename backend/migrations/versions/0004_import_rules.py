"""Add editable CSV classification rules without changing saved transactions."""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    rules = op.create_table(
        "transaction_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("match_text", sa.String(100), nullable=False),
        sa.Column("type", sa.String(7), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["category"], ["categories.name"], name="fk_transaction_rules_category", ondelete="SET NULL"),
        sa.UniqueConstraint("match_text"),
        sa.CheckConstraint("type IN ('income', 'expense')", name="check_rule_type"),
        sa.CheckConstraint("length(trim(match_text)) > 0", name="check_rule_match_text"),
    )
    # Small editable starting set. No categories or financial records are seeded.
    op.bulk_insert(rules, [
        {"match_text": text, "type": kind, "category": None, "enabled": True}
        for text, kind in (
            ("rent", "expense"), ("groceries", "expense"), ("grocery", "expense"),
            ("utilities", "expense"), ("salary", "income"), ("payroll", "income"),
        )
    ])


def downgrade() -> None:
    op.drop_table("transaction_rules")
