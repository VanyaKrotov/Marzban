"""add subscription balancers

Revision ID: c9f2a6e1b4d8
Revises: b5e9c7d8a4f1
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa


revision = "c9f2a6e1b4d8"
down_revision = "b5e9c7d8a4f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subscription_balancers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("strategy", sa.String(length=32), server_default="least_ping", nullable=False),
        sa.Column("probe_url", sa.String(length=2048), nullable=False),
        sa.Column("probe_interval", sa.Integer(), server_default="300", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "subscription_balancer_hosts",
        sa.Column("balancer_id", sa.Integer(), nullable=False),
        sa.Column("host_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["balancer_id"], ["subscription_balancers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["host_id"], ["hosts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("balancer_id", "host_id"),
    )


def downgrade() -> None:
    op.drop_table("subscription_balancer_hosts")
    op.drop_table("subscription_balancers")
