"""Persist the workspace's region, currency and time zone."""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "preferences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("locale", sa.String(20), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("time_zone", sa.String(100), nullable=False),
        sa.CheckConstraint("id = 1", name="preferences_singleton"),
    )


def downgrade():
    op.drop_table("preferences")
