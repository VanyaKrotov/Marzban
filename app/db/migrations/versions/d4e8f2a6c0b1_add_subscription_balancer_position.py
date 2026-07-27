"""add subscription balancer position

Revision ID: d4e8f2a6c0b1
Revises: c9f2a6e1b4d8
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e8f2a6c0b1"
down_revision = "c9f2a6e1b4d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "subscription_balancers",
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE subscription_balancers SET position = id")
    op.create_index(
        "ix_subscription_balancers_position",
        "subscription_balancers",
        ["position"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_subscription_balancers_position", table_name="subscription_balancers")
    with op.batch_alter_table("subscription_balancers") as batch_op:
        batch_op.drop_column("position")
