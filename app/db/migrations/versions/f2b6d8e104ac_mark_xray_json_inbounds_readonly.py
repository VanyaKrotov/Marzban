"""mark Xray JSON inbounds readonly

Revision ID: f2b6d8e104ac
Revises: e8c1a4d7f203
Create Date: 2026-06-14 00:00:00.000000
"""
import os

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "f2b6d8e104ac"
down_revision = "e8c1a4d7f203"
branch_labels = None
depends_on = None


def _get_config_inbound_tags() -> set[str]:
    config_path = os.environ.get("XRAY_JSON", "./xray_config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as config_file:
            config = commentjson.loads(config_file.read())
    except (OSError, ValueError):
        return set()

    return {
        inbound["tag"]
        for inbound in config.get("inbounds", [])
        if isinstance(inbound, dict) and inbound.get("tag")
    }


def upgrade() -> None:
    op.add_column(
        "inbounds",
        sa.Column(
            "readonly",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )

    tags = _get_config_inbound_tags()
    if tags:
        inbounds = sa.table(
            "inbounds",
            sa.column("tag", sa.String()),
            sa.column("readonly", sa.Boolean()),
        )
        op.get_bind().execute(
            inbounds.update()
            .where(inbounds.c.tag.in_(tags))
            .values(readonly=True)
        )


def downgrade() -> None:
    op.drop_column("inbounds", "readonly")
