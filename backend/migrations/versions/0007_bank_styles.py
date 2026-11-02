"""Persist custom bank badge colors."""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("bank_styles", sa.Column("name", sa.String(100), primary_key=True),
                    sa.Column("color", sa.String(7), nullable=False))


def downgrade():
    op.drop_table("bank_styles")
