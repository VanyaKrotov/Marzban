from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping

from sqlalchemy.orm import Session

from app.db.models.nodes import Node
from app.db.models.proxies import ProxyInbound, ProxyOutbound
from app.models.proxy import ProxyTypes
from config import XRAY_EXCLUDE_INBOUND_TAGS


XRAY_VALIDATION_API_PORT = 8080

_DUMMY_INBOUND = {
    "tag": "__MARZBAN_DUMMY_INBOUND__",
    "listen": "127.0.0.1",
    "port": 1,
    "protocol": "dokodemo-door",
    "settings": {"address": "127.0.0.1"},
}
_DUMMY_OUTBOUND = {
    "tag": "__MARZBAN_DUMMY_OUTBOUND__",
    "protocol": "freedom",
}


@dataclass(frozen=True)
class InboundRegistry:
    inbounds: List[dict]
    inbounds_by_tag: Dict[str, dict]
    inbounds_by_protocol: Dict[str, List[dict]]


def _record_content(record) -> dict:
    content = deepcopy(record.content or {})
    content["tag"] = record.tag
    return content


def _template_support_inbounds(db: Session, node_id: int | None = None) -> List[dict]:
    query = db.query(Node)
    if node_id is not None:
        query = query.filter(Node.id == node_id)

    support_inbounds: Dict[str, dict] = {}
    for node in query.order_by(Node.id).all():
        template = node.config_template or {}
        for inbound in template.get("inbounds", []):
            if not isinstance(inbound, dict):
                continue
            tag = inbound.get("tag")
            if tag not in XRAY_EXCLUDE_INBOUND_TAGS or tag in support_inbounds:
                continue
            support_inbounds[tag] = deepcopy(inbound)
    return list(support_inbounds.values())


def get_enabled_inbound_contents(db: Session, node_id: int | None = None) -> List[dict]:
    query = db.query(ProxyInbound).filter(ProxyInbound.enabled.is_(True))
    if node_id is not None:
        query = query.join(ProxyInbound.nodes).filter(Node.id == node_id)
    return [_record_content(inbound) for inbound in query.order_by(ProxyInbound.id).all()]


def get_enabled_outbound_contents(db: Session, node_id: int | None = None) -> List[dict]:
    query = db.query(ProxyOutbound).filter(ProxyOutbound.enabled.is_(True))
    if node_id is not None:
        query = query.join(ProxyOutbound.nodes).filter(Node.id == node_id)
    return [_record_content(outbound) for outbound in query.order_by(ProxyOutbound.id).all()]


def get_enabled_inbound_registry(db: Session, node_id: int | None = None) -> InboundRegistry:
    inbounds = get_enabled_inbound_contents(db, node_id=node_id)
    if not inbounds:
        return InboundRegistry(inbounds=[], inbounds_by_tag={}, inbounds_by_protocol={})

    from app.xray.config import XRayConfig

    payload = {
        "inbounds": _template_support_inbounds(db, node_id=node_id) + inbounds,
        "outbounds": get_enabled_outbound_contents(db, node_id=node_id) or [_DUMMY_OUTBOUND],
    }
    config = XRayConfig(payload, api_port=XRAY_VALIDATION_API_PORT)
    return InboundRegistry(
        inbounds=list(config.inbounds),
        inbounds_by_tag=dict(config.inbounds_by_tag),
        inbounds_by_protocol={
            protocol: list(items)
            for protocol, items in config.inbounds_by_protocol.items()
        },
    )


def build_validation_payload(
    db: Session,
    *,
    inbounds: Iterable[dict] | None = None,
    outbounds: Iterable[dict] | None = None,
    replace_inbound_tags: Iterable[str] = (),
    replace_outbound_tags: Iterable[str] = (),
) -> dict:
    replace_inbound_tags = set(replace_inbound_tags)
    replace_outbound_tags = set(replace_outbound_tags)

    inbound_contents = [
        inbound
        for inbound in _template_support_inbounds(db)
        if inbound.get("tag") not in replace_inbound_tags
    ]
    inbound_contents.extend(
        [
            _record_content(inbound)
            for inbound in db.query(ProxyInbound).order_by(ProxyInbound.id).all()
            if inbound.tag not in replace_inbound_tags
        ]
    )
    outbound_contents = [
        _record_content(outbound)
        for outbound in db.query(ProxyOutbound).order_by(ProxyOutbound.id).all()
        if outbound.tag not in replace_outbound_tags
    ]

    inbound_contents.extend(deepcopy(list(inbounds or [])))
    outbound_contents.extend(deepcopy(list(outbounds or [])))

    return {
        "inbounds": inbound_contents or [deepcopy(_DUMMY_INBOUND)],
        "outbounds": outbound_contents or [deepcopy(_DUMMY_OUTBOUND)],
        "routing": {"rules": []},
    }


def normalize_user_inbounds(
    db: Session,
    proxies: Mapping[ProxyTypes | str, Any],
    inbounds: Mapping[ProxyTypes | str, List[str]] | None,
    *,
    fill_missing: bool,
) -> Dict[ProxyTypes, List[str]]:
    registry = get_enabled_inbound_registry(db)
    normalized: Dict[ProxyTypes, List[str]] = {}
    provided = dict(inbounds or {})

    for raw_proxy_type in proxies:
        proxy_type = ProxyTypes(raw_proxy_type)
        selected_tags = provided.get(proxy_type)
        if selected_tags is None:
            selected_tags = provided.get(proxy_type.value)

        if selected_tags is None:
            if not fill_missing:
                continue
            selected_tags = [
                inbound["tag"]
                for inbound in registry.inbounds_by_protocol.get(proxy_type.value, [])
            ]

        if not registry.inbounds_by_protocol.get(proxy_type.value):
            raise ValueError(f"Protocol {proxy_type} is disabled on your server")

        tags = list(dict.fromkeys(selected_tags))
        for tag in tags:
            inbound = registry.inbounds_by_tag.get(tag)
            if not inbound:
                raise ValueError(f"Inbound {tag} doesn't exist")
            if inbound["protocol"] != proxy_type.value:
                raise ValueError(f"Inbound {tag} doesn't belong to protocol {proxy_type}")
        normalized[proxy_type] = tags

    return normalized


def validate_selected_inbounds(
    db: Session,
    inbounds: Mapping[ProxyTypes | str, List[str]],
) -> Dict[ProxyTypes, List[str]]:
    proxies = {ProxyTypes(protocol): None for protocol in inbounds}
    return normalize_user_inbounds(db, proxies, inbounds, fill_missing=False)


def get_excluded_inbound_tags(
    db: Session,
    proxies: Mapping[ProxyTypes | str, Any],
    selected_inbounds: Mapping[ProxyTypes | str, List[str]],
) -> Dict[ProxyTypes, List[str]]:
    registry = get_enabled_inbound_registry(db)
    excluded: Dict[ProxyTypes, List[str]] = {}

    for raw_proxy_type in proxies:
        proxy_type = ProxyTypes(raw_proxy_type)
        selected_tags = set(
            selected_inbounds.get(proxy_type)
            or selected_inbounds.get(proxy_type.value)
            or []
        )
        excluded[proxy_type] = [
            inbound["tag"]
            for inbound in registry.inbounds_by_protocol.get(proxy_type.value, [])
            if inbound["tag"] not in selected_tags
        ]

    return excluded
