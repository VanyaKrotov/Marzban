"""add runtime settings

Revision ID: 13b4f0f7c9a1
Revises: 7c0e4b9d1a22
Create Date: 2026-06-18 00:00:00.000000

"""

from pathlib import Path

import sqlalchemy as sa
from alembic import op

from config import (
    ACTIVE_STATUS_TEXT,
    CLASH_SETTINGS_TEMPLATE,
    CLASH_SUBSCRIPTION_TEMPLATE,
    CUSTOM_TEMPLATES_DIRECTORY,
    DISABLED_STATUS_TEXT,
    EXPIRED_STATUS_TEXT,
    EXTERNAL_CONFIG,
    GRPC_USER_AGENT_TEMPLATE,
    LIMITED_STATUS_TEXT,
    LOGIN_NOTIFY_WHITE_LIST,
    MUX_TEMPLATE,
    NOTIFY_DAYS_LEFT,
    NOTIFY_IF_DATA_USAGE_PERCENT_REACHED,
    NOTIFY_IF_DAYS_LEFT_REACHED,
    NOTIFY_LOGIN,
    NOTIFY_REACHED_USAGE_PERCENT,
    NOTIFY_STATUS_CHANGE,
    NOTIFY_USER_CREATED,
    NOTIFY_USER_DATA_USED_RESET,
    NOTIFY_USER_DELETED,
    NOTIFY_USER_SUB_REVOKED,
    NOTIFY_USER_UPDATED,
    NUMBER_OF_RECURRENT_NOTIFICATIONS,
    ONHOLD_STATUS_TEXT,
    RECURRENT_NOTIFICATIONS_TIMEOUT,
    SINGBOX_SETTINGS_TEMPLATE,
    SINGBOX_SUBSCRIPTION_TEMPLATE,
    SUB_PROFILE_TITLE,
    SUB_SUPPORT_URL,
    SUB_UPDATE_INTERVAL,
    USER_AGENT_TEMPLATE,
    USE_CUSTOM_JSON_DEFAULT,
    USE_CUSTOM_JSON_FOR_HAPP,
    USE_CUSTOM_JSON_FOR_STREISAND,
    USE_CUSTOM_JSON_FOR_V2RAYN,
    USE_CUSTOM_JSON_FOR_V2RAYNG,
    V2RAY_SETTINGS_TEMPLATE,
    V2RAY_SUBSCRIPTION_TEMPLATE,
    WEBHOOK_ADDRESS,
    WEBHOOK_SECRET,
)


revision = "13b4f0f7c9a1"
down_revision = "7c0e4b9d1a22"
branch_labels = None
depends_on = None


APP_DIR = Path(__file__).resolve().parents[3]
DEFAULT_TEMPLATE_DIR = APP_DIR / "templates"

SUBSCRIPTION_TEMPLATE_DEFAULTS = {
    "clash_subscription": ("yaml", CLASH_SUBSCRIPTION_TEMPLATE),
    "clash_settings": ("yaml", CLASH_SETTINGS_TEMPLATE),
    "singbox_subscription": ("json", SINGBOX_SUBSCRIPTION_TEMPLATE),
    "singbox_settings": ("json", SINGBOX_SETTINGS_TEMPLATE),
    "v2ray_subscription": ("json", V2RAY_SUBSCRIPTION_TEMPLATE),
    "v2ray_settings": ("json", V2RAY_SETTINGS_TEMPLATE),
    "mux": ("json", MUX_TEMPLATE),
    "user_agent": ("json", USER_AGENT_TEMPLATE),
    "grpc_user_agent": ("json", GRPC_USER_AGENT_TEMPLATE),
}


def _read_template(template_name: str, template_format: str) -> str:
    template_paths = []
    if CUSTOM_TEMPLATES_DIRECTORY:
        template_paths.append(Path(CUSTOM_TEMPLATES_DIRECTORY) / template_name)
    template_paths.append(DEFAULT_TEMPLATE_DIR / template_name)

    for path in template_paths:
        if path.is_file():
            return path.read_text(encoding="utf-8")
    return "{}" if template_format == "json" else ""


def upgrade():
    op.create_table(
        "runtime_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sub_profile_title", sa.String(length=256), server_default="Subscription", nullable=False),
        sa.Column("sub_support_url", sa.String(length=2048), server_default="https://t.me/", nullable=False),
        sa.Column("sub_update_interval", sa.String(length=32), server_default="12", nullable=False),
        sa.Column("external_config", sa.Text(), nullable=False),
        sa.Column("use_custom_json_default", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("use_custom_json_for_v2rayn", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("use_custom_json_for_v2rayng", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("use_custom_json_for_streisand", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("use_custom_json_for_happ", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("active_status_text", sa.String(length=128), server_default="Active", nullable=False),
        sa.Column("expired_status_text", sa.String(length=128), server_default="Expired", nullable=False),
        sa.Column("limited_status_text", sa.String(length=128), server_default="Limited", nullable=False),
        sa.Column("disabled_status_text", sa.String(length=128), server_default="Disabled", nullable=False),
        sa.Column("onhold_status_text", sa.String(length=128), server_default="On-Hold", nullable=False),
        sa.Column("notify_status_change", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_user_created", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_user_updated", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_user_deleted", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_user_data_used_reset", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_user_sub_revoked", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_if_data_usage_percent_reached", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_if_days_left_reached", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_login", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("notify_days_left", sa.JSON(), nullable=False),
        sa.Column("notify_reached_usage_percent", sa.JSON(), nullable=False),
        sa.Column("login_notify_white_list", sa.JSON(), nullable=False),
        sa.Column("webhook_addresses", sa.JSON(), nullable=False),
        sa.Column("webhook_secret", sa.String(length=2048), nullable=True),
        sa.Column("recurrent_notifications_timeout", sa.Integer(), server_default="180", nullable=False),
        sa.Column("number_of_recurrent_notifications", sa.Integer(), server_default="3", nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "subscription_templates",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    runtime_settings = sa.table(
        "runtime_settings",
        sa.column("id", sa.Integer),
        sa.column("sub_profile_title", sa.String),
        sa.column("sub_support_url", sa.String),
        sa.column("sub_update_interval", sa.String),
        sa.column("external_config", sa.Text),
        sa.column("use_custom_json_default", sa.Boolean),
        sa.column("use_custom_json_for_v2rayn", sa.Boolean),
        sa.column("use_custom_json_for_v2rayng", sa.Boolean),
        sa.column("use_custom_json_for_streisand", sa.Boolean),
        sa.column("use_custom_json_for_happ", sa.Boolean),
        sa.column("active_status_text", sa.String),
        sa.column("expired_status_text", sa.String),
        sa.column("limited_status_text", sa.String),
        sa.column("disabled_status_text", sa.String),
        sa.column("onhold_status_text", sa.String),
        sa.column("notify_status_change", sa.Boolean),
        sa.column("notify_user_created", sa.Boolean),
        sa.column("notify_user_updated", sa.Boolean),
        sa.column("notify_user_deleted", sa.Boolean),
        sa.column("notify_user_data_used_reset", sa.Boolean),
        sa.column("notify_user_sub_revoked", sa.Boolean),
        sa.column("notify_if_data_usage_percent_reached", sa.Boolean),
        sa.column("notify_if_days_left_reached", sa.Boolean),
        sa.column("notify_login", sa.Boolean),
        sa.column("notify_days_left", sa.JSON),
        sa.column("notify_reached_usage_percent", sa.JSON),
        sa.column("login_notify_white_list", sa.JSON),
        sa.column("webhook_addresses", sa.JSON),
        sa.column("webhook_secret", sa.String),
        sa.column("recurrent_notifications_timeout", sa.Integer),
        sa.column("number_of_recurrent_notifications", sa.Integer),
    )
    op.bulk_insert(
        runtime_settings,
        [{
            "id": 1,
            "sub_profile_title": SUB_PROFILE_TITLE,
            "sub_support_url": SUB_SUPPORT_URL,
            "sub_update_interval": SUB_UPDATE_INTERVAL,
            "external_config": EXTERNAL_CONFIG,
            "use_custom_json_default": USE_CUSTOM_JSON_DEFAULT,
            "use_custom_json_for_v2rayn": USE_CUSTOM_JSON_FOR_V2RAYN,
            "use_custom_json_for_v2rayng": USE_CUSTOM_JSON_FOR_V2RAYNG,
            "use_custom_json_for_streisand": USE_CUSTOM_JSON_FOR_STREISAND,
            "use_custom_json_for_happ": USE_CUSTOM_JSON_FOR_HAPP,
            "active_status_text": ACTIVE_STATUS_TEXT,
            "expired_status_text": EXPIRED_STATUS_TEXT,
            "limited_status_text": LIMITED_STATUS_TEXT,
            "disabled_status_text": DISABLED_STATUS_TEXT,
            "onhold_status_text": ONHOLD_STATUS_TEXT,
            "notify_status_change": NOTIFY_STATUS_CHANGE,
            "notify_user_created": NOTIFY_USER_CREATED,
            "notify_user_updated": NOTIFY_USER_UPDATED,
            "notify_user_deleted": NOTIFY_USER_DELETED,
            "notify_user_data_used_reset": NOTIFY_USER_DATA_USED_RESET,
            "notify_user_sub_revoked": NOTIFY_USER_SUB_REVOKED,
            "notify_if_data_usage_percent_reached": NOTIFY_IF_DATA_USAGE_PERCENT_REACHED,
            "notify_if_days_left_reached": NOTIFY_IF_DAYS_LEFT_REACHED,
            "notify_login": NOTIFY_LOGIN,
            "notify_days_left": NOTIFY_DAYS_LEFT,
            "notify_reached_usage_percent": NOTIFY_REACHED_USAGE_PERCENT,
            "login_notify_white_list": LOGIN_NOTIFY_WHITE_LIST,
            "webhook_addresses": WEBHOOK_ADDRESS,
            "webhook_secret": WEBHOOK_SECRET,
            "recurrent_notifications_timeout": RECURRENT_NOTIFICATIONS_TIMEOUT,
            "number_of_recurrent_notifications": NUMBER_OF_RECURRENT_NOTIFICATIONS,
        }],
    )

    subscription_templates = sa.table(
        "subscription_templates",
        sa.column("key", sa.String),
        sa.column("format", sa.String),
        sa.column("content", sa.Text),
    )
    op.bulk_insert(
        subscription_templates,
        [
            {
                "key": key,
                "format": template_format,
                "content": _read_template(template_name, template_format),
            }
            for key, (template_format, template_name) in SUBSCRIPTION_TEMPLATE_DEFAULTS.items()
        ],
    )


def downgrade():
    op.drop_table("subscription_templates")
    op.drop_table("runtime_settings")
