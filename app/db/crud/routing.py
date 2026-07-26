"""Domain CRUD helpers extracted from the former app.db.crud module."""

from typing import Dict, List, Optional

from sqlalchemy import delete, func
from sqlalchemy.orm import Session, joinedload

from app.db.models.associations import excluded_inbounds_association, template_inbounds_association
from app.db.models.nodes import Node
from app.db.models.proxies import ProxyHost, ProxyInbound, ProxyOutbound
from app.db.models.routing import RoutingRule
from app.models.proxy import XRAY_INBOUND_PROTOCOLS
from app.models.routing import RoutingRuleCreate, RoutingRuleModify
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
        name=rule.name,
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
    if modified.name is not None:
        dbrule.name = modified.name
    if modified.content is not None:
        if dbrule.readonly:
            raise ValueError("Content of read-only routing rules cannot be changed")
        dbrule.content = dict(modified.content)
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


def sync_readonly_xray_config(db: Session, payload: dict) -> None:
    nodes = db.query(Node).all()
    inbound_contents = {
        inbound["tag"]: inbound
        for inbound in payload.get("inbounds", [])
        if (
            isinstance(inbound, dict)
            and inbound.get("tag")
            and inbound.get("protocol") in XRAY_INBOUND_PROTOCOLS
            and inbound["tag"] not in XRAY_EXCLUDE_INBOUND_TAGS
        )
    }
    outbound_contents = {
        outbound["tag"]: outbound
        for outbound in payload.get("outbounds", [])
        if isinstance(outbound, dict) and outbound.get("tag")
    }

    readonly_inbounds = (
        db.query(ProxyInbound)
        .options(joinedload(ProxyInbound.nodes))
        .filter(ProxyInbound.readonly.is_(True))
        .all()
    )
    for inbound in readonly_inbounds:
        content = inbound_contents.get(inbound.tag)
        if content is None:
            tag = inbound.tag
            inbound.nodes = []
            inbound.node_certificates = []
            for association in (
                excluded_inbounds_association,
                template_inbounds_association,
            ):
                db.execute(
                    delete(association).where(association.c.inbound_tag == tag)
                )
            db.delete(inbound)
            continue
        inbound.content = content
        inbound.enabled = True

    existing_inbound_tags = {
        row[0]
        for row in db.query(ProxyInbound.tag)
        .filter(ProxyInbound.tag.in_(inbound_contents))
        .all()
    } if inbound_contents else set()
    next_host_position = inbound_crud.get_next_host_position(db)
    new_inbound_tags_by_protocol: Dict[str, List[str]] = {}
    for tag in inbound_contents.keys() - existing_inbound_tags:
        protocol = inbound_contents[tag].get("protocol")
        new_inbound_tags_by_protocol.setdefault(protocol, []).append(tag)
        inbound = ProxyInbound(
            tag=tag,
            content=inbound_contents[tag],
            enabled=True,
            readonly=True,
            nodes=list(nodes),
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
            ensure_protocol_inbounds_for_users(
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
        content = outbound_contents.get(outbound.tag)
        if content is None:
            outbound.nodes = []
            db.delete(outbound)
            continue
        outbound.content = content
        outbound.enabled = True

    existing_outbound_tags = {
        row[0]
        for row in db.query(ProxyOutbound.tag)
        .filter(ProxyOutbound.tag.in_(outbound_contents))
        .all()
    } if outbound_contents else set()
    for tag in outbound_contents.keys() - existing_outbound_tags:
        db.add(
            ProxyOutbound(
                tag=tag,
                content=outbound_contents[tag],
                enabled=True,
                readonly=True,
                nodes=list(nodes),
            )
        )

    readonly_rules = (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.nodes))
        .filter(RoutingRule.readonly.is_(True))
        .order_by(RoutingRule.position, RoutingRule.id)
        .all()
    )

    routing = payload.get("routing")
    routing_rules = routing.get("rules", []) if isinstance(routing, dict) else []
    routing_rules = [
        content for content in routing_rules if isinstance(content, dict)
    ]
    for rule, content in zip(readonly_rules, routing_rules):
        rule.content = content
        rule.enabled = True

    for rule in readonly_rules[len(routing_rules):]:
        rule.nodes = []
        db.delete(rule)

    next_position = (
        db.query(func.max(RoutingRule.position)).scalar()
        if routing_rules[len(readonly_rules):]
        else None
    )
    next_position = (next_position if next_position is not None else -1) + 1
    for content in routing_rules[len(readonly_rules):]:
        rule = RoutingRule(
            name=f"Xray rule {next_position + 1}",
            content=content,
            enabled=True,
            readonly=True,
            position=next_position,
            nodes=list(nodes),
        )
        db.add(rule)
        next_position += 1

    db.commit()
