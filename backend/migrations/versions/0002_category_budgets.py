"""Link budgets and transactions through shared categories.

Existing budgets retain their original all-categories scope (category NULL).
"""

from alembic import context, op
from alembic.util import CommandError
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("name", sa.String(100), primary_key=True),
        sa.CheckConstraint("length(trim(name)) > 0", name="check_category_name"),
    )
    op.create_index("uq_categories_name_lower", "categories", [sa.text("lower(name)")], unique=True)
    # Preserve existing transaction categories, merging only case/outer-space variations.
    op.execute("UPDATE transactions SET category = 'Uncategorized' WHERE length(trim(category)) = 0")
    op.execute("INSERT INTO categories (name) SELECT min(trim(category)) FROM transactions GROUP BY lower(trim(category))")
    op.execute("UPDATE transactions SET category = (SELECT name FROM categories WHERE lower(name) = lower(trim(transactions.category)))")
    with op.batch_alter_table("transactions") as batch:
        batch.create_foreign_key("fk_transactions_category", "categories", ["category"], ["name"], ondelete="RESTRICT")
        batch.create_index("ix_transactions_category_type_date", ["category", "type", "date"])
    with op.batch_alter_table("budgets") as batch:
        batch.add_column(sa.Column("category", sa.String(100), nullable=True))
        batch.create_foreign_key("fk_budgets_category", "categories", ["category"], ["name"], ondelete="RESTRICT")
        batch.drop_constraint("uq_budget_month_year", type_="unique")
        batch.create_unique_constraint("uq_budget_month_year_category", ["month", "year", "category"])
        batch.create_index(
            "uq_budget_overall_month_year", ["month", "year"], unique=True,
            postgresql_where=sa.text("category IS NULL"), sqlite_where=sa.text("category IS NULL"),
        )


def downgrade() -> None:
    if not context.is_offline_mode():
        duplicates = op.get_bind().scalar(sa.text(
            "SELECT count(*) FROM (SELECT month, year FROM budgets GROUP BY month, year HAVING count(*) > 1) AS periods"
        ))
        if duplicates:
            raise CommandError("Cannot restore one budget per month while multiple category budgets exist; preserve and resolve them first.")
    with op.batch_alter_table("budgets") as batch:
        batch.drop_index("uq_budget_overall_month_year")
        batch.drop_constraint("uq_budget_month_year_category", type_="unique")
        batch.drop_constraint("fk_budgets_category", type_="foreignkey")
        batch.drop_column("category")
        batch.create_unique_constraint("uq_budget_month_year", ["month", "year"])
    with op.batch_alter_table("transactions") as batch:
        batch.drop_index("ix_transactions_category_type_date")
        batch.drop_constraint("fk_transactions_category", type_="foreignkey")
    op.drop_index("uq_categories_name_lower", table_name="categories")
    op.drop_table("categories")
