"""add routing rules

Revision ID: a7d3c9e5f102
Revises: f2b6d8e104ac
Create Date: 2026-06-14 00:00:00.000000
"""
import os

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "a7d3c9e5f102"
down_revision = "f2b6d8e104ac"
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
        "routing_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("create_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "readonly",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "position",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_routing_rules_position"),
        "routing_rules",
        ["position"],
        unique=False,
    )
    op.create_table(
        "node_routing_rules_association",
        sa.Column("node_id", node_id_type, nullable=False),
        sa.Column("routing_rule_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"]),
        sa.ForeignKeyConstraint(["routing_rule_id"], ["routing_rules.id"]),
        sa.PrimaryKeyConstraint("node_id", "routing_rule_id"),
    )

    metadata = sa.MetaData()
    rules_table = sa.Table(
        "routing_rules",
        metadata,
        autoload_with=connection,
    )
    association_table = sa.Table(
        "node_routing_rules_association",
        metadata,
        autoload_with=connection,
    )
    nodes_table = sa.Table("nodes", metadata, autoload_with=connection)

    config_path = os.environ.get("XRAY_JSON", "./xray_config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as config_file:
            config = commentjson.loads(config_file.read())
    except (OSError, ValueError):
        config = {}

    node_ids = [row[0] for row in connection.execute(sa.select(nodes_table.c.id))]
    routing = config.get("routing")
    rules = routing.get("rules", []) if isinstance(routing, dict) else []
    for position, rule in enumerate(rules):
        if not isinstance(rule, dict):
            continue
        result = connection.execute(
            rules_table.insert().values(
                create_at=sa.func.now(),
                name=f"Xray rule {position + 1}",
                content=rule,
                enabled=True,
                readonly=True,
                position=position,
            )
        )
        rule_id = result.inserted_primary_key[0]
        if node_ids:
            connection.execute(
                association_table.insert(),
                [
                    {"node_id": node_id, "routing_rule_id": rule_id}
                    for node_id in node_ids
                ],
            )


def downgrade() -> None:
    op.drop_table("node_routing_rules_association")
    op.drop_index(
        op.f("ix_routing_rules_position"),
        table_name="routing_rules",
    )
    op.drop_table("routing_rules")
