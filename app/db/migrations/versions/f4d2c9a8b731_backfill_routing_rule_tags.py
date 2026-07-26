"""backfill routing rule tags

Revision ID: f4d2c9a8b731
Revises: 6d9f4a8c2b31
Create Date: 2026-07-26 21:55:00.000000

"""
import json

import sqlalchemy as sa
from alembic import op


revision = "f4d2c9a8b731"
down_revision = "6d9f4a8c2b31"
branch_labels = None
depends_on = None


routing_rules_table = sa.table(
    "routing_rules",
    sa.column("id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("content", sa.JSON),
)


def _as_content(value):
    if isinstance(value, str):
        return json.loads(value)
    return dict(value) if isinstance(value, dict) else None


def upgrade() -> None:
    connection = op.get_bind()
    for rule_id, name, content in connection.execute(
        sa.select(
            routing_rules_table.c.id,
            routing_rules_table.c.name,
            routing_rules_table.c.content,
        )
    ):
        content = _as_content(content)
        if content is None or content.get("ruleTag") or not name:
            continue
        content["ruleTag"] = name
        connection.execute(
            routing_rules_table.update()
            .where(routing_rules_table.c.id == rule_id)
            .values(content=content)
        )


def downgrade() -> None:
    pass
