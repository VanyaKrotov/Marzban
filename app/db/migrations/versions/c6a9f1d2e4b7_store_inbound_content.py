"""store inbound content

Revision ID: c6a9f1d2e4b7
Revises: 9d3f4a7c2b11
Create Date: 2026-06-13 00:00:00.000000
"""
import os

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "c6a9f1d2e4b7"
down_revision = "9d3f4a7c2b11"
branch_labels = None
depends_on = None

SUPPORTED_PROTOCOLS = {
    "dokodemo-door",
    "http",
    "shadowsocks",
    "socks",
    "trojan",
    "vless",
    "vmess",
    "wireguard",
    "hysteria",
    "tun",
}


def upgrade() -> None:
    with op.batch_alter_table("inbounds") as batch_op:
        batch_op.add_column(sa.Column("content", sa.JSON(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "enabled",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            )
        )

    connection = op.get_bind()
    inbound_table = sa.table(
        "inbounds",
        sa.column("tag", sa.String()),
        sa.column("content", sa.JSON()),
        sa.column("enabled", sa.Boolean()),
    )

    config_path = os.environ.get("XRAY_JSON", "./xray_config.json")
    excluded_tags = set(
        os.environ.get("XRAY_EXCLUDE_INBOUND_TAGS", "").split()
    )
    try:
        with open(config_path, "r", encoding="utf-8") as config_file:
            config = commentjson.loads(config_file.read())
    except (OSError, ValueError):
        config = {}

    existing_tags = {
        row[0]
        for row in connection.execute(sa.select(inbound_table.c.tag))
    }
    for inbound in config.get("inbounds", []):
        tag = inbound.get("tag")
        if (
            not tag
            or tag in excluded_tags
            or inbound.get("protocol") not in SUPPORTED_PROTOCOLS
        ):
            continue
        if tag in existing_tags:
            connection.execute(
                inbound_table.update()
                .where(inbound_table.c.tag == tag)
                .values(content=inbound, enabled=True)
            )
        else:
            connection.execute(
                inbound_table.insert().values(
                    tag=tag,
                    content=inbound,
                    enabled=True,
                )
            )

    empty_content = {"protocol": "dokodemo-door", "settings": {}}
    connection.execute(
        inbound_table.update()
        .where(inbound_table.c.content.is_(None))
        .values(content=empty_content)
    )

    with op.batch_alter_table("inbounds") as batch_op:
        batch_op.alter_column(
            "content",
            existing_type=sa.JSON(),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("inbounds") as batch_op:
        batch_op.drop_column("enabled")
        batch_op.drop_column("content")
