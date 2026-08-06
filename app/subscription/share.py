import base64
import random
import secrets
from collections import defaultdict
from datetime import datetime as dt
from datetime import timedelta
from typing import TYPE_CHECKING, List, Literal, Optional, Sequence, Union

from jdatetime import date as jd

from app.models.proxy import ProxyHostSecurity
from app.utils.system import get_public_ip, get_public_ipv6, readable_size

from . import *

if TYPE_CHECKING:
    from app.models.user import UserResponse

SERVER_IP = get_public_ip()
SERVER_IPV6 = get_public_ipv6()

STATUS_EMOJIS = {
    "active": "✅",
    "expired": "⌛️",
    "limited": "🪫",
    "disabled": "❌",
    "on_hold": "🔌",
}

def get_status_texts() -> dict:
    from app.utils.runtime_settings import get_runtime_settings

    settings = get_runtime_settings()
    return {
        "active": settings.active_status_text,
        "expired": settings.expired_status_text,
        "limited": settings.limited_status_text,
        "disabled": settings.disabled_status_text,
        "on_hold": settings.onhold_status_text,
    }


def generate_v2ray_links(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        reverse: bool,
        hosts_by_inbound: Optional[dict] = None,
) -> list:
    format_variables = setup_format_variables(extra_data)
    conf = V2rayShareLink()
    return process_inbounds_and_tags(
        inbounds, proxies, format_variables, conf=conf, reverse=reverse, hosts_by_inbound=hosts_by_inbound
    )


def generate_clash_subscription(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        reverse: bool,
        is_meta: bool = False,
        hosts_by_inbound: Optional[dict] = None,
) -> str:
    if is_meta is True:
        conf = ClashMetaConfiguration()
    else:
        conf = ClashConfiguration()

    format_variables = setup_format_variables(extra_data)
    return process_inbounds_and_tags(
        inbounds, proxies, format_variables, conf=conf, reverse=reverse, hosts_by_inbound=hosts_by_inbound
    )


def generate_singbox_subscription(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        reverse: bool,
        hosts_by_inbound: Optional[dict] = None,
) -> str:
    conf = SingBoxConfiguration()

    format_variables = setup_format_variables(extra_data)
    return process_inbounds_and_tags(
        inbounds, proxies, format_variables, conf=conf, reverse=reverse, hosts_by_inbound=hosts_by_inbound
    )


def generate_outline_subscription(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        reverse: bool,
        hosts_by_inbound: Optional[dict] = None,
) -> str:
    conf = OutlineConfiguration()

    format_variables = setup_format_variables(extra_data)
    return process_inbounds_and_tags(
        inbounds, proxies, format_variables, conf=conf, reverse=reverse, hosts_by_inbound=hosts_by_inbound
    )


def generate_v2ray_json_subscription(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        reverse: bool,
        hosts_by_inbound: Optional[dict] = None,
) -> str:
    conf = V2rayJsonConfig()

    format_variables = setup_format_variables(extra_data)
    return process_inbounds_and_tags(
        inbounds, proxies, format_variables, conf=conf, reverse=reverse, hosts_by_inbound=hosts_by_inbound
    )


def generate_subscription(
        user: "UserResponse",
        config_format: Literal["v2ray", "clash-meta", "clash", "sing-box", "outline", "v2ray-json"],
        as_base64: bool,
        reverse: bool,
) -> str:
    return generate_subscription_config(
        proxies=user.proxies,
        inbounds=user.inbounds,
        extra_data=user.__dict__,
        config_format=config_format,
        as_base64=as_base64,
        reverse=reverse,
    )


def generate_subscription_from_hosts(
        user: "UserResponse",
        hosts: Sequence,
        config_format: Literal["v2ray", "clash-meta", "clash", "sing-box", "outline", "v2ray-json"],
        as_base64: bool,
        reverse: bool,
) -> str:
    hosts_by_inbound = build_subscription_hosts_by_inbound(hosts)
    inbounds = filter_subscription_inbounds_by_hosts(user.inbounds, hosts_by_inbound)
    return generate_subscription_config(
        proxies=user.proxies,
        inbounds=inbounds,
        extra_data=user.__dict__,
        config_format=config_format,
        as_base64=as_base64,
        reverse=reverse,
        hosts_by_inbound=hosts_by_inbound,
    )


def generate_subscription_config(
        proxies: dict,
        inbounds: dict,
        extra_data: dict,
        config_format: Literal["v2ray", "clash-meta", "clash", "sing-box", "outline", "v2ray-json"],
        as_base64: bool,
        reverse: bool,
        hosts_by_inbound: Optional[dict] = None,
) -> str:
    kwargs = {
        "proxies": proxies,
        "inbounds": inbounds,
        "extra_data": extra_data,
        "reverse": reverse,
        "hosts_by_inbound": hosts_by_inbound,
    }

    if config_format == "v2ray":
        config = "\n".join(generate_v2ray_links(**kwargs))
    elif config_format == "clash-meta":
        config = generate_clash_subscription(**kwargs, is_meta=True)
    elif config_format == "clash":
        config = generate_clash_subscription(**kwargs)
    elif config_format == "sing-box":
        config = generate_singbox_subscription(**kwargs)
    elif config_format == "outline":
        config = generate_outline_subscription(**kwargs)
    elif config_format == "v2ray-json":
        config = generate_v2ray_json_subscription(**kwargs)
    else:
        raise ValueError(f'Unsupported format "{config_format}"')

    if as_base64:
        config = base64.b64encode(config.encode()).decode()

    return config


def build_subscription_hosts_by_inbound(hosts: Sequence) -> dict:
    hosts_by_inbound = defaultdict(list)
    for host in hosts:
        if host.is_disabled:
            continue
        inbound_tag = host.inbound_tag
        if not inbound_tag:
            continue

        hosts_by_inbound[inbound_tag].append(
            {
                "id": host.id,
                "position": host.position,
                "remark": host.remark,
                "address": [item.strip() for item in host.address.split(",")] if host.address else [],
                "port": host.port,
                "path": host.path if host.path else None,
                "sni": [item.strip() for item in host.sni.split(",")] if host.sni else [],
                "host": [item.strip() for item in host.host.split(",")] if host.host else [],
                "alpn": _enum_value(host.alpn),
                "fingerprint": _enum_value(host.fingerprint),
                "tls": _host_tls_value(host.security),
                "allowinsecure": host.allowinsecure,
                "mux_enable": host.mux_enable,
                "fragment_setting": host.fragment_setting,
                "noise_setting": host.noise_setting,
                "random_user_agent": host.random_user_agent,
                "use_sni_as_host": host.use_sni_as_host,
                "scMaxBufferedPosts": host.sc_max_buffered_posts,
                "xPaddingObfsMode": host.x_padding_obfs_mode,
                "uplinkHTTPMethod": host.uplink_http_method,
            }
        )
    return dict(hosts_by_inbound)


def filter_subscription_inbounds_by_hosts(inbounds: dict, hosts_by_inbound: dict) -> dict:
    available_inbound_tags = set(hosts_by_inbound)
    return {
        protocol: [
            tag for tag in tags
            if tag in available_inbound_tags
        ]
        for protocol, tags in inbounds.items()
        if any(tag in available_inbound_tags for tag in tags)
    }


def _enum_value(value):
    return getattr(value, "value", value)


def _host_tls_value(security):
    if security == ProxyHostSecurity.inbound_default:
        return None
    return _enum_value(security)


def format_time_left(seconds_left: int) -> str:
    if not seconds_left or seconds_left <= 0:
        return "∞"

    minutes, seconds = divmod(seconds_left, 60)
    hours, minutes = divmod(minutes, 60)
    days, hours = divmod(hours, 24)
    months, days = divmod(days, 30)

    result = []
    if months:
        result.append(f"{months}m")
    if days:
        result.append(f"{days}d")
    if hours and (days < 7):
        result.append(f"{hours}h")
    if minutes and not (months or days):
        result.append(f"{minutes}m")
    if seconds and not (months or days):
        result.append(f"{seconds}s")
    return " ".join(result)


def setup_format_variables(extra_data: dict) -> dict:
    from app.models.user import UserStatus

    user_status = extra_data.get("status")
    expire_timestamp = extra_data.get("expire")
    on_hold_expire_duration = extra_data.get("on_hold_expire_duration")
    now = dt.utcnow()
    now_ts = now.timestamp()

    if user_status != UserStatus.on_hold:
        if expire_timestamp is not None and expire_timestamp >= 0:
            seconds_left = expire_timestamp - int(dt.utcnow().timestamp())
            expire_datetime = dt.fromtimestamp(expire_timestamp)
            expire_date = expire_datetime.date()
            jalali_expire_date = jd.fromgregorian(
                year=expire_date.year, month=expire_date.month, day=expire_date.day
            ).strftime("%Y-%m-%d")
            if now_ts < expire_timestamp:
                days_left = (expire_datetime - dt.utcnow()).days + 1
                time_left = format_time_left(seconds_left)
            else:
                days_left = "0"
                time_left = "0"

        else:
            days_left = "∞"
            time_left = "∞"
            expire_date = "∞"
            jalali_expire_date = "∞"
    else:
        if on_hold_expire_duration is not None and on_hold_expire_duration >= 0:
            days_left = timedelta(seconds=on_hold_expire_duration).days
            time_left = format_time_left(on_hold_expire_duration)
            expire_date = "-"
            jalali_expire_date = "-"
        else:
            days_left = "∞"
            time_left = "∞"
            expire_date = "∞"
            jalali_expire_date = "∞"

    if extra_data.get("data_limit"):
        data_limit = readable_size(extra_data["data_limit"])
        data_left = extra_data["data_limit"] - extra_data["used_traffic"]
        if data_left < 0:
            data_left = 0
        data_left = readable_size(data_left)
    else:
        data_limit = "∞"
        data_left = "∞"

    status_emoji = STATUS_EMOJIS.get(extra_data.get("status")) or ""
    status_text = get_status_texts().get(extra_data.get("status")) or ""

    format_variables = defaultdict(
        lambda: "<missing>",
        {
            "SERVER_IP": SERVER_IP,
            "SERVER_IPV6": SERVER_IPV6,
            "USERNAME": extra_data.get("username", "{USERNAME}"),
            "DATA_USAGE": readable_size(extra_data.get("used_traffic")),
            "DATA_LIMIT": data_limit,
            "DATA_LEFT": data_left,
            "DAYS_LEFT": days_left,
            "EXPIRE_DATE": expire_date,
            "JALALI_EXPIRE_DATE": jalali_expire_date,
            "TIME_LEFT": time_left,
            "STATUS_EMOJI": status_emoji,
            "STATUS_TEXT": status_text,
        },
    )

    return format_variables


def _host_order_value(value):
    return value if value is not None else float("inf")


def _filter_balanced_hosts_for_unsupported_clients(
        endpoint_records: list[dict],
        active_balancers: Sequence,
        supports_balancers: bool,
) -> list[dict]:
    if supports_balancers:
        return endpoint_records

    balanced_host_ids = {
        host_id
        for balancer in active_balancers
        for host_id in balancer.host_ids
    }
    if not balanced_host_ids:
        return endpoint_records

    return [
        record for record in endpoint_records
        if record["host_id"] not in balanced_host_ids
    ]


def process_inbounds_and_tags(
        inbounds: dict,
        proxies: dict,
        format_variables: dict,
        conf: Union[
            V2rayShareLink,
            V2rayJsonConfig,
            SingBoxConfiguration,
            ClashConfiguration,
            ClashMetaConfiguration,
            OutlineConfiguration
        ],
        reverse=False,
        hosts_by_inbound: Optional[dict] = None,
) -> Union[List, str]:
    from app.db import GetDB
    from app.db.crud import proxy_hosts as host_crud
    from app.utils.xray_config_registry import get_enabled_inbound_registry

    with GetDB() as db:
        registry = get_enabled_inbound_registry(db)
        from app.db.crud import subscription_balancers as balancer_crud

        active_balancers = [
            balancer
            for balancer in balancer_crud.get_subscription_balancers(db)
            if balancer.enabled
        ]
        if hosts_by_inbound is None:
            host_source = build_subscription_hosts_by_inbound(host_crud.get_hosts_v2(db))
        else:
            host_source = hosts_by_inbound
    inbound_order = {
        tag: index for index, tag in enumerate(registry.inbounds_by_tag.keys())
    }
    targets = []
    sequence = 0
    for protocol, tags in inbounds.items():
        settings = proxies.get(protocol)
        if not settings:
            continue

        for tag in tags:
            inbound = registry.inbounds_by_tag.get(tag)
            if not inbound:
                continue

            for host_index, host in enumerate(host_source.get(tag, [])):
                targets.append(
                    (
                        _host_order_value(host.get("position")),
                        _host_order_value(host.get("id")),
                        inbound_order.get(tag, float("inf")),
                        host_index,
                        sequence,
                        protocol,
                        inbound,
                        host,
                        settings,
                    )
                )
                sequence += 1

    endpoint_records = []
    for _, _, _, _, _, protocol, inbound, host, settings in sorted(targets):
        format_variables.update({"PROTOCOL": getattr(protocol, "name", protocol)})
        format_variables.update({"TRANSPORT": inbound["network"]})
        host_inbound = inbound.copy()

        sni = ""
        sni_list = host["sni"] or inbound["sni"]
        if sni_list:
            salt = secrets.token_hex(8)
            sni = random.choice(sni_list).replace("*", salt)

        if sids := inbound.get("sids"):
            host_inbound["sid"] = random.choice(sids)

        req_host = ""
        req_host_list = host["host"] or inbound["host"]
        if req_host_list:
            salt = secrets.token_hex(8)
            req_host = random.choice(req_host_list).replace("*", salt)

        address = ""
        address_list = host['address']
        if host['address']:
            salt = secrets.token_hex(8)
            address = random.choice(address_list).replace('*', salt)

        if host["path"] is not None:
            path = host["path"].format_map(format_variables)
        else:
            path = inbound.get("path", "").format_map(format_variables)

        if host.get("use_sni_as_host", False) and sni:
            req_host = sni

        host_inbound.update(
            {
                "port": host["port"] or inbound["port"],
                "sni": sni,
                "host": req_host,
                "tls": inbound["tls"] if host["tls"] is None else host["tls"],
                "alpn": host["alpn"] or inbound.get("alpn", ""),
                "path": path,
                "fp": host["fingerprint"] or inbound.get("fp", ""),
                "ais": host["allowinsecure"] or inbound.get("allowinsecure", ""),
                "mux_enable": host["mux_enable"],
                "fragment_setting": host["fragment_setting"],
                "noise_setting": host["noise_setting"],
                "random_user_agent": host["random_user_agent"],
            }
        )
        for setting_name in ("scMaxBufferedPosts", "xPaddingObfsMode", "uplinkHTTPMethod"):
            if host[setting_name] is not None:
                host_inbound[setting_name] = host[setting_name]

        endpoint_records.append(
            {
                "host_id": host["id"],
                "remark": host["remark"].format_map(format_variables),
                "address": address.format_map(format_variables),
                "inbound": host_inbound,
                "settings": settings.model_dump(),
            }
        )

    supports_balancers = isinstance(
        conf, (V2rayJsonConfig, SingBoxConfiguration, ClashConfiguration, ClashMetaConfiguration)
    )
    endpoint_records = _filter_balanced_hosts_for_unsupported_clients(
        endpoint_records,
        active_balancers,
        supports_balancers,
    )
    profile_records = []
    if supports_balancers:
        for balancer in active_balancers:
            selected_host_ids = set(balancer.host_ids)
            records = [
                record for record in endpoint_records if record["host_id"] in selected_host_ids
            ]
            if records:
                profile_records.append((balancer, records))

    def add_endpoint(configuration, record, **kwargs):
        return configuration.add(
            remark=record["remark"],
            address=record["address"],
            inbound=record["inbound"],
            settings=record["settings"],
            **kwargs,
        )

    if isinstance(conf, V2rayJsonConfig):
        assigned_host_ids = set()
        for balancer, records in profile_records:
            added = conf.add_balancer_config(
                balancer_id=balancer.id,
                name=balancer.name,
                strategy=balancer.strategy,
                probe_url=balancer.probe_url,
                probe_interval=balancer.probe_interval,
                endpoints=records,
            )
            if added:
                assigned_host_ids.update(record["host_id"] for record in records)
        for record in endpoint_records:
            if record["host_id"] not in assigned_host_ids:
                add_endpoint(conf, record)
    elif isinstance(conf, SingBoxConfiguration):
        endpoint_tags = {}
        for record in endpoint_records:
            endpoint_tags[record["host_id"]] = add_endpoint(
                conf,
                record,
                include_in_default=True,
            )
        assigned_tags = set()
        for balancer, records in profile_records:
            tags = [endpoint_tags[record["host_id"]] for record in records if endpoint_tags.get(record["host_id"])]
            if tags:
                conf.add_balancer(
                    balancer.name, tags, balancer.probe_url, balancer.probe_interval
                )
                assigned_tags.update(tags)
        conf.default_proxy_remarks = [
            tag for tag in conf.default_proxy_remarks if tag not in assigned_tags
        ]
    elif isinstance(conf, ClashConfiguration):
        endpoint_tags = {}
        for record in endpoint_records:
            endpoint_tags[record["host_id"]] = add_endpoint(
                conf,
                record,
                include_in_default=True,
            )
        assigned_tags = set()
        for balancer, records in profile_records:
            tags = [endpoint_tags[record["host_id"]] for record in records if endpoint_tags.get(record["host_id"])]
            if tags:
                conf.add_balancer(
                    balancer.name,
                    tags,
                    balancer.probe_url,
                    balancer.probe_interval,
                    balancer.strategy,
                )
                assigned_tags.update(tags)
        conf.default_proxy_remarks = [
            tag for tag in conf.default_proxy_remarks if tag not in assigned_tags
        ]
    else:
        for record in endpoint_records:
            add_endpoint(conf, record)

    return conf.render(reverse=reverse)


def encode_title(text: str) -> str:
    return f"base64:{base64.b64encode(text.encode()).decode()}"
