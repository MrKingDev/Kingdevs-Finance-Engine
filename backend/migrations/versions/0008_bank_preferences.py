"""Support bank names and durable removal from selectors."""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("bank_styles") as batch:
        batch.alter_column("color", existing_type=sa.String(7), nullable=True)
        batch.add_column(sa.Column("display_name", sa.String(100), nullable=True))
        batch.add_column(sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.execute("DELETE FROM bank_styles WHERE color IS NULL")
    with op.batch_alter_table("bank_styles") as batch:
        batch.drop_column("hidden")
        batch.drop_column("display_name")
        batch.alter_column("color", existing_type=sa.String(7), nullable=False)
