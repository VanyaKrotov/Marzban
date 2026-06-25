"""add host groups

Revision ID: 6d9f4a8c2b31
Revises: 13b4f0f7c9a1
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "6d9f4a8c2b31"
down_revision = "13b4f0f7c9a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "host_groups",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_host_groups_name"), "host_groups", ["name"], unique=False)

    op.create_table(
        "host_group_hosts",
        sa.Column("host_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["host_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["host_id"], ["hosts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("host_id", "group_id"),
    )
    op.create_index(op.f("ix_host_group_hosts_group_id"), "host_group_hosts", ["group_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_host_group_hosts_group_id"), table_name="host_group_hosts")
    op.drop_table("host_group_hosts")
    op.drop_index(op.f("ix_host_groups_name"), table_name="host_groups")
    op.drop_table("host_groups")
