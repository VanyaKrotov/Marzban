"""add node certificates

Revision ID: 9d3f4a7c2b11
Revises: 6f8c2d1a4b70
Create Date: 2026-06-08 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op


revision = "9d3f4a7c2b11"
down_revision = "6f8c2d1a4b70"
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
    inbound_tag_type = next(
        column["type"]
        for column in inspector.get_columns("inbounds")
        if column["name"] == "tag"
    )

    op.create_table(
        "node_certificates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("node_id", node_id_type, nullable=False),
        sa.Column("domain", sa.String(length=253), nullable=False),
        sa.Column("certificate", sa.Text(), nullable=False),
        sa.Column("private_key", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("node_id", "domain"),
    )
    op.create_table(
        "node_certificate_inbounds_association",
        sa.Column("certificate_id", sa.Integer(), nullable=False),
        sa.Column("inbound_tag", inbound_tag_type, nullable=False),
        sa.ForeignKeyConstraint(
            ["certificate_id"], ["node_certificates.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["inbound_tag"], ["inbounds.tag"]),
        sa.PrimaryKeyConstraint("certificate_id", "inbound_tag"),
    )


def downgrade() -> None:
    op.drop_table("node_certificate_inbounds_association")
    op.drop_table("node_certificates")
