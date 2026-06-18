from functools import lru_cache
from typing import Iterable

from jinja2.exceptions import TemplateNotFound
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import GetDB
from app.db.models import RuntimeSettings as DBRuntimeSettings
from app.db.models import SubscriptionTemplate as DBSubscriptionTemplate
from app.models.settings import (
    RuntimeSettings,
    RuntimeSettingsModify,
    RuntimeSettingsResponse,
    SubscriptionTemplate,
)
from app.templates import env
from config import (
    ACTIVE_STATUS_TEXT,
    CLASH_SETTINGS_TEMPLATE,
    CLASH_SUBSCRIPTION_TEMPLATE,
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


def clear_runtime_settings_cache() -> None:
    get_runtime_settings.cache_clear()
    get_subscription_templates.cache_clear()
    get_subscription_template.cache_clear()


def build_default_runtime_settings() -> RuntimeSettings:
    return RuntimeSettings(
        sub_profile_title=SUB_PROFILE_TITLE,
        sub_support_url=SUB_SUPPORT_URL,
        sub_update_interval=SUB_UPDATE_INTERVAL,
        external_config=EXTERNAL_CONFIG,
        use_custom_json_default=USE_CUSTOM_JSON_DEFAULT,
        use_custom_json_for_v2rayn=USE_CUSTOM_JSON_FOR_V2RAYN,
        use_custom_json_for_v2rayng=USE_CUSTOM_JSON_FOR_V2RAYNG,
        use_custom_json_for_streisand=USE_CUSTOM_JSON_FOR_STREISAND,
        use_custom_json_for_happ=USE_CUSTOM_JSON_FOR_HAPP,
        active_status_text=ACTIVE_STATUS_TEXT,
        expired_status_text=EXPIRED_STATUS_TEXT,
        limited_status_text=LIMITED_STATUS_TEXT,
        disabled_status_text=DISABLED_STATUS_TEXT,
        onhold_status_text=ONHOLD_STATUS_TEXT,
        notify_status_change=NOTIFY_STATUS_CHANGE,
        notify_user_created=NOTIFY_USER_CREATED,
        notify_user_updated=NOTIFY_USER_UPDATED,
        notify_user_deleted=NOTIFY_USER_DELETED,
        notify_user_data_used_reset=NOTIFY_USER_DATA_USED_RESET,
        notify_user_sub_revoked=NOTIFY_USER_SUB_REVOKED,
        notify_if_data_usage_percent_reached=NOTIFY_IF_DATA_USAGE_PERCENT_REACHED,
        notify_if_days_left_reached=NOTIFY_IF_DAYS_LEFT_REACHED,
        notify_login=NOTIFY_LOGIN,
        notify_days_left=NOTIFY_DAYS_LEFT,
        notify_reached_usage_percent=NOTIFY_REACHED_USAGE_PERCENT,
        login_notify_white_list=LOGIN_NOTIFY_WHITE_LIST,
        webhook_addresses=WEBHOOK_ADDRESS,
        webhook_secret=WEBHOOK_SECRET,
        recurrent_notifications_timeout=RECURRENT_NOTIFICATIONS_TIMEOUT,
        number_of_recurrent_notifications=NUMBER_OF_RECURRENT_NOTIFICATIONS,
    )


def runtime_settings_response(settings: RuntimeSettings) -> RuntimeSettingsResponse:
    data = settings.model_dump(exclude={"webhook_secret"})
    data["webhook_secret_set"] = bool(settings.webhook_secret)
    return RuntimeSettingsResponse(**data)


def _get_or_create_settings(db: Session) -> DBRuntimeSettings:
    db_settings = db.get(DBRuntimeSettings, 1)
    if db_settings:
        return db_settings

    defaults = build_default_runtime_settings()
    db_settings = DBRuntimeSettings(id=1, **defaults.model_dump())
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings


@lru_cache(maxsize=1)
def get_runtime_settings() -> RuntimeSettings:
    try:
        with GetDB() as db:
            return RuntimeSettings.model_validate(_get_or_create_settings(db))
    except SQLAlchemyError:
        return build_default_runtime_settings()


def update_runtime_settings(db: Session, payload: RuntimeSettingsModify) -> RuntimeSettings:
    db_settings = _get_or_create_settings(db)
    updates = payload.model_dump(exclude_unset=True, exclude={"clear_webhook_secret"})

    if "webhook_secret" not in updates:
        updates["webhook_secret"] = db_settings.webhook_secret
    if payload.clear_webhook_secret:
        updates["webhook_secret"] = None

    current = RuntimeSettings.model_validate(db_settings).model_dump()
    current.update(updates)
    validated = RuntimeSettings(**current)

    for key, value in validated.model_dump().items():
        setattr(db_settings, key, value)

    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    clear_runtime_settings_cache()
    return RuntimeSettings.model_validate(db_settings)


def default_subscription_template_content(template_name: str) -> str:
    source, _, _ = env.loader.get_source(env, template_name)
    return source


def build_default_subscription_templates() -> list[SubscriptionTemplate]:
    templates = []
    for key, (template_format, template_name) in SUBSCRIPTION_TEMPLATE_DEFAULTS.items():
        try:
            content = default_subscription_template_content(template_name)
        except TemplateNotFound:
            content = "{}" if template_format == "json" else ""
        templates.append(SubscriptionTemplate(key=key, format=template_format, content=content))
    return templates


def ensure_subscription_templates(db: Session) -> None:
    existing = {item.key for item in db.query(DBSubscriptionTemplate.key).all()}
    for template in build_default_subscription_templates():
        if template.key in existing:
            continue
        db.add(DBSubscriptionTemplate(**template.model_dump()))
    db.commit()


@lru_cache(maxsize=1)
def get_subscription_templates() -> tuple[SubscriptionTemplate, ...]:
    try:
        with GetDB() as db:
            ensure_subscription_templates(db)
            templates = db.query(DBSubscriptionTemplate).order_by(DBSubscriptionTemplate.key).all()
            return tuple(SubscriptionTemplate.model_validate(template) for template in templates)
    except SQLAlchemyError:
        return tuple(build_default_subscription_templates())


@lru_cache(maxsize=None)
def get_subscription_template(key: str) -> str:
    for template in get_subscription_templates():
        if template.key == key:
            return template.content
    template_format, template_name = SUBSCRIPTION_TEMPLATE_DEFAULTS[key]
    del template_format
    return default_subscription_template_content(template_name)


def update_subscription_template(db: Session, key: str, content: str) -> SubscriptionTemplate:
    if key not in SUBSCRIPTION_TEMPLATE_DEFAULTS:
        raise KeyError(key)
    template_format, _ = SUBSCRIPTION_TEMPLATE_DEFAULTS[key]
    validated = SubscriptionTemplate(key=key, format=template_format, content=content)
    db_template = db.get(DBSubscriptionTemplate, key)
    if db_template:
        db_template.content = validated.content
        db_template.format = validated.format
    else:
        db_template = DBSubscriptionTemplate(**validated.model_dump())
        db.add(db_template)
    db.commit()
    db.refresh(db_template)
    clear_runtime_settings_cache()
    return SubscriptionTemplate.model_validate(db_template)


def get_subscription_template_map(keys: Iterable[str] | None = None) -> dict[str, SubscriptionTemplate]:
    templates = {template.key: template for template in get_subscription_templates()}
    if keys is None:
        return templates
    return {key: templates[key] for key in keys if key in templates}
