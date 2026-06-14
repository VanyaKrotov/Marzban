"""add managed outbounds

Revision ID: d4f7b9c2a610
Revises: c6a9f1d2e4b7
Create Date: 2026-06-14 00:00:00.000000
"""
import os

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "d4f7b9c2a610"
down_revision = "c6a9f1d2e4b7"
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
        "outbounds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tag", sa.String(length=256), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_outbounds_tag"), "outbounds", ["tag"], unique=True)
    op.create_table(
        "node_outbounds_association",
        sa.Column("node_id", node_id_type, nullable=False),
        sa.Column("outbound_tag", sa.String(length=256), nullable=False),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"]),
        sa.ForeignKeyConstraint(["outbound_tag"], ["outbounds.tag"]),
        sa.PrimaryKeyConstraint("node_id", "outbound_tag"),
    )

    outbound_table = sa.table(
        "outbounds",
        sa.column("id", sa.Integer()),
        sa.column("tag", sa.String()),
        sa.column("content", sa.JSON()),
        sa.column("enabled", sa.Boolean()),
    )
    association_table = sa.table(
        "node_outbounds_association",
        sa.column("node_id", node_id_type),
        sa.column("outbound_tag", sa.String()),
    )
    nodes_table = sa.table("nodes", sa.column("id", node_id_type))

    config_path = os.environ.get("XRAY_JSON", "./xray_config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as config_file:
            config = commentjson.loads(config_file.read())
    except (OSError, ValueError):
        config = {}

    node_ids = [row[0] for row in connection.execute(sa.select(nodes_table.c.id))]
    seen_tags = set()
    for outbound in config.get("outbounds", []):
        tag = outbound.get("tag")
        if not tag or tag in seen_tags:
            continue
        seen_tags.add(tag)
        connection.execute(
            outbound_table.insert().values(
                tag=tag,
                content=outbound,
                enabled=True,
            )
        )
        if node_ids:
            connection.execute(
                association_table.insert(),
                [
                    {"node_id": node_id, "outbound_tag": tag}
                    for node_id in node_ids
                ],
            )


def downgrade() -> None:
    op.drop_table("node_outbounds_association")
    op.drop_index(op.f("ix_outbounds_tag"), table_name="outbounds")
    op.drop_table("outbounds")
