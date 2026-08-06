"""add xhttp host settings

Revision ID: e2f7a3c9b4d1
Revises: d4e8f2a6c0b1
Create Date: 2026-08-06
"""

from alembic import op
import sqlalchemy as sa


revision = "e2f7a3c9b4d1"
down_revision = "d4e8f2a6c0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hosts", sa.Column("sc_max_buffered_posts", sa.Integer(), nullable=True))
    op.add_column("hosts", sa.Column("x_padding_obfs_mode", sa.Boolean(), nullable=True))
    op.add_column("hosts", sa.Column("uplink_http_method", sa.String(length=32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("hosts") as batch_op:
        batch_op.drop_column("uplink_http_method")
        batch_op.drop_column("x_padding_obfs_mode")
        batch_op.drop_column("sc_max_buffered_posts")
