"""Domain CRUD helpers extracted from the former app.db.crud module."""

from copy import deepcopy
from typing import Dict, List, Optional

from sqlalchemy import delete, func
from sqlalchemy.orm import Session, joinedload

from app.db.models.associations import excluded_inbounds_association, template_inbounds_association
from app.db.models.nodes import Node
from app.db.models.proxies import ProxyHost, ProxyInbound, ProxyOutbound
from app.db.models.routing import RoutingRule
from app.models.proxy import XRAY_INBOUND_PROTOCOLS
from app.models.routing import (
    RoutingRuleCreate,
    RoutingRuleModify,
    get_routing_rule_name,
    normalize_routing_rule_content,
)
from config import XRAY_EXCLUDE_INBOUND_TAGS

from app.db.crud import proxy_inbounds as inbound_crud

def get_routing_rules(db: Session) -> List[RoutingRule]:
    return (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.nodes))
        .order_by(RoutingRule.position, RoutingRule.id)
        .all()
    )


def get_routing_rule(db: Session, rule_id: int) -> Optional[RoutingRule]:
    return (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.nodes))
        .filter(RoutingRule.id == rule_id)
        .first()
    )


def create_routing_rule(
    db: Session,
    rule: RoutingRuleCreate,
) -> RoutingRule:
    nodes = {
        node.id: node
        for node in db.query(Node).filter(Node.id.in_(rule.node_ids)).all()
    } if rule.node_ids else {}
    missing_node_ids = set(rule.node_ids) - nodes.keys()
    if missing_node_ids:
        raise ValueError(f"Nodes {sorted(missing_node_ids)} don't exist")

    position = rule.position
    if position is None:
        max_position = db.query(func.max(RoutingRule.position)).scalar()
        position = (max_position if max_position is not None else -1) + 1

    dbrule = RoutingRule(
        name=get_routing_rule_name(rule.content),
        content=dict(rule.content),
        enabled=rule.enabled,
        position=position,
        nodes=[nodes[node_id] for node_id in dict.fromkeys(rule.node_ids)],
    )
    db.add(dbrule)
    db.commit()
    db.refresh(dbrule)
    return get_routing_rule(db, dbrule.id)


def update_routing_rule(
    db: Session,
    dbrule: RoutingRule,
    modified: RoutingRuleModify,
) -> RoutingRule:
    if modified.content is not None:
        if dbrule.readonly:
            raise ValueError("Content of read-only routing rules cannot be changed")
        dbrule.content = dict(modified.content)
        dbrule.name = get_routing_rule_name(modified.content)
    if modified.enabled is not None:
        dbrule.enabled = True if dbrule.readonly else modified.enabled
    if modified.position is not None:
        dbrule.position = modified.position
    if modified.node_ids is not None:
        nodes = {
            node.id: node
            for node in db.query(Node)
            .filter(Node.id.in_(modified.node_ids))
            .all()
        } if modified.node_ids else {}
        missing_node_ids = set(modified.node_ids) - nodes.keys()
        if missing_node_ids:
            raise ValueError(f"Nodes {sorted(missing_node_ids)} don't exist")
        dbrule.nodes = [
            nodes[node_id] for node_id in dict.fromkeys(modified.node_ids)
        ]

    db.commit()
    db.refresh(dbrule)
    return get_routing_rule(db, dbrule.id)


def reorder_routing_rules(
    db: Session,
    rule_ids: List[int],
) -> List[RoutingRule]:
    rules = get_routing_rules(db)
    existing_ids = {rule.id for rule in rules}
    if len(rule_ids) != len(set(rule_ids)) or set(rule_ids) != existing_ids:
        raise ValueError("Routing rule order must contain every rule exactly once")

    rules_by_id = {rule.id: rule for rule in rules}
    for position, rule_id in enumerate(rule_ids):
        rules_by_id[rule_id].position = position

    db.commit()
    return get_routing_rules(db)


def remove_routing_rule(db: Session, dbrule: RoutingRule) -> None:
    if dbrule.readonly:
        raise ValueError("Read-only routing rules cannot be deleted")
    dbrule.nodes = []
    db.flush()
    db.delete(dbrule)
    db.commit()


def get_routing_rules_for_node(db: Session, node_id: int) -> List[dict]:
    return [
        rule.content
        for rule in (
            db.query(RoutingRule)
            .join(RoutingRule.nodes)
            .filter(
                Node.id == node_id,
                RoutingRule.enabled.is_(True),
            )
            .order_by(RoutingRule.position, RoutingRule.id)
            .all()
        )
    ]


def _node_has_relation(items: list, node_id: int) -> bool:
    return any(item.id == node_id for item in items)


def _other_relation_ids(items: list, node_id: int) -> set[int]:
    return {item.id for item in items if item.id != node_id}


def _detach_node(items: list, node_id: int) -> None:
    items[:] = [item for item in items if item.id != node_id]


def _cleanup_inbound(db: Session, inbound: ProxyInbound) -> None:
    tag = inbound.tag
    inbound.nodes = []
    inbound.node_certificates = []
    for association in (
        excluded_inbounds_association,
        template_inbounds_association,
    ):
        db.execute(delete(association).where(association.c.inbound_tag == tag))
    db.delete(inbound)


def _template_inbound_contents(payload: dict) -> Dict[str, dict]:
    return {
        inbound["tag"]: deepcopy(inbound)
        for inbound in payload.get("inbounds", [])
        if (
            isinstance(inbound, dict)
            and inbound.get("tag")
            and inbound.get("protocol") in XRAY_INBOUND_PROTOCOLS
            and inbound["tag"] not in XRAY_EXCLUDE_INBOUND_TAGS
        )
    }


def _template_outbound_contents(payload: dict) -> Dict[str, dict]:
    return {
        outbound["tag"]: deepcopy(outbound)
        for outbound in payload.get("outbounds", [])
        if isinstance(outbound, dict) and outbound.get("tag")
    }


def _template_routing_rules(payload: dict) -> List[dict]:
    routing = payload.get("routing")
    routing_rules = routing.get("rules", []) if isinstance(routing, dict) else []
    return [
        normalize_routing_rule_content(content)
        for content in routing_rules
        if isinstance(content, dict)
    ]


def sync_readonly_node_config(db: Session, node: Node, payload: dict) -> None:
    inbound_contents = {
        tag: content
        for tag, content in _template_inbound_contents(payload).items()
    }
    outbound_contents = _template_outbound_contents(payload)

    readonly_inbounds = (
        db.query(ProxyInbound)
        .options(joinedload(ProxyInbound.nodes))
        .filter(ProxyInbound.readonly.is_(True))
        .all()
    )
    next_host_position = inbound_crud.get_next_host_position(db)
    new_inbound_tags_by_protocol: Dict[str, List[str]] = {}

    for inbound in readonly_inbounds:
        if not _node_has_relation(inbound.nodes, node.id):
            continue
        if inbound.tag in inbound_contents:
            continue
        _detach_node(inbound.nodes, node.id)
        if not inbound.nodes:
            _cleanup_inbound(db, inbound)

    existing_inbounds = {
        inbound.tag: inbound
        for inbound in (
            db.query(ProxyInbound)
            .options(joinedload(ProxyInbound.nodes))
            .filter(ProxyInbound.tag.in_(inbound_contents))
            .all()
            if inbound_contents
            else []
        )
    }
    for tag, content in inbound_contents.items():
        inbound = existing_inbounds.get(tag)
        if inbound and not inbound.readonly:
            raise ValueError(f"Inbound tag {tag} already exists as editable config")
        if inbound:
            if _other_relation_ids(inbound.nodes, node.id) and inbound.content != content:
                raise ValueError(f"Inbound tag {tag} is used by another node with different content")
            inbound.content = content
            inbound.enabled = True
            if not _node_has_relation(inbound.nodes, node.id):
                inbound.nodes.append(node)
            continue

        protocol = content.get("protocol")
        new_inbound_tags_by_protocol.setdefault(protocol, []).append(tag)
        inbound = ProxyInbound(
            tag=tag,
            content=content,
            enabled=True,
            readonly=True,
            nodes=[node],
        )
        inbound.hosts.append(
            ProxyHost(
                remark="Marz ({USERNAME}) [{PROTOCOL} - {TRANSPORT}]",
                address="{SERVER_IP}",
                position=next_host_position,
            )
        )
        next_host_position += 1
        db.add(inbound)

    if new_inbound_tags_by_protocol:
        db.flush()
        protocol_tags: Dict[str, List[str]] = {}
        for tag, content in inbound_contents.items():
            protocol_tags.setdefault(content.get("protocol"), []).append(tag)
        for protocol, included_tags in new_inbound_tags_by_protocol.items():
            inbound_crud.ensure_protocol_inbounds_for_users(
                db,
                protocol=protocol,
                included_tags=included_tags,
                protocol_inbound_tags=protocol_tags.get(protocol, []),
            )

    readonly_outbounds = (
        db.query(ProxyOutbound)
        .options(joinedload(ProxyOutbound.nodes))
        .filter(ProxyOutbound.readonly.is_(True))
        .all()
    )
    for outbound in readonly_outbounds:
        if not _node_has_relation(outbound.nodes, node.id):
            continue
        if outbound.tag in outbound_contents:
            continue
        _detach_node(outbound.nodes, node.id)
        if not outbound.nodes:
            db.delete(outbound)

    existing_outbounds = {
        outbound.tag: outbound
        for outbound in (
            db.query(ProxyOutbound)
            .options(joinedload(ProxyOutbound.nodes))
            .filter(ProxyOutbound.tag.in_(outbound_contents))
            .all()
            if outbound_contents
            else []
        )
    }
    for tag, content in outbound_contents.items():
        outbound = existing_outbounds.get(tag)
        if outbound and not outbound.readonly:
            raise ValueError(f"Outbound tag {tag} already exists as editable config")
        if outbound:
            if _other_relation_ids(outbound.nodes, node.id) and outbound.content != content:
                raise ValueError(f"Outbound tag {tag} is used by another node with different content")
            outbound.content = content
            outbound.enabled = True
            if not _node_has_relation(outbound.nodes, node.id):
                outbound.nodes.append(node)
            continue

        db.add(
            ProxyOutbound(
                tag=tag,
                content=content,
                enabled=True,
                readonly=True,
                nodes=[node],
            )
        )

    readonly_rules = (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.nodes))
        .filter(RoutingRule.readonly.is_(True))
        .order_by(RoutingRule.position, RoutingRule.id)
        .all()
    )
    node_readonly_rules = [
        rule for rule in readonly_rules if _node_has_relation(rule.nodes, node.id)
    ]
    node_rules_by_name = {rule.name: rule for rule in node_readonly_rules}
    next_names = set()
    routing_rules = _template_routing_rules(payload)

    for position, content in enumerate(routing_rules):
        name = get_routing_rule_name(content, f"Xray rule {position + 1}")
        next_names.add(name)
        rule = node_rules_by_name.get(name)
        if rule and _other_relation_ids(rule.nodes, node.id) and rule.content != content:
            _detach_node(rule.nodes, node.id)
            rule = None
        if rule:
            rule.name = name
            rule.content = content
            rule.enabled = True
            rule.position = position
            continue

        rule = RoutingRule(
            name=name,
            content=content,
            enabled=True,
            readonly=True,
            position=position,
            nodes=[node],
        )
        db.add(rule)

    for rule in node_readonly_rules:
        if rule.name in next_names:
            continue
        _detach_node(rule.nodes, node.id)
        if not rule.nodes:
            db.delete(rule)

    db.commit()
