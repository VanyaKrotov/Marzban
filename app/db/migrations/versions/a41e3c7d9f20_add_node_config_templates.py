"""add node config templates

Revision ID: a41e3c7d9f20
Revises: f4d2c9a8b731
Create Date: 2026-07-26 22:10:00.000000

"""
from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path

import commentjson
import sqlalchemy as sa
from alembic import op


revision = "a41e3c7d9f20"
down_revision = "f4d2c9a8b731"
branch_labels = None
depends_on = None


DEFAULT_NODE_CONFIG = {
    "log": {
        "loglevel": "warning",
    },
    "routing": {
        "rules": [
            {
                "ruleTag": "xray-rule-1",
                "ip": [
                    "geoip:private",
                ],
                "outboundTag": "BLOCK",
                "type": "field",
            },
        ],
    },
    "inbounds": [
        {
            "tag": "Shadowsocks TCP",
            "listen": "0.0.0.0",
            "port": 1080,
            "protocol": "shadowsocks",
            "settings": {
                "clients": [],
                "network": "tcp,udp",
            },
        },
    ],
    "outbounds": [
        {
            "protocol": "freedom",
            "tag": "DIRECT",
        },
        {
            "protocol": "blackhole",
            "tag": "BLOCK",
        },
    ],
}


runtime_settings_table = sa.table(
    "runtime_settings",
    sa.column("id", sa.Integer),
    sa.column("default_node_config", sa.JSON),
)

nodes_table = sa.table(
    "nodes",
    sa.column("id", sa.Integer),
    sa.column("config_template", sa.JSON),
)


def _load_template() -> dict:
    candidate_paths = [
        Path(os.environ.get("XRAY_JSON", "./xray_config.json")),
        Path(__file__).resolve().parents[4] / "xray_config.json",
    ]
    for path in candidate_paths:
        try:
            with open(path, "r", encoding="utf-8") as config_file:
                config = commentjson.loads(config_file.read())
        except (OSError, ValueError):
            continue
        if isinstance(config, dict):
            return _normalize_routing_rule_tags(config)
    return deepcopy(DEFAULT_NODE_CONFIG)


def _normalize_routing_rule_tags(config: dict) -> dict:
    normalized = deepcopy(config)
    routing = normalized.get("routing")
    rules = routing.get("rules", []) if isinstance(routing, dict) else []
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict):
            continue
        rule_tag = rule.get("ruleTag")
        if not isinstance(rule_tag, str) or not rule_tag.strip():
            rule["ruleTag"] = f"xray-rule-{index + 1}"
    return normalized


def upgrade() -> None:
    template = _load_template()
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    runtime_settings_columns = {
        column["name"] for column in inspector.get_columns("runtime_settings")
    }
    node_columns = {column["name"] for column in inspector.get_columns("nodes")}

    if "default_node_config" not in runtime_settings_columns:
        op.add_column(
            "runtime_settings",
            sa.Column("default_node_config", sa.JSON(), nullable=True),
        )
    if "config_template" not in node_columns:
        op.add_column(
            "nodes",
            sa.Column("config_template", sa.JSON(), nullable=True),
        )

    connection.execute(
        runtime_settings_table.update()
        .where(runtime_settings_table.c.default_node_config.is_(None))
        .values(default_node_config=template)
    )
    connection.execute(
        nodes_table.update()
        .where(nodes_table.c.config_template.is_(None))
        .values(config_template=template)
    )

    with op.batch_alter_table("runtime_settings") as batch_op:
        batch_op.alter_column(
            "default_node_config",
            existing_type=sa.JSON(),
            existing_nullable=True,
            nullable=False,
        )
    with op.batch_alter_table("nodes") as batch_op:
        batch_op.alter_column(
            "config_template",
            existing_type=sa.JSON(),
            existing_nullable=True,
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("nodes") as batch_op:
        batch_op.drop_column("config_template")
    with op.batch_alter_table("runtime_settings") as batch_op:
        batch_op.drop_column("default_node_config")
