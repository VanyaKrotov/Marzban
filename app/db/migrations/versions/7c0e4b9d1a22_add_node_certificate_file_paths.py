"""add node certificate file paths

Revision ID: 7c0e4b9d1a22
Revises: d9f4c2b8a731
Create Date: 2026-06-17 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op


revision = "7c0e4b9d1a22"
down_revision = "d9f4c2b8a731"
branch_labels = None
depends_on = None


CERTIFICATES_DIR = "/var/lib/marzban-node/certificates"


def upgrade() -> None:
    op.add_column(
        "node_certificates",
        sa.Column("certificate_file", sa.String(length=2048), nullable=True),
    )
    op.add_column(
        "node_certificates",
        sa.Column("key_file", sa.String(length=2048), nullable=True),
    )

    connection = op.get_bind()
    table = sa.table(
        "node_certificates",
        sa.column("domain", sa.String()),
        sa.column("certificate_file", sa.String()),
        sa.column("key_file", sa.String()),
    )
    for row in connection.execute(sa.select(table.c.domain)):
        domain = row.domain
        base = f"{CERTIFICATES_DIR}/{domain}/production"
        connection.execute(
            table.update()
            .where(table.c.domain == domain)
            .values(
                certificate_file=f"{base}/fullchain.pem",
                key_file=f"{base}/private_key.pem",
            )
        )


def downgrade() -> None:
    op.drop_column("node_certificates", "key_file")
    op.drop_column("node_certificates", "certificate_file")
