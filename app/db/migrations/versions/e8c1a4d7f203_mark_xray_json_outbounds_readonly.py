"""mark Xray JSON outbounds readonly

Revision ID: e8c1a4d7f203
Revises: d4f7b9c2a610
Create Date: 2026-06-14 00:00:00.000000
"""
import os

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "e8c1a4d7f203"
down_revision = "d4f7b9c2a610"
branch_labels = None
depends_on = None


def _get_config_outbound_tags() -> set[str]:
    config_path = os.environ.get("XRAY_JSON", "./xray_config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as config_file:
            config = commentjson.loads(config_file.read())
    except (OSError, ValueError):
        return set()

    return {
        outbound["tag"]
        for outbound in config.get("outbounds", [])
        if isinstance(outbound, dict) and outbound.get("tag")
    }


def upgrade() -> None:
    op.add_column(
        "outbounds",
        sa.Column(
            "readonly",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )

    tags = _get_config_outbound_tags()
    if tags:
        outbounds = sa.table(
            "outbounds",
            sa.column("tag", sa.String()),
            sa.column("readonly", sa.Boolean()),
        )
        op.get_bind().execute(
            outbounds.update()
            .where(outbounds.c.tag.in_(tags))
            .values(readonly=True)
        )


def downgrade() -> None:
    op.drop_column("outbounds", "readonly")
