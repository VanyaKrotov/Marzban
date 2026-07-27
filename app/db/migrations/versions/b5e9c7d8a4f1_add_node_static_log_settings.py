"""add node static log settings

Revision ID: b5e9c7d8a4f1
Revises: a41e3c7d9f20
Create Date: 2026-07-27 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "b5e9c7d8a4f1"
down_revision = "a41e3c7d9f20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "nodes",
        sa.Column("access_log_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "nodes",
        sa.Column("error_log_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "nodes",
        sa.Column("log_retention_days", sa.Integer(), nullable=False, server_default=sa.text("14")),
    )
    op.add_column("nodes", sa.Column("log_storage_limit_bytes", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("nodes") as batch_op:
        batch_op.drop_column("log_storage_limit_bytes")
        batch_op.drop_column("log_retention_days")
        batch_op.drop_column("error_log_enabled")
        batch_op.drop_column("access_log_enabled")
