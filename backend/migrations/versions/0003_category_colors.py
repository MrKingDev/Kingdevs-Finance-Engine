"""Store the chart color on each category without changing financial data."""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

# Frozen migration values, independent of future application palette changes.
COLORS = (
    "chart-emerald-2", "chart-red-2", "chart-amber-2", "chart-blue-2",
    "chart-cyan-2", "chart-fuchsia-2", "chart-green-2", "chart-indigo-2",
    "chart-lime-2", "chart-orange-2", "chart-pink-2", "chart-purple-2",
    "chart-rose-2", "chart-sky-2", "chart-teal-2", "chart-violet-2", "chart-yellow-2",
)


def upgrade() -> None:
    # Inline CHECK avoids a SQLite table rebuild with incoming category foreign keys.
    op.add_column("categories", sa.Column(
        "color", sa.String(32),
        sa.CheckConstraint("color IN (" + ", ".join(repr(color) for color in COLORS) + ")", name="check_category_color"),
        nullable=False, server_default="chart-blue-2",
    ))
    # Preserve the earliest saved valid palette color, otherwise use the visible blue default.
    css_colors = ", ".join(repr(f"var(--{color})") for color in COLORS)
    op.execute(sa.text(
        "UPDATE categories SET color = COALESCE((SELECT "
        "substr(t.pie_color, 7, length(t.pie_color) - 7) FROM transactions t "
        "WHERE t.category = categories.name AND t.pie_color IN (" + css_colors + ") "
        "ORDER BY t.id LIMIT 1), 'chart-blue-2')"
    ))


def downgrade() -> None:
    # PostgreSQL removes the column's own CHECK with the column; SQLite does too.
    op.drop_column("categories", "color")
