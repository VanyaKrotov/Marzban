from __future__ import annotations

import json
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import PosixPath
from typing import Any, Union

import commentjson
from sqlalchemy import func, inspect, text

from app.db import GetDB
from app.db.models.associations import excluded_inbounds_association
from app.db.models.nodes import Node
from app.db.models.proxies import Proxy
from app.db.models.users import User
from app.db.base import engine
from app.models.proxy import ACCOUNT_PROTOCOLS, ProxyTypes, XRAY_INBOUND_PROTOCOLS
from app.models.settings import default_node_config
from app.models.user import UserStatus
from app.utils.crypto import get_cert_SANs
from config import DEBUG, XRAY_EXCLUDE_INBOUND_TAGS, XRAY_FALLBACKS_INBOUND_TAG


def merge_dicts(a, b):  # B will override A dictionary key and values
    for key, value in b.items():
        if isinstance(value, dict) and key in a and isinstance(a[key], dict):
            merge_dicts(a[key], value)  # Recursively merge nested dictionaries
        else:
            a[key] = value
    return a


def _coerce_config_payload(config: Union[dict, str, PosixPath]) -> dict:
    if isinstance(config, dict):
        return deepcopy(config)

    path = str(config)
    try:
        payload = commentjson.loads(path)
    except (json.JSONDecodeError, ValueError):
        with open(path, "r", encoding="utf-8") as config_file:
            payload = commentjson.loads(config_file.read())
    return payload


def _as_json_content(value: Any) -> dict | None:
    if isinstance(value, str):
        value = json.loads(value)
    return deepcopy(value) if isinstance(value, dict) else None


def _merge_managed_configs(payload: dict, node_id: int | None = None) -> None:
    inspector = inspect(engine)

    node_join = ""
    node_where = ""
    params = {}
    if node_id is not None:
        node_join = " JOIN node_inbounds_association nia ON nia.inbound_tag = i.tag"
        node_where = " WHERE nia.node_id = :node_id"
        params["node_id"] = node_id

    inbound_columns = (
        {column["name"] for column in inspector.get_columns("inbounds")}
        if inspector.has_table("inbounds")
        else set()
    )
    if {"content", "enabled"}.issubset(inbound_columns):
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    "SELECT i.tag, i.content, i.enabled FROM inbounds i"
                    f"{node_join}{node_where} ORDER BY i.id"
                ),
                params,
            )
            managed_inbound_tags = set()
            db_inbounds = []
            for tag, content, enabled in rows:
                managed_inbound_tags.add(tag)
                if not enabled:
                    continue
                content = _as_json_content(content)
                if content:
                    content["tag"] = tag
                    db_inbounds.append(content)

        payload["inbounds"] = [
            inbound
            for inbound in payload.get("inbounds", [])
            if inbound.get("tag") not in managed_inbound_tags
            or inbound.get("tag") in XRAY_EXCLUDE_INBOUND_TAGS
        ]
        payload["inbounds"].extend(db_inbounds)

    node_join = ""
    node_where = ""
    params = {}
    if node_id is not None:
        node_join = " JOIN node_outbounds_association noa ON noa.outbound_tag = o.tag"
        node_where = " WHERE noa.node_id = :node_id"
        params["node_id"] = node_id

    outbound_columns = (
        {column["name"] for column in inspector.get_columns("outbounds")}
        if inspector.has_table("outbounds")
        else set()
    )
    if {"content", "enabled"}.issubset(outbound_columns):
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    "SELECT o.tag, o.content, o.enabled FROM outbounds o"
                    f"{node_join}{node_where} ORDER BY o.id"
                ),
                params,
            )
            managed_outbound_tags = set()
            db_outbounds = []
            for tag, content, enabled in rows:
                managed_outbound_tags.add(tag)
                if not enabled:
                    continue
                content = _as_json_content(content)
                if content:
                    content["tag"] = tag
                    db_outbounds.append(content)

        payload["outbounds"] = [
            outbound
            for outbound in payload.get("outbounds", [])
            if outbound.get("tag") not in managed_outbound_tags
        ]
        payload["outbounds"].extend(db_outbounds)

    node_join = ""
    node_where = ""
    params = {}
    if node_id is not None:
        node_join = (
            " JOIN node_routing_rules_association nrra"
            " ON nrra.routing_rule_id = rr.id"
        )
        node_where = " WHERE nrra.node_id = :node_id"
        params["node_id"] = node_id

    routing_rule_columns = (
        {column["name"] for column in inspector.get_columns("routing_rules")}
        if inspector.has_table("routing_rules")
        else set()
    )
    if {"content", "enabled", "position"}.issubset(routing_rule_columns):
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    "SELECT rr.content, rr.enabled FROM routing_rules rr"
                    f"{node_join}{node_where} ORDER BY rr.position, rr.id"
                ),
                params,
            )
            routing_rules = []
            for content, enabled in rows:
                if not enabled:
                    continue
                content = _as_json_content(content)
                if content:
                    routing_rules.append(content)

        if routing_rules or node_id is not None:
            routing = payload.get("routing")
            if not isinstance(routing, dict):
                routing = {}
                payload["routing"] = routing
            routing["rules"] = routing_rules


def load_xray_config(
    config: Union[dict, str, PosixPath],
    api_host: str = "127.0.0.1",
    api_port: int = 8080,
    node_id: int | None = None,
) -> "XRayConfig":
    payload = _coerce_config_payload(config)

    _merge_managed_configs(payload, node_id=node_id)

    return XRayConfig(payload, api_host=api_host, api_port=api_port)


def load_node_xray_config(
    node: Node,
    api_host: str = "127.0.0.1",
    api_port: int | None = None,
) -> "XRayConfig":
    payload = deepcopy(node.config_template or default_node_config())
    log_config = payload.get("log")
    if not isinstance(log_config, dict):
        log_config = {}
        payload["log"] = log_config
    filename = datetime.now(timezone.utc).strftime("%d-%m-%Y.txt")
    for log_type, enabled in (
        ("access", node.access_log_enabled),
        ("error", node.error_log_enabled),
    ):
        if enabled:
            log_config[log_type] = f"/logs/{log_type}/{filename}"
        else:
            log_config.pop(log_type, None)
    return load_xray_config(
        payload,
        api_host=api_host,
        api_port=node.api_port if api_port is None else api_port,
        node_id=node.id,
    )


def get_node_log_settings(node: Node) -> dict:
    return {
        "access_log_enabled": node.access_log_enabled,
        "error_log_enabled": node.error_log_enabled,
        "log_retention_days": node.log_retention_days,
        "log_storage_limit_bytes": node.log_storage_limit_bytes,
    }


class XRayConfig(dict):
    def __init__(self,
                 config: Union[dict, str, PosixPath] = {},
                 api_host: str = "127.0.0.1",
                 api_port: int = 8080,
                 allow_empty_inbounds: bool = False):
        if isinstance(config, str):
            try:
                # considering string as json
                config = commentjson.loads(config)
            except (json.JSONDecodeError, ValueError):
                # considering string as file path
                with open(config, 'r') as file:
                    config = commentjson.loads(file.read())

        if isinstance(config, PosixPath):
            with open(config, 'r') as file:
                config = commentjson.loads(file.read())

        if isinstance(config, dict):
            config = deepcopy(config)

        self.api_host = api_host
        self.api_port = api_port

        super().__init__(config)
        if allow_empty_inbounds and not self.get("inbounds"):
            self["inbounds"] = []
        self._validate(allow_empty_inbounds=allow_empty_inbounds)

        self.inbounds = []
        self.inbounds_by_protocol = {}
        self.inbounds_by_tag = {}
        self._fallbacks_inbound = self.get_inbound(XRAY_FALLBACKS_INBOUND_TAG)
        self._resolve_inbounds()

        self._apply_api()

    def _apply_api(self):
        self._ensure_api_services()

        api_inbound = self.get_inbound("API_INBOUND")
        if api_inbound:
            api_inbound["listen"] = self.api_host
            api_inbound["port"] = self.api_port
            if not isinstance(api_inbound.get("settings"), dict):
                api_inbound["settings"] = {}
            api_inbound["settings"]["address"] = self.api_host
            return

        self["stats"] = {}
        forced_policies = {
            "levels": {
                "0": {
                    "statsUserUplink": True,
                    "statsUserDownlink": True
                }
            },
            "system": {
                "statsInboundDownlink": False,
                "statsInboundUplink": False,
                "statsOutboundDownlink": True,
                "statsOutboundUplink": True
            }
        }
        if self.get("policy"):
            self["policy"] = merge_dicts(self.get("policy"), forced_policies)
        else:
            self["policy"] = forced_policies
        inbound = {
            "listen": self.api_host,
            "port": self.api_port,
            "protocol": "dokodemo-door",
            "settings": {
                "address": self.api_host
            },
            "tag": "API_INBOUND"
        }
        try:
            self["inbounds"].insert(0, inbound)
        except KeyError:
            self["inbounds"] = []
            self["inbounds"].insert(0, inbound)

        rule = {
            "inboundTag": [
                "API_INBOUND"
            ],
            "outboundTag": "API",
            "type": "field"
        }
        try:
            self["routing"]["rules"].insert(0, rule)
        except KeyError:
            self["routing"] = {"rules": []}
            self["routing"]["rules"].insert(0, rule)

    def _ensure_api_services(self):
        api = self.setdefault("api", {})
        api.setdefault("tag", "API")
        services = api.setdefault("services", [])
        for service in (
            "HandlerService",
            "StatsService",
            "LoggerService",
            "RoutingService",
        ):
            if service not in services:
                services.append(service)

    def _validate(self, allow_empty_inbounds: bool = False):
        if not self.get("inbounds") and not allow_empty_inbounds:
            raise ValueError("config doesn't have inbounds")

        if not self.get("outbounds"):
            raise ValueError("config doesn't have outbounds")

        inbound_tags = set()
        for inbound in self['inbounds']:
            tag = inbound.get("tag")
            if not tag:
                raise ValueError("all inbounds must have a tag")
            if tag in inbound_tags:
                raise ValueError("all inbounds must have a unique tag")
            inbound_tags.add(tag)
            if ',' in tag:
                raise ValueError("character «,» is not allowed in inbound tag")
        outbound_tags = set()
        for outbound in self['outbounds']:
            tag = outbound.get("tag")
            if not tag:
                raise ValueError("all outbounds must have a tag")
            if tag in outbound_tags:
                raise ValueError("all outbounds must have a unique tag")
            outbound_tags.add(tag)

    def _resolve_inbounds(self):
        for inbound in self['inbounds']:
            if inbound.get('protocol') not in XRAY_INBOUND_PROTOCOLS:
                continue

            if inbound['tag'] in XRAY_EXCLUDE_INBOUND_TAGS:
                continue

            if not inbound.get('settings'):
                inbound['settings'] = {}
            if inbound["protocol"] == ProxyTypes.Hysteria.value:
                user_container = "users"
            else:
                user_container = "clients"
            is_account_protocol = inbound['protocol'] in ACCOUNT_PROTOCOLS
            if is_account_protocol and not inbound['settings'].get(user_container):
                inbound['settings'][user_container] = []
            settings = {
                "tag": inbound["tag"],
                "protocol": inbound["protocol"],
                "port": None,
                "network": "hysteria" if inbound["protocol"] == ProxyTypes.Hysteria.value else "tcp",
                "tls": 'none',
                "sni": [],
                "host": [],
                "path": "",
                "header_type": "",
                "is_fallback": False,
                "user_container": user_container,
            }

            # port settings
            try:
                settings['port'] = inbound['port']
            except KeyError:
                if self._fallbacks_inbound:
                    try:
                        settings['port'] = self._fallbacks_inbound['port']
                        settings['is_fallback'] = True
                    except KeyError:
                        raise ValueError("fallbacks inbound doesn't have port")

            # stream settings
            if stream := inbound.get('streamSettings'):
                net = stream.get('network', 'tcp')
                settings['network_alias'] = net
                if net == 'websocket':
                    net = 'ws'
                elif net == 'mkcp':
                    net = 'kcp'
                net_settings = stream.get(f"{net}Settings", {})
                if not net_settings and settings.get('network_alias') != net:
                    net_settings = stream.get(f"{settings['network_alias']}Settings", {})
                security = stream.get("security")
                tls_settings = stream.get(f"{security}Settings")

                if settings['is_fallback'] is True:
                    # probably this is a fallback
                    security = self._fallbacks_inbound.get(
                        'streamSettings', {}).get('security')
                    tls_settings = self._fallbacks_inbound.get(
                        'streamSettings', {}).get(f"{security}Settings", {})

                settings['network'] = net

                if security == 'tls':
                    settings['fp'] = tls_settings.get('fingerprint', '')
                    alpn = tls_settings.get('alpn')
                    if isinstance(alpn, list):
                        settings['alpn'] = ','.join(alpn)
                    elif isinstance(alpn, str):
                        settings['alpn'] = alpn
                    settings['tls'] = 'tls'
                    for certificate in tls_settings.get('certificates', []):

                        # if certificate.get("certificateFile", None):
                        #     with open(certificate['certificateFile'], 'rb') as file:
                        #         cert = file.read()
                        #         settings['sni'].extend(get_cert_SANs(cert))

                        if certificate.get("certificate", None):
                            cert = certificate['certificate']
                            if isinstance(cert, list):
                                cert = '\n'.join(cert)
                            if isinstance(cert, str):
                                cert = cert.encode()
                            settings['sni'].extend(get_cert_SANs(cert))

                elif security == 'reality':
                    settings['fp'] = 'chrome'
                    settings['tls'] = 'reality'
                    settings['sni'] = tls_settings.get('serverNames', [])

                    try:
                        settings['pbk'] = tls_settings['publicKey']
                    except KeyError:
                        pvk = tls_settings.get('privateKey')
                        if not pvk:
                            raise ValueError(
                                f"You need to provide privateKey in realitySettings of {inbound['tag']}")

                        from app.utils.xray_binary import get_x25519

                        x25519 = get_x25519(pvk)
                        if x25519:
                            settings['pbk'] = x25519['public_key']

                        if not settings.get('pbk'):
                            raise ValueError(
                                f"You need to provide publicKey in realitySettings of {inbound['tag']}")

                    try:
                        settings['sids'] = tls_settings.get('shortIds')
                        settings['sids'][0]  # check if there is any shortIds
                    except (IndexError, TypeError):
                        raise ValueError(
                            f"You need to define at least one shortID in realitySettings of {inbound['tag']}")
                    try:
                        settings['spx'] = tls_settings.get('SpiderX')
                    except:
                        settings['spx'] = ""

                if net in ('tcp', 'raw'):
                    header = net_settings.get('header', {})
                    request = header.get('request', {})
                    path = request.get('path')
                    host = request.get('headers', {}).get('Host')

                    settings['header_type'] = header.get('type', '')

                    if isinstance(path, str) or isinstance(host, str):
                        raise ValueError(f"Settings of {inbound['tag']} for path and host must be list, not str\n"
                                         "https://xtls.github.io/config/transports/tcp.html#httpheaderobject")

                    if path and isinstance(path, list):
                        settings['path'] = path[0]

                    if host and isinstance(host, list):
                        settings['host'] = host

                elif net == 'ws':
                    path = net_settings.get('path', '')
                    host = net_settings.get('host', '') or net_settings.get('headers', {}).get('Host')

                    settings['header_type'] = ''

                    if isinstance(path, list) or isinstance(host, list):
                        raise ValueError(f"Settings of {inbound['tag']} for path and host must be str, not list\n"
                                         "https://xtls.github.io/config/transports/websocket.html#websocketobject")

                    if isinstance(path, str):
                        settings['path'] = path

                    if isinstance(host, str):
                        settings['host'] = [host]

                    settings["heartbeatPeriod"] = net_settings.get('heartbeatPeriod', 0)
                elif net == 'grpc' or net == 'gun':
                    settings['header_type'] = ''
                    settings['path'] = net_settings.get('serviceName', '')
                    host = net_settings.get('authority', '')
                    settings['host'] = [host]
                    settings['multiMode'] = net_settings.get('multiMode', False)

                elif net == 'quic':
                    settings['header_type'] = net_settings.get('header', {}).get('type', '')
                    settings['path'] = net_settings.get('key', '')
                    settings['host'] = [net_settings.get('security', '')]

                elif net == 'httpupgrade':
                    settings['path'] = net_settings.get('path', '')
                    host = net_settings.get('host', '')
                    settings['host'] = [host]

                elif net in ('splithttp', 'xhttp'):
                    settings['path'] = net_settings.get('path', '')
                    host = net_settings.get('host', '')
                    settings['host'] = [host]
                    settings['scMaxEachPostBytes'] = net_settings.get('scMaxEachPostBytes', 1000000)
                    settings['scMaxConcurrentPosts'] = net_settings.get('scMaxConcurrentPosts', 100)
                    settings['scMinPostsIntervalMs'] = net_settings.get('scMinPostsIntervalMs', 30)
                    settings['xPaddingBytes'] = net_settings.get('xPaddingBytes', "100-1000")
                    settings['xmux'] = net_settings.get('xmux', {})
                    settings["mode"] = net_settings.get("mode", "auto")
                    settings["noGRPCHeader"] = net_settings.get("noGRPCHeader", False)
                    settings["keepAlivePeriod"] = net_settings.get("keepAlivePeriod", 0)
                    for setting_name in (
                        "xPaddingKey",
                        "xPaddingHeader",
                        "xPaddingMethod",
                        "xPaddingPlacement",
                    ):
                        if setting_name in net_settings:
                            settings[setting_name] = net_settings[setting_name]

                elif net == 'kcp':
                    header = net_settings.get('header', {})

                    settings['header_type'] = header.get('type', '')
                    settings['host'] = header.get('domain', '')
                    settings['path'] = net_settings.get('seed', '')

                elif net in ("http", "h2", "h3"):
                    net_settings = stream.get("httpSettings", {})

                    settings['host'] = net_settings.get('host') or net_settings.get('Host', '')
                    settings['path'] = net_settings.get('path', '')
                elif net == 'hysteria':
                    settings['path'] = net_settings.get('path', '')
                    settings['host'] = [net_settings.get('host', '')] if net_settings.get('host') else []
                    settings['header_type'] = ''
                    settings['tls'] = security or settings['tls']

                else:
                    settings['path'] = net_settings.get('path', '')
                    host = net_settings.get(
                        'host', {}) or net_settings.get('Host', {})
                    if host and isinstance(host, str):
                        settings['host'] = host
                    elif host and isinstance(host, list):
                        settings['host'] = host[0]

            self.inbounds.append(settings)
            self.inbounds_by_tag[inbound['tag']] = settings

            if not is_account_protocol:
                continue

            try:
                self.inbounds_by_protocol[inbound['protocol']].append(settings)
            except KeyError:
                self.inbounds_by_protocol[inbound['protocol']] = [settings]

    def get_inbound(self, tag) -> dict:
        for inbound in self['inbounds']:
            if inbound['tag'] == tag:
                return inbound

    def get_outbound(self, tag) -> dict:
        for outbound in self['outbounds']:
            if outbound['tag'] == tag:
                return outbound

    def to_json(self, **json_kwargs):
        return json.dumps(self, **json_kwargs)

    def copy(self):
        return deepcopy(self)

    def for_node(self, node_id: int) -> XRayConfig:
        with GetDB() as db:
            node = db.get(Node, node_id)
            if not node:
                raise ValueError("Node not found")
            return load_node_xray_config(node, api_host=self.api_host)

    def include_db_users(self) -> XRayConfig:
        config = self.copy()

        with GetDB() as db:
            query = db.query(
                User.id,
                User.username,
                func.lower(Proxy.type).label('type'),
                Proxy.settings,
                func.group_concat(excluded_inbounds_association.c.inbound_tag).label('excluded_inbound_tags')
            ).join(
                Proxy, User.id == Proxy.user_id
            ).outerjoin(
                excluded_inbounds_association,
                Proxy.id == excluded_inbounds_association.c.proxy_id
            ).filter(
                User.status.in_([UserStatus.active, UserStatus.on_hold])
            ).group_by(
                func.lower(Proxy.type),
                User.id,
                User.username,
                Proxy.settings,
            )
            result = query.all()

            grouped_data = defaultdict(list)

            for row in result:
                grouped_data[row.type].append((
                    row.id,
                    row.username,
                    row.settings,
                    [i for i in row.excluded_inbound_tags.split(',') if i] if row.excluded_inbound_tags else None
                ))

            for proxy_type, rows in grouped_data.items():

                inbounds = self.inbounds_by_protocol.get(proxy_type)
                if not inbounds:
                    continue

                for inbound in inbounds:
                    user_container = inbound.get("user_container", "clients")
                    clients = config.get_inbound(inbound['tag'])['settings'][user_container]

                    for row in rows:
                        user_id, username, settings, excluded_inbound_tags = row

                        if excluded_inbound_tags and inbound['tag'] in excluded_inbound_tags:
                            continue

                        client = {
                            "email": f"{user_id}.{username}",
                            **settings
                        }

                        # XTLS currently only supports transmission methods of TCP and mKCP
                        if client.get('flow') and (
                                inbound.get('network', 'tcp') not in ('tcp', 'raw', 'kcp')
                                or
                                (
                                    inbound.get('network', 'tcp') in ('tcp', 'raw', 'kcp')
                                    and
                                    inbound.get('tls') not in ('tls', 'reality')
                                )
                                or
                                inbound.get('header_type') == 'http'
                        ):
                            del client['flow']

                        clients.append(client)

        if DEBUG:
            with open('generated_config-debug.json', 'w') as f:
                f.write(config.to_json(indent=4))

        return config
