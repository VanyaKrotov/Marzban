"""add node geo resource updates

Revision ID: b8e4f1a6c203
Revises: a7d3c9e5f102
Create Date: 2026-06-15 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op


revision = "b8e4f1a6c203"
down_revision = "a7d3c9e5f102"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    node_id_type = next(
        column["type"]
        for column in inspector.get_columns("nodes")
        if column["name"] == "id"
    )

    op.create_table(
        "node_geo_resource_updates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("node_id", node_id_type, nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("cron", sa.String(length=128), nullable=False),
        sa.Column("last_updated_at", sa.DateTime(), nullable=True),
        sa.Column("next_run_at", sa.DateTime(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_error_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("node_id", "filename"),
    )
    op.create_index(
        "ix_node_geo_resource_updates_next_run_at",
        "node_geo_resource_updates",
        ["next_run_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_node_geo_resource_updates_next_run_at",
        table_name="node_geo_resource_updates",
    )
    op.drop_table("node_geo_resource_updates")
