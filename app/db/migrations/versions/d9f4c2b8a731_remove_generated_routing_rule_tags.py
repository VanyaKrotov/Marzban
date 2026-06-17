"""remove generated routing rule tags

Revision ID: d9f4c2b8a731
Revises: c8f91a2b3d4e
Create Date: 2026-06-17 00:00:00.000000

"""
import json

import sqlalchemy as sa
from alembic import op


revision = "d9f4c2b8a731"
down_revision = "c8f91a2b3d4e"
branch_labels = None
depends_on = None


prefix = "marzban-routing-"
routing_rules_table = sa.table(
    "routing_rules",
    sa.column("id", sa.Integer),
    sa.column("content", sa.JSON),
)


def _as_content(value):
    if isinstance(value, str):
        return json.loads(value)
    return dict(value) if isinstance(value, dict) else None


def upgrade() -> None:
    connection = op.get_bind()
    for rule_id, content in connection.execute(
        sa.select(routing_rules_table.c.id, routing_rules_table.c.content)
    ):
        content = _as_content(content)
        if content is None:
            continue
        if content.get("ruleTag") != f"{prefix}{rule_id}":
            continue
        del content["ruleTag"]
        connection.execute(
            routing_rules_table.update()
            .where(routing_rules_table.c.id == rule_id)
            .values(content=content)
        )


def downgrade() -> None:
    connection = op.get_bind()
    for rule_id, content in connection.execute(
        sa.select(routing_rules_table.c.id, routing_rules_table.c.content)
    ):
        content = _as_content(content)
        if content is None or content.get("ruleTag"):
            continue
        content["ruleTag"] = f"{prefix}{rule_id}"
        connection.execute(
            routing_rules_table.update()
            .where(routing_rules_table.c.id == rule_id)
            .values(content=content)
        )
