"""remove master node usage

Revision ID: 8b12d4f6a901
Revises: 7f2c4d8a9b10
Create Date: 2026-06-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "8b12d4f6a901"
down_revision = "7f2c4d8a9b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("DELETE FROM node_user_usages WHERE node_id IS NULL"))
    connection.execute(sa.text("DELETE FROM node_usages WHERE node_id IS NULL"))

    with op.batch_alter_table("node_user_usages") as batch_op:
        batch_op.alter_column(
            "node_id",
            existing_type=sa.Integer(),
            existing_nullable=True,
            nullable=False,
        )

    with op.batch_alter_table("node_usages") as batch_op:
        batch_op.alter_column(
            "node_id",
            existing_type=sa.Integer(),
            existing_nullable=True,
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("node_usages") as batch_op:
        batch_op.alter_column(
            "node_id",
            existing_type=sa.Integer(),
            existing_nullable=False,
            nullable=True,
        )

    with op.batch_alter_table("node_user_usages") as batch_op:
        batch_op.alter_column(
            "node_id",
            existing_type=sa.Integer(),
            existing_nullable=False,
            nullable=True,
        )
