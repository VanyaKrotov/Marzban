"""
Functions for managing proxy hosts, users, user templates, nodes, and administrative tasks.
"""

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union

from sqlalchemy import and_, delete, func, or_
from sqlalchemy.orm import Query, Session, joinedload
from sqlalchemy.sql.functions import coalesce

from app.db.models import (
    JWT,
    TLS,
    Admin,
    AdminUsageLogs,
    NextPlan,
    Node,
    NodeCertificate,
    NodeGeoResourceUpdate,
    NodeUsage,
    NodeUserUsage,
    NotificationReminder,
    Proxy,
    ProxyHost,
    ProxyInbound,
    ProxyOutbound,
    ProxyTypes,
    RoutingRule,
    System,
    User,
    UserTemplate,
    UserUsageResetLogs,
    excluded_inbounds_association,
    template_inbounds_association,
)
from app.models.admin import AdminCreate, AdminModify, AdminPartialModify
from app.models.node import NodeCreate, NodeModify, NodeStatus, NodeUsageResponse
from app.models.node import NodeCertificateModify
from app.models.proxy import (
    InboundCreate,
    InboundModify,
    OutboundCreate,
    OutboundModify,
    ProxyHost as ProxyHostModify,
    ProxyHostCreate,
    ProxyHostModify as ProxyHostV2Modify,
    XRAY_INBOUND_PROTOCOLS,
)
from app.models.routing import RoutingRuleCreate, RoutingRuleModify
from app.models.stats import (
    NodeTrafficPoint,
    NodeTrafficSeries,
    StatsGranularity,
    StatsHistoryResponse,
    UserGrowthPoint,
)
from app.models.user import (
    ReminderType,
    UserCreate,
    UserDataLimitResetStrategy,
    UserModify,
    UserResponse,
    UserStatus,
    UserUsageResponse,
)
from app.models.user_template import UserTemplateCreate, UserTemplateModify
from app.utils.helpers import calculate_expiration_days, calculate_usage_percent
from app.utils.runtime_settings import get_runtime_settings
from config import (
    USERS_AUTODELETE_DAYS,
    XRAY_EXCLUDE_INBOUND_TAGS,
)

def add_default_host(db: Session, inbound: ProxyInbound):
    """
    Adds a default host to a proxy inbound.

    Args:
        db (Session): Database session.
        inbound (ProxyInbound): Proxy inbound to add the default host to.
    """
    host = ProxyHost(
        remark="🚀 Marz ({USERNAME}) [{PROTOCOL} - {TRANSPORT}]",
        address="{SERVER_IP}",
        inbound=inbound,
        position=get_next_host_position(db),
    )
    db.add(host)
    db.commit()


def get_next_host_position(db: Session) -> int:
    max_position = db.query(func.max(ProxyHost.position)).scalar()
    return (max_position if max_position is not None else -1) + 1


def get_or_create_inbound(db: Session, inbound_tag: str) -> ProxyInbound:
    """
    Retrieves or creates a proxy inbound based on the given tag.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.

    Returns:
        ProxyInbound: The retrieved or newly created proxy inbound.
    """
    inbound = db.query(ProxyInbound).filter(ProxyInbound.tag == inbound_tag).first()
    if not inbound:
        from app import xray

        content = xray.config.get_inbound(inbound_tag) or {
            "tag": inbound_tag,
            "protocol": "dokodemo-door",
            "settings": {},
        }
        inbound = ProxyInbound(tag=inbound_tag, content=content, enabled=True)
        db.add(inbound)
        db.commit()
        # add_default_host(db, inbound)
        db.refresh(inbound)
    return inbound


def get_inbounds(db: Session) -> List[ProxyInbound]:
    return (
        db.query(ProxyInbound)
        .options(joinedload(ProxyInbound.nodes))
        .order_by(ProxyInbound.tag)
        .all()
    )


def get_inbound(db: Session, inbound_tag: str) -> Optional[ProxyInbound]:
    return (
        db.query(ProxyInbound)
        .options(joinedload(ProxyInbound.nodes))
        .filter(ProxyInbound.tag == inbound_tag)
        .first()
    )


def create_inbound(db: Session, inbound: InboundCreate) -> ProxyInbound:
    content = dict(inbound.content)
    content["tag"] = inbound.tag
    nodes = {
        node.id: node
        for node in db.query(Node).filter(Node.id.in_(inbound.node_ids)).all()
    } if inbound.node_ids else {}
    missing_node_ids = set(inbound.node_ids) - nodes.keys()
    if missing_node_ids:
        raise ValueError(f"Nodes {sorted(missing_node_ids)} don't exist")
    dbinbound = ProxyInbound(
        tag=inbound.tag,
        content=content,
        enabled=inbound.enabled,
        nodes=[nodes[node_id] for node_id in dict.fromkeys(inbound.node_ids)],
    )
    db.add(dbinbound)
    db.commit()
    # add_default_host(db, dbinbound)
    db.refresh(dbinbound)
    return get_inbound(db, dbinbound.tag)


def update_inbound(
    db: Session,
    dbinbound: ProxyInbound,
    modified: InboundModify,
) -> ProxyInbound:
    if modified.content is not None:
        if dbinbound.readonly:
            raise ValueError("Content of read-only inbounds cannot be changed")
        content = dict(modified.content)
        content["tag"] = dbinbound.tag
        dbinbound.content = content
    if modified.enabled is not None:
        dbinbound.enabled = modified.enabled
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
        dbinbound.nodes = [
            nodes[node_id] for node_id in dict.fromkeys(modified.node_ids)
        ]
    db.commit()
    db.refresh(dbinbound)
    return get_inbound(db, dbinbound.tag)


def remove_inbound(db: Session, dbinbound: ProxyInbound) -> None:
    tag = dbinbound.tag
    dbinbound.nodes = []
    dbinbound.node_certificates = []
    db.flush()
    for association in (
        excluded_inbounds_association,
        template_inbounds_association,
    ):
        db.execute(
            delete(association).where(association.c.inbound_tag == tag)
        )
    db.delete(dbinbound)
    db.commit()


def get_inbound_nodes(db: Session, inbound_tags: List[str]) -> Dict[str, List[int]]:
    return {
        inbound_tag: [node.id for node in get_or_create_inbound(db, inbound_tag).nodes]
        for inbound_tag in inbound_tags
    }


def update_inbound_nodes(
        db: Session, inbound_nodes: Dict[str, List[int]]
) -> Dict[str, List[int]]:
    node_ids = {node_id for ids in inbound_nodes.values() for node_id in ids}
    nodes = {
        node.id: node
        for node in db.query(Node).filter(Node.id.in_(node_ids)).all()
    } if node_ids else {}

    missing_node_ids = node_ids - nodes.keys()
    if missing_node_ids:
        raise ValueError(f"Nodes {sorted(missing_node_ids)} don't exist")

    for inbound_tag, assigned_node_ids in inbound_nodes.items():
        inbound = get_or_create_inbound(db, inbound_tag)
        inbound.nodes = [
            nodes[node_id] for node_id in dict.fromkeys(assigned_node_ids)
        ]

    db.commit()
    return get_inbound_nodes(db, list(inbound_nodes))


def get_inbound_node_ids_map(db: Session, inbound_tags: List[str]) -> Dict[str, set]:
    return {
        inbound_tag: {node.id for node in get_or_create_inbound(db, inbound_tag).nodes}
        for inbound_tag in inbound_tags
    }


def get_outbounds(db: Session) -> List[ProxyOutbound]:
    return (
        db.query(ProxyOutbound)
        .options(joinedload(ProxyOutbound.nodes))
        .order_by(ProxyOutbound.tag)
        .all()
    )


def get_outbound(db: Session, outbound_tag: str) -> Optional[ProxyOutbound]:
    return (
        db.query(ProxyOutbound)
        .options(joinedload(ProxyOutbound.nodes))
        .filter(ProxyOutbound.tag == outbound_tag)
        .first()
    )


def create_outbound(db: Session, outbound: OutboundCreate) -> ProxyOutbound:
    content = dict(outbound.content)
    content["tag"] = outbound.tag
    nodes = {
        node.id: node
        for node in db.query(Node).filter(Node.id.in_(outbound.node_ids)).all()
    } if outbound.node_ids else {}
    missing_node_ids = set(outbound.node_ids) - nodes.keys()
    if missing_node_ids:
        raise ValueError(f"Nodes {sorted(missing_node_ids)} don't exist")
    dboutbound = ProxyOutbound(
        tag=outbound.tag,
        content=content,
        enabled=outbound.enabled,
        nodes=[nodes[node_id] for node_id in dict.fromkeys(outbound.node_ids)],
    )
    db.add(dboutbound)
    db.commit()
    db.refresh(dboutbound)
    return get_outbound(db, dboutbound.tag)


def update_outbound(
    db: Session,
    dboutbound: ProxyOutbound,
    modified: OutboundModify,
) -> ProxyOutbound:
    if modified.content is not None:
        if dboutbound.readonly:
            raise ValueError("Content of read-only outbounds cannot be changed")
        content = dict(modified.content)
        content["tag"] = dboutbound.tag
        dboutbound.content = content
    if modified.enabled is not None:
        dboutbound.enabled = modified.enabled
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
        dboutbound.nodes = [
            nodes[node_id] for node_id in dict.fromkeys(modified.node_ids)
        ]
    db.commit()
    db.refresh(dboutbound)
    return get_outbound(db, dboutbound.tag)


def remove_outbound(db: Session, dboutbound: ProxyOutbound) -> None:
    dboutbound.nodes = []
    db.flush()
    db.delete(dboutbound)
    db.commit()


def get_outbound_node_ids_map(
    db: Session, outbound_tags: List[str]
) -> Dict[str, set]:
    if not outbound_tags:
        return {}
    outbounds = (
        db.query(ProxyOutbound)
        .options(joinedload(ProxyOutbound.nodes))
        .filter(ProxyOutbound.tag.in_(outbound_tags))
        .all()
    )
    return {
        outbound.tag: {node.id for node in outbound.nodes}
        for outbound in outbounds
    }


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
        dbrule.enabled = modified.enabled
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
        inbound.nodes = list(nodes)

    existing_inbound_tags = {
        row[0]
        for row in db.query(ProxyInbound.tag)
        .filter(ProxyInbound.tag.in_(inbound_contents))
        .all()
    } if inbound_contents else set()
    next_host_position = get_next_host_position(db)
    for tag in inbound_contents.keys() - existing_inbound_tags:
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
        outbound.nodes = list(nodes)

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
        rule.nodes = list(nodes)

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


def get_hosts(db: Session, inbound_tag: str) -> List[ProxyHost]:
    """
    Retrieves hosts for a given inbound tag.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.

    Returns:
        List[ProxyHost]: List of hosts for the inbound.
    """
    inbound = get_or_create_inbound(db, inbound_tag)
    return (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound))
        .filter(ProxyHost.inbound_id == inbound.id)
        .order_by(ProxyHost.position, ProxyHost.id)
        .all()
    )


def get_hosts_v2(db: Session) -> List[ProxyHost]:
    return (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound))
        .order_by(ProxyHost.position, ProxyHost.id)
        .all()
    )


def get_host_v2(db: Session, host_id: int) -> Optional[ProxyHost]:
    return (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound))
        .filter(ProxyHost.id == host_id)
        .first()
    )


def _apply_host_fields(dbhost: ProxyHost, host: ProxyHostModify) -> None:
    dbhost.remark = host.remark
    dbhost.address = host.address
    dbhost.port = host.port
    dbhost.path = host.path
    dbhost.sni = host.sni
    dbhost.host = host.host
    dbhost.security = host.security
    dbhost.alpn = host.alpn
    dbhost.fingerprint = host.fingerprint
    dbhost.allowinsecure = host.allowinsecure
    dbhost.is_disabled = host.is_disabled
    dbhost.mux_enable = host.mux_enable
    dbhost.fragment_setting = host.fragment_setting
    dbhost.noise_setting = host.noise_setting
    dbhost.random_user_agent = host.random_user_agent
    dbhost.use_sni_as_host = host.use_sni_as_host


def create_host_v2(db: Session, host: ProxyHostCreate) -> ProxyHost:
    inbound = get_or_create_inbound(db, host.inbound_tag)
    position = host.position
    if position is None:
        position = get_next_host_position(db)
    dbhost = ProxyHost(inbound=inbound, position=position)
    _apply_host_fields(dbhost, host)
    db.add(dbhost)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def update_host_v2(
    db: Session, dbhost: ProxyHost, host: ProxyHostV2Modify
) -> ProxyHost:
    inbound = get_or_create_inbound(db, host.inbound_tag)
    dbhost.inbound = inbound
    if host.position is not None:
        dbhost.position = host.position
    _apply_host_fields(dbhost, host)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def remove_host_v2(db: Session, dbhost: ProxyHost) -> None:
    db.delete(dbhost)
    db.commit()


def reorder_hosts_v2(db: Session, host_ids: List[int]) -> List[ProxyHost]:
    hosts = get_hosts_v2(db)
    existing_ids = {host.id for host in hosts}
    if len(host_ids) != len(set(host_ids)) or set(host_ids) != existing_ids:
        raise ValueError("Host order must contain every host exactly once")

    hosts_by_id = {host.id: host for host in hosts}
    for position, host_id in enumerate(host_ids):
        hosts_by_id[host_id].position = position

    db.commit()
    return get_hosts_v2(db)


def add_host(db: Session, inbound_tag: str, host: ProxyHostModify) -> List[ProxyHost]:
    """
    Adds a new host to a proxy inbound.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.
        host (ProxyHostModify): Host details to be added.

    Returns:
        List[ProxyHost]: Updated list of hosts for the inbound.
    """
    inbound = get_or_create_inbound(db, inbound_tag)
    inbound.hosts.append(
        ProxyHost(
            remark=host.remark,
            address=host.address,
            port=host.port,
            path=host.path,
            sni=host.sni,
            host=host.host,
            inbound=inbound,
            position=get_next_host_position(db),
            security=host.security,
            alpn=host.alpn,
            fingerprint=host.fingerprint
        )
    )
    db.commit()
    db.refresh(inbound)
    return get_hosts(db, inbound_tag)


def update_hosts(db: Session, inbound_tag: str, modified_hosts: List[ProxyHostModify]) -> List[ProxyHost]:
    """
    Updates hosts for a given inbound tag.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.
        modified_hosts (List[ProxyHostModify]): List of modified hosts.

    Returns:
        List[ProxyHost]: Updated list of hosts for the inbound.
    """
    inbound = get_or_create_inbound(db, inbound_tag)
    position = get_next_host_position(db)
    inbound.hosts = [
        ProxyHost(
            remark=host.remark,
            address=host.address,
            port=host.port,
            path=host.path,
            sni=host.sni,
            host=host.host,
            inbound=inbound,
            position=position + index,
            security=host.security,
            alpn=host.alpn,
            fingerprint=host.fingerprint,
            allowinsecure=host.allowinsecure,
            is_disabled=host.is_disabled,
            mux_enable=host.mux_enable,
            fragment_setting=host.fragment_setting,
            noise_setting=host.noise_setting,
            random_user_agent=host.random_user_agent,
            use_sni_as_host=host.use_sni_as_host,
        ) for index, host in enumerate(modified_hosts)
    ]
    db.commit()
    db.refresh(inbound)
    return get_hosts(db, inbound_tag)


def get_user_queryset(db: Session) -> Query:
    """
    Retrieves the base user query with joined admin details.

    Args:
        db (Session): Database session.

    Returns:
        Query: Base user query.
    """
    return db.query(User).options(joinedload(User.admin)).options(joinedload(User.next_plan))


def get_user(db: Session, username: str) -> Optional[User]:
    """
    Retrieves a user by username.

    Args:
        db (Session): Database session.
        username (str): The username of the user.

    Returns:
        Optional[User]: The user object if found, else None.
    """
    return get_user_queryset(db).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Retrieves a user by user ID.

    Args:
        db (Session): Database session.
        user_id (int): The ID of the user.

    Returns:
        Optional[User]: The user object if found, else None.
    """
    return get_user_queryset(db).filter(User.id == user_id).first()


UsersSortingOptions = Enum('UsersSortingOptions', {
    'username': User.username.asc(),
    'used_traffic': User.used_traffic.asc(),
    'data_limit': User.data_limit.asc(),
    'expire': User.expire.asc(),
    'created_at': User.created_at.asc(),
    '-username': User.username.desc(),
    '-used_traffic': User.used_traffic.desc(),
    '-data_limit': User.data_limit.desc(),
    '-expire': User.expire.desc(),
    '-created_at': User.created_at.desc(),
})


def get_users(db: Session,
              offset: Optional[int] = None,
              limit: Optional[int] = None,
              usernames: Optional[List[str]] = None,
              search: Optional[str] = None,
              status: Optional[Union[UserStatus, list]] = None,
              sort: Optional[List[UsersSortingOptions]] = None,
              admin: Optional[Admin] = None,
              admins: Optional[List[str]] = None,
              reset_strategy: Optional[Union[UserDataLimitResetStrategy, list]] = None,
              return_with_count: bool = False) -> Union[List[User], Tuple[List[User], int]]:
    """
    Retrieves users based on various filters and options.

    Args:
        db (Session): Database session.
        offset (Optional[int]): Number of records to skip.
        limit (Optional[int]): Number of records to retrieve.
        usernames (Optional[List[str]]): List of usernames to filter by.
        search (Optional[str]): Search term to filter by username or note.
        status (Optional[Union[UserStatus, list]]): User status or list of statuses to filter by.
        sort (Optional[List[UsersSortingOptions]]): Sorting options.
        admin (Optional[Admin]): Admin to filter users by.
        admins (Optional[List[str]]): List of admin usernames to filter users by.
        reset_strategy (Optional[Union[UserDataLimitResetStrategy, list]]): Data limit reset strategy to filter by.
        return_with_count (bool): Whether to return the total count of users.

    Returns:
        Union[List[User], Tuple[List[User], int]]: List of users or tuple of users and total count.
    """
    query = get_user_queryset(db)

    if search:
        query = query.filter(or_(User.username.ilike(f"%{search}%"), User.note.ilike(f"%{search}%")))

    if usernames:
        query = query.filter(User.username.in_(usernames))

    if status:
        if isinstance(status, list):
            query = query.filter(User.status.in_(status))
        else:
            query = query.filter(User.status == status)

    if reset_strategy:
        if isinstance(reset_strategy, list):
            query = query.filter(User.data_limit_reset_strategy.in_(reset_strategy))
        else:
            query = query.filter(User.data_limit_reset_strategy == reset_strategy)

    if admin:
        query = query.filter(User.admin == admin)

    if admins:
        query = query.filter(User.admin.has(Admin.username.in_(admins)))

    if return_with_count:
        count = query.count()

    if sort:
        query = query.order_by(*(opt.value for opt in sort))

    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)

    if return_with_count:
        return query.all(), count

    return query.all()


def get_user_usages(db: Session, dbuser: User, start: datetime, end: datetime) -> List[UserUsageResponse]:
    """
    Retrieves user usages within a specified date range.

    Args:
        db (Session): Database session.
        dbuser (User): The user object.
        start (datetime): Start date for usage retrieval.
        end (datetime): End date for usage retrieval.

    Returns:
        List[UserUsageResponse]: List of user usage responses.
    """

    usages = {}

    for node in db.query(Node).all():
        usages[node.id] = UserUsageResponse(
            node_id=node.id,
            node_name=node.name,
            used_traffic=0
        )

    cond = and_(
        NodeUserUsage.user_id == dbuser.id,
        NodeUserUsage.created_at >= start,
        NodeUserUsage.created_at <= end,
        NodeUserUsage.node_id.isnot(None),
    )

    for v in db.query(NodeUserUsage).filter(cond):
        try:
            usages[v.node_id].used_traffic += v.used_traffic
        except KeyError:
            pass

    return list(usages.values())


def get_users_count(db: Session, status: UserStatus = None, admin: Admin = None) -> int:
    """
    Retrieves the count of users based on status and admin filters.

    Args:
        db (Session): Database session.
        status (UserStatus, optional): Status to filter users by.
        admin (Admin, optional): Admin to filter users by.

    Returns:
        int: Count of users matching the criteria.
    """
    query = db.query(User.id)
    if admin:
        query = query.filter(User.admin == admin)
    if status:
        query = query.filter(User.status == status)
    return query.count()


def create_user(db: Session, user: UserCreate, admin: Admin = None) -> User:
    """
    Creates a new user with provided details.

    Args:
        db (Session): Database session.
        user (UserCreate): User creation details.
        admin (Admin, optional): Admin associated with the user.

    Returns:
        User: The created user object.
    """
    excluded_inbounds_tags = user.excluded_inbounds
    proxies = []
    for proxy_type, settings in user.proxies.items():
        excluded_inbounds = [
            get_or_create_inbound(db, tag) for tag in excluded_inbounds_tags[proxy_type]
        ]
        proxies.append(
            Proxy(type=proxy_type.value,
                  settings=settings.dict(no_obj=True),
                  excluded_inbounds=excluded_inbounds)
        )

    dbuser = User(
        username=user.username,
        proxies=proxies,
        status=user.status,
        data_limit=(user.data_limit or None),
        expire=(user.expire or None),
        admin=admin,
        data_limit_reset_strategy=user.data_limit_reset_strategy,
        note=user.note,
        on_hold_expire_duration=(user.on_hold_expire_duration or None),
        on_hold_timeout=(user.on_hold_timeout or None),
        auto_delete_in_days=user.auto_delete_in_days,
        next_plan=NextPlan(
            data_limit=user.next_plan.data_limit,
            expire=user.next_plan.expire,
            add_remaining_traffic=user.next_plan.add_remaining_traffic,
            fire_on_either=user.next_plan.fire_on_either,
        ) if user.next_plan else None
    )
    db.add(dbuser)
    db.commit()
    db.refresh(dbuser)
    return dbuser


def remove_user(db: Session, dbuser: User) -> User:
    """
    Removes a user from the database.

    Args:
        db (Session): Database session.
        dbuser (User): The user object to be removed.

    Returns:
        User: The removed user object.
    """
    db.delete(dbuser)
    db.commit()
    return dbuser


def remove_users(db: Session, dbusers: List[User]):
    """
    Removes multiple users from the database.

    Args:
        db (Session): Database session.
        dbusers (List[User]): List of user objects to be removed.
    """
    for dbuser in dbusers:
        db.delete(dbuser)
    db.commit()
    return


def update_user(db: Session, dbuser: User, modify: UserModify) -> User:
    """
    Updates a user with new details.

    Args:
        db (Session): Database session.
        dbuser (User): The user object to be updated.
        modify (UserModify): New details for the user.

    Returns:
        User: The updated user object.
    """
    added_proxies: Dict[ProxyTypes, Proxy] = {}
    if modify.proxies:
        for proxy_type, settings in modify.proxies.items():
            dbproxy = db.query(Proxy) \
                .where(Proxy.user == dbuser, Proxy.type == proxy_type) \
                .first()
            if dbproxy:
                dbproxy.settings = settings.dict(no_obj=True)
            else:
                new_proxy = Proxy(type=proxy_type, settings=settings.dict(no_obj=True))
                dbuser.proxies.append(new_proxy)
                added_proxies.update({proxy_type: new_proxy})
        for proxy in dbuser.proxies:
            if proxy.type not in modify.proxies:
                db.delete(proxy)
    if modify.inbounds:
        for proxy_type, tags in modify.excluded_inbounds.items():
            dbproxy = db.query(Proxy) \
                .where(Proxy.user == dbuser, Proxy.type == proxy_type) \
                .first() or added_proxies.get(proxy_type)
            if dbproxy:
                dbproxy.excluded_inbounds = [get_or_create_inbound(db, tag) for tag in tags]

    if modify.status is not None:
        dbuser.status = modify.status

    if modify.data_limit is not None:
        runtime_settings = get_runtime_settings()
        dbuser.data_limit = (modify.data_limit or None)
        if dbuser.status not in (UserStatus.expired, UserStatus.disabled):
            if not dbuser.data_limit or dbuser.used_traffic < dbuser.data_limit:
                if dbuser.status != UserStatus.on_hold:
                    dbuser.status = UserStatus.active

                for percent in sorted(runtime_settings.notify_reached_usage_percent, reverse=True):
                    if not dbuser.data_limit or (calculate_usage_percent(
                            dbuser.used_traffic, dbuser.data_limit) < percent):
                        reminder = get_notification_reminder(db, dbuser.id, ReminderType.data_usage, threshold=percent)
                        if reminder:
                            delete_notification_reminder(db, reminder)

            else:
                dbuser.status = UserStatus.limited

    if modify.expire is not None:
        runtime_settings = get_runtime_settings()
        dbuser.expire = (modify.expire or None)
        if dbuser.status in (UserStatus.active, UserStatus.expired):
            if not dbuser.expire or dbuser.expire > datetime.utcnow().timestamp():
                dbuser.status = UserStatus.active
                for days_left in sorted(runtime_settings.notify_days_left):
                    if not dbuser.expire or (calculate_expiration_days(
                            dbuser.expire) > days_left):
                        reminder = get_notification_reminder(
                            db, dbuser.id, ReminderType.expiration_date, threshold=days_left)
                        if reminder:
                            delete_notification_reminder(db, reminder)
            else:
                dbuser.status = UserStatus.expired

    if modify.note is not None:
        dbuser.note = modify.note or None

    if modify.data_limit_reset_strategy is not None:
        dbuser.data_limit_reset_strategy = modify.data_limit_reset_strategy.value

    if modify.on_hold_timeout is not None:
        dbuser.on_hold_timeout = modify.on_hold_timeout

    if modify.on_hold_expire_duration is not None:
        dbuser.on_hold_expire_duration = modify.on_hold_expire_duration

    if modify.next_plan is not None:
        dbuser.next_plan = NextPlan(
            data_limit=modify.next_plan.data_limit,
            expire=modify.next_plan.expire,
            add_remaining_traffic=modify.next_plan.add_remaining_traffic,
            fire_on_either=modify.next_plan.fire_on_either,
        )
    elif dbuser.next_plan is not None:
        db.delete(dbuser.next_plan)

    dbuser.edit_at = datetime.utcnow()

    db.commit()
    db.refresh(dbuser)
    return dbuser


def reset_user_data_usage(db: Session, dbuser: User) -> User:
    """
    Resets the data usage of a user and logs the reset.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose data usage is to be reset.

    Returns:
        User: The updated user object.
    """
    usage_log = UserUsageResetLogs(
        user=dbuser,
        used_traffic_at_reset=dbuser.used_traffic,
    )
    db.add(usage_log)

    dbuser.used_traffic = 0
    dbuser.node_usages.clear()
    if dbuser.status not in (UserStatus.expired or UserStatus.disabled):
        dbuser.status = UserStatus.active.value

    if dbuser.next_plan:
        db.delete(dbuser.next_plan)
        dbuser.next_plan = None
    db.add(dbuser)

    db.commit()
    db.refresh(dbuser)
    return dbuser


def reset_user_by_next(db: Session, dbuser: User) -> User:
    """
    Resets the data usage of a user based on next user.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose data usage is to be reset.

    Returns:
        User: The updated user object.
    """

    if (dbuser.next_plan is None):
        return

    usage_log = UserUsageResetLogs(
        user=dbuser,
        used_traffic_at_reset=dbuser.used_traffic,
    )
    db.add(usage_log)

    dbuser.node_usages.clear()
    dbuser.status = UserStatus.active.value

    dbuser.data_limit = dbuser.next_plan.data_limit + \
        (0 if dbuser.next_plan.add_remaining_traffic else dbuser.data_limit - dbuser.used_traffic)
    dbuser.expire = dbuser.next_plan.expire

    dbuser.used_traffic = 0
    db.delete(dbuser.next_plan)
    dbuser.next_plan = None
    db.add(dbuser)

    db.commit()
    db.refresh(dbuser)
    return dbuser


def revoke_user_sub(db: Session, dbuser: User) -> User:
    """
    Revokes the subscription of a user and updates proxies settings.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose subscription is to be revoked.

    Returns:
        User: The updated user object.
    """
    dbuser.sub_revoked_at = datetime.utcnow()

    user = UserResponse.model_validate(dbuser)
    for proxy_type, settings in user.proxies.copy().items():
        settings.revoke()
        user.proxies[proxy_type] = settings
    dbuser = update_user(db, dbuser, user)

    db.commit()
    db.refresh(dbuser)
    return dbuser


def update_user_sub(db: Session, dbuser: User, user_agent: str) -> User:
    """
    Updates the user's subscription details.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose subscription is to be updated.
        user_agent (str): The user agent string to update.

    Returns:
        User: The updated user object.
    """
    dbuser.sub_updated_at = datetime.utcnow()
    dbuser.sub_last_user_agent = user_agent

    db.commit()
    db.refresh(dbuser)
    return dbuser


def reset_all_users_data_usage(db: Session, admin: Optional[Admin] = None):
    """
    Resets the data usage for all users or users under a specific admin.

    Args:
        db (Session): Database session.
        admin (Optional[Admin]): Admin to filter users by, if any.
    """
    query = get_user_queryset(db)

    if admin:
        query = query.filter(User.admin == admin)

    for dbuser in query.all():
        dbuser.used_traffic = 0
        if dbuser.status not in [UserStatus.on_hold, UserStatus.expired, UserStatus.disabled]:
            dbuser.status = UserStatus.active
        dbuser.usage_logs.clear()
        dbuser.node_usages.clear()
        if dbuser.next_plan:
            db.delete(dbuser.next_plan)
            dbuser.next_plan = None
        db.add(dbuser)

    db.commit()


def disable_all_active_users(db: Session, admin: Optional[Admin] = None):
    """
    Disable all active users or users under a specific admin.

    Args:
        db (Session): Database session.
        admin (Optional[Admin]): Admin to filter users by, if any.
    """
    query = db.query(User).filter(User.status.in_((UserStatus.active, UserStatus.on_hold)))
    if admin:
        query = query.filter(User.admin == admin)

    query.update({User.status: UserStatus.disabled, User.last_status_change: datetime.utcnow()}, synchronize_session=False)

    db.commit()


def activate_all_disabled_users(db: Session, admin: Optional[Admin] = None):
    """
    Activate all disabled users or users under a specific admin.

    Args:
        db (Session): Database session.
        admin (Optional[Admin]): Admin to filter users by, if any.
    """
    query_for_active_users = db.query(User).filter(User.status == UserStatus.disabled)
    query_for_on_hold_users = db.query(User).filter(
        and_(
            User.status == UserStatus.disabled, User.expire.is_(
                None), User.on_hold_expire_duration.isnot(None), User.online_at.is_(None)
        ))
    if admin:
        query_for_active_users = query_for_active_users.filter(User.admin == admin)
        query_for_on_hold_users = query_for_on_hold_users.filter(User.admin == admin)

    query_for_on_hold_users.update(
        {User.status: UserStatus.on_hold, User.last_status_change: datetime.utcnow()}, synchronize_session=False)
    query_for_active_users.update(
        {User.status: UserStatus.active, User.last_status_change: datetime.utcnow()}, synchronize_session=False)

    db.commit()


def autodelete_expired_users(db: Session,
                             include_limited_users: bool = False) -> List[User]:
    """
    Deletes expired (optionally also limited) users whose auto-delete time has passed.

    Args:
        db (Session): Database session
        include_limited_users (bool, optional): Whether to delete limited users as well.
            Defaults to False.

    Returns:
        list[User]: List of deleted users.
    """
    target_status = (
        [UserStatus.expired] if not include_limited_users
        else [UserStatus.expired, UserStatus.limited]
    )

    auto_delete = coalesce(User.auto_delete_in_days, USERS_AUTODELETE_DAYS)

    query = db.query(
        User, auto_delete,  # Use global auto-delete days as fallback
    ).filter(
        auto_delete >= 0,  # Negative values prevent auto-deletion
        User.status.in_(target_status),
    ).options(joinedload(User.admin))

    # TODO: Handle time filter in query itself (NOTE: Be careful with sqlite's strange datetime handling)
    expired_users = [
        user
        for (user, auto_delete) in query
        if user.last_status_change + timedelta(days=auto_delete) <= datetime.utcnow()
    ]

    if expired_users:
        remove_users(db, expired_users)

    return expired_users


def get_all_users_usages(
        db: Session, admin: Admin, start: datetime, end: datetime
) -> List[UserUsageResponse]:
    """
    Retrieves usage data for all users associated with an admin within a specified time range.

    This function calculates the total traffic used by users across remote nodes.

    Args:
        db (Session): Database session for querying.
        admin (Admin): The admin user for which to retrieve user usage data.
        start (datetime): The start date and time of the period to consider.
        end (datetime): The end date and time of the period to consider.

    Returns:
        List[UserUsageResponse]: A list of UserUsageResponse objects, each representing
        the usage data for a specific node.
    """
    usages = {}

    for node in db.query(Node).all():
        usages[node.id] = UserUsageResponse(
            node_id=node.id,
            node_name=node.name,
            used_traffic=0
        )

    admin_users = set(user.id for user in get_users(db=db, admins=admin))

    cond = and_(
        NodeUserUsage.created_at >= start,
        NodeUserUsage.created_at <= end,
        NodeUserUsage.user_id.in_(admin_users),
        NodeUserUsage.node_id.isnot(None),
    )

    for v in db.query(NodeUserUsage).filter(cond):
        try:
            usages[v.node_id].used_traffic += v.used_traffic
        except KeyError:
            pass

    return list(usages.values())


def update_user_status(db: Session, dbuser: User, status: UserStatus) -> User:
    """
    Updates a user's status and records the time of change.

    Args:
        db (Session): Database session.
        dbuser (User): The user to update.
        status (UserStatus): The new status.

    Returns:
        User: The updated user object.
    """
    dbuser.status = status
    dbuser.last_status_change = datetime.utcnow()
    db.commit()
    db.refresh(dbuser)
    return dbuser


def set_owner(db: Session, dbuser: User, admin: Admin) -> User:
    """
    Sets the owner (admin) of a user.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose owner is to be set.
        admin (Admin): The admin to set as owner.

    Returns:
        User: The updated user object.
    """
    dbuser.admin = admin
    db.commit()
    db.refresh(dbuser)
    return dbuser


def start_user_expire(db: Session, dbuser: User) -> User:
    """
    Starts the expiration timer for a user.

    Args:
        db (Session): Database session.
        dbuser (User): The user object whose expiration timer is to be started.

    Returns:
        User: The updated user object.
    """
    expire = int(datetime.utcnow().timestamp()) + dbuser.on_hold_expire_duration
    dbuser.expire = expire
    dbuser.on_hold_expire_duration = None
    dbuser.on_hold_timeout = None
    db.commit()
    db.refresh(dbuser)
    return dbuser


def get_system_usage(db: Session) -> System:
    """
    Retrieves system usage information.

    Args:
        db (Session): Database session.

    Returns:
        System: System usage information.
    """
    return db.query(System).first()


def get_jwt_secret_key(db: Session) -> str:
    """
    Retrieves the JWT secret key.

    Args:
        db (Session): Database session.

    Returns:
        str: JWT secret key.
    """
    return db.query(JWT).first().secret_key


def get_tls_certificate(db: Session) -> TLS:
    """
    Retrieves the TLS certificate.

    Args:
        db (Session): Database session.

    Returns:
        TLS: TLS certificate information.
    """
    return db.query(TLS).first()


def get_admin(db: Session, username: str) -> Admin:
    """
    Retrieves an admin by username.

    Args:
        db (Session): Database session.
        username (str): The username of the admin.

    Returns:
        Admin: The admin object.
    """
    return db.query(Admin).filter(Admin.username == username).first()


def create_admin(db: Session, admin: AdminCreate) -> Admin:
    """
    Creates a new admin in the database.

    Args:
        db (Session): Database session.
        admin (AdminCreate): The admin creation data.

    Returns:
        Admin: The created admin object.
    """
    dbadmin = Admin(
        username=admin.username,
        hashed_password=admin.hashed_password,
        is_sudo=admin.is_sudo,
        telegram_id=admin.telegram_id if admin.telegram_id else None,
        discord_webhook=admin.discord_webhook if admin.discord_webhook else None
    )
    db.add(dbadmin)
    db.commit()
    db.refresh(dbadmin)
    return dbadmin


def update_admin(db: Session, dbadmin: Admin, modified_admin: AdminModify) -> Admin:
    """
    Updates an admin's details.

    Args:
        db (Session): Database session.
        dbadmin (Admin): The admin object to be updated.
        modified_admin (AdminModify): The modified admin data.

    Returns:
        Admin: The updated admin object.
    """
    if modified_admin.is_sudo:
        dbadmin.is_sudo = modified_admin.is_sudo
    if modified_admin.password is not None and dbadmin.hashed_password != modified_admin.hashed_password:
        dbadmin.hashed_password = modified_admin.hashed_password
        dbadmin.password_reset_at = datetime.utcnow()
    if modified_admin.telegram_id:
        dbadmin.telegram_id = modified_admin.telegram_id
    if modified_admin.discord_webhook:
        dbadmin.discord_webhook = modified_admin.discord_webhook

    db.commit()
    db.refresh(dbadmin)
    return dbadmin


def partial_update_admin(db: Session, dbadmin: Admin, modified_admin: AdminPartialModify) -> Admin:
    """
    Partially updates an admin's details.

    Args:
        db (Session): Database session.
        dbadmin (Admin): The admin object to be updated.
        modified_admin (AdminPartialModify): The modified admin data.

    Returns:
        Admin: The updated admin object.
    """
    if modified_admin.is_sudo is not None:
        dbadmin.is_sudo = modified_admin.is_sudo
    if modified_admin.password is not None and dbadmin.hashed_password != modified_admin.hashed_password:
        dbadmin.hashed_password = modified_admin.hashed_password
        dbadmin.password_reset_at = datetime.utcnow()
    if modified_admin.telegram_id is not None:
        dbadmin.telegram_id = modified_admin.telegram_id
    if modified_admin.discord_webhook is not None:
        dbadmin.discord_webhook = modified_admin.discord_webhook

    db.commit()
    db.refresh(dbadmin)
    return dbadmin


def remove_admin(db: Session, dbadmin: Admin) -> Admin:
    """
    Removes an admin from the database.

    Args:
        db (Session): Database session.
        dbadmin (Admin): The admin object to be removed.

    Returns:
        Admin: The removed admin object.
    """
    db.delete(dbadmin)
    db.commit()
    return dbadmin


def get_admin_by_id(db: Session, id: int) -> Admin:
    """
    Retrieves an admin by their ID.

    Args:
        db (Session): Database session.
        id (int): The ID of the admin.

    Returns:
        Admin: The admin object.
    """
    return db.query(Admin).filter(Admin.id == id).first()


def get_admin_by_telegram_id(db: Session, telegram_id: int) -> Admin:
    """
    Retrieves an admin by their Telegram ID.

    Args:
        db (Session): Database session.
        telegram_id (int): The Telegram ID of the admin.

    Returns:
        Admin: The admin object.
    """
    return db.query(Admin).filter(Admin.telegram_id == telegram_id).first()


def get_admins(db: Session,
               offset: Optional[int] = None,
               limit: Optional[int] = None,
               username: Optional[str] = None) -> List[Admin]:
    """
    Retrieves a list of admins with optional filters and pagination.

    Args:
        db (Session): Database session.
        offset (Optional[int]): The number of records to skip (for pagination).
        limit (Optional[int]): The maximum number of records to return.
        username (Optional[str]): The username to filter by.

    Returns:
        List[Admin]: A list of admin objects.
    """
    query = db.query(Admin)
    if username:
        query = query.filter(Admin.username.ilike(f'%{username}%'))
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    return query.all()


def reset_admin_usage(db: Session, dbadmin: Admin) -> int:
    """
    Retrieves an admin's usage by their username.
    Args:
        db (Session): Database session.
        dbadmin (Admin): The admin object to be updated.
    Returns:
        Admin: The updated admin.
    """
    if (dbadmin.users_usage == 0):
        return dbadmin

    usage_log = AdminUsageLogs(
        admin=dbadmin,
        used_traffic_at_reset=dbadmin.users_usage
    )
    db.add(usage_log)
    dbadmin.users_usage = 0

    db.commit()
    db.refresh(dbadmin)
    return dbadmin


def create_user_template(db: Session, user_template: UserTemplateCreate) -> UserTemplate:
    """
    Creates a new user template in the database.

    Args:
        db (Session): Database session.
        user_template (UserTemplateCreate): The user template creation data.

    Returns:
        UserTemplate: The created user template object.
    """
    inbound_tags: List[str] = []
    for _, i in user_template.inbounds.items():
        inbound_tags.extend(i)
    dbuser_template = UserTemplate(
        name=user_template.name,
        data_limit=user_template.data_limit,
        expire_duration=user_template.expire_duration,
        username_prefix=user_template.username_prefix,
        username_suffix=user_template.username_suffix,
        inbounds=db.query(ProxyInbound).filter(ProxyInbound.tag.in_(inbound_tags)).all()
    )
    db.add(dbuser_template)
    db.commit()
    db.refresh(dbuser_template)
    return dbuser_template


def update_user_template(
        db: Session, dbuser_template: UserTemplate, modified_user_template: UserTemplateModify) -> UserTemplate:
    """
    Updates a user template's details.

    Args:
        db (Session): Database session.
        dbuser_template (UserTemplate): The user template object to be updated.
        modified_user_template (UserTemplateModify): The modified user template data.

    Returns:
        UserTemplate: The updated user template object.
    """
    if modified_user_template.name is not None:
        dbuser_template.name = modified_user_template.name
    if modified_user_template.data_limit is not None:
        dbuser_template.data_limit = modified_user_template.data_limit
    if modified_user_template.expire_duration is not None:
        dbuser_template.expire_duration = modified_user_template.expire_duration
    if modified_user_template.username_prefix is not None:
        dbuser_template.username_prefix = modified_user_template.username_prefix
    if modified_user_template.username_suffix is not None:
        dbuser_template.username_suffix = modified_user_template.username_suffix

    if modified_user_template.inbounds:
        inbound_tags: List[str] = []
        for _, i in modified_user_template.inbounds.items():
            inbound_tags.extend(i)
        dbuser_template.inbounds = db.query(ProxyInbound).filter(ProxyInbound.tag.in_(inbound_tags)).all()

    db.commit()
    db.refresh(dbuser_template)
    return dbuser_template


def remove_user_template(db: Session, dbuser_template: UserTemplate):
    """
    Removes a user template from the database.

    Args:
        db (Session): Database session.
        dbuser_template (UserTemplate): The user template object to be removed.
    """
    db.delete(dbuser_template)
    db.commit()


def get_user_template(db: Session, user_template_id: int) -> UserTemplate:
    """
    Retrieves a user template by its ID.

    Args:
        db (Session): Database session.
        user_template_id (int): The ID of the user template.

    Returns:
        UserTemplate: The user template object.
    """
    return db.query(UserTemplate).filter(UserTemplate.id == user_template_id).first()


def get_user_templates(
        db: Session, offset: Union[int, None] = None, limit: Union[int, None] = None) -> List[UserTemplate]:
    """
    Retrieves a list of user templates with optional pagination.

    Args:
        db (Session): Database session.
        offset (Union[int, None]): The number of records to skip (for pagination).
        limit (Union[int, None]): The maximum number of records to return.

    Returns:
        List[UserTemplate]: A list of user template objects.
    """
    dbuser_templates = db.query(UserTemplate)
    if offset:
        dbuser_templates = dbuser_templates.offset(offset)
    if limit:
        dbuser_templates = dbuser_templates.limit(limit)

    return dbuser_templates.all()


def get_node(db: Session, name: str) -> Optional[Node]:
    """
    Retrieves a node by its name.

    Args:
        db (Session): The database session.
        name (str): The name of the node to retrieve.

    Returns:
        Optional[Node]: The Node object if found, None otherwise.
    """
    return db.query(Node).filter(Node.name == name).first()


def get_node_by_id(db: Session, node_id: int) -> Optional[Node]:
    """
    Retrieves a node by its ID.

    Args:
        db (Session): The database session.
        node_id (int): The ID of the node to retrieve.

    Returns:
        Optional[Node]: The Node object if found, None otherwise.
    """
    return db.query(Node).filter(Node.id == node_id).first()


def get_node_certificates(db: Session, node_id: int) -> List[NodeCertificate]:
    return (
        db.query(NodeCertificate)
        .options(joinedload(NodeCertificate.inbounds))
        .filter(NodeCertificate.node_id == node_id)
        .order_by(NodeCertificate.domain)
        .all()
    )


def get_all_node_certificates(db: Session) -> List[NodeCertificate]:
    return (
        db.query(NodeCertificate)
        .options(joinedload(NodeCertificate.inbounds))
        .order_by(NodeCertificate.node_id, NodeCertificate.domain)
        .all()
    )


def get_node_certificate(
    db: Session, node_id: int, certificate_id: int
) -> Optional[NodeCertificate]:
    return (
        db.query(NodeCertificate)
        .options(joinedload(NodeCertificate.inbounds))
        .filter(
            NodeCertificate.node_id == node_id,
            NodeCertificate.id == certificate_id,
        )
        .first()
    )


def upsert_node_certificate(
    db: Session,
    node_id: int,
    domain: str,
    certificate: str,
    private_key: str,
    expires_at: Optional[datetime],
    certificate_file: Optional[str] = None,
    key_file: Optional[str] = None,
) -> NodeCertificate:
    dbcertificate = (
        db.query(NodeCertificate)
        .filter(
            NodeCertificate.node_id == node_id,
            NodeCertificate.domain == domain,
        )
        .first()
    )
    if dbcertificate:
        dbcertificate.certificate = certificate
        dbcertificate.private_key = private_key
        dbcertificate.certificate_file = certificate_file
        dbcertificate.key_file = key_file
        dbcertificate.expires_at = expires_at
        dbcertificate.updated_at = datetime.utcnow()
    else:
        dbcertificate = NodeCertificate(
            node_id=node_id,
            domain=domain,
            certificate=certificate,
            private_key=private_key,
            certificate_file=certificate_file,
            key_file=key_file,
            expires_at=expires_at,
        )
        db.add(dbcertificate)

    db.commit()
    db.refresh(dbcertificate)
    return dbcertificate


def update_node_certificate(
    db: Session,
    dbcertificate: NodeCertificate,
    modify: NodeCertificateModify,
) -> NodeCertificate:
    if modify.active is not None:
        dbcertificate.active = modify.active
    dbcertificate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dbcertificate)
    return dbcertificate


def remove_node_certificate(db: Session, dbcertificate: NodeCertificate) -> None:
    db.delete(dbcertificate)
    db.commit()


def get_node_geo_resource_updates(
    db: Session, node_id: int
) -> List[NodeGeoResourceUpdate]:
    return (
        db.query(NodeGeoResourceUpdate)
        .filter(NodeGeoResourceUpdate.node_id == node_id)
        .order_by(NodeGeoResourceUpdate.filename)
        .all()
    )


def get_node_geo_resource_update(
    db: Session, node_id: int, filename: str
) -> Optional[NodeGeoResourceUpdate]:
    return (
        db.query(NodeGeoResourceUpdate)
        .filter(
            NodeGeoResourceUpdate.node_id == node_id,
            NodeGeoResourceUpdate.filename == filename,
        )
        .first()
    )


def get_due_node_geo_resource_updates(
    db: Session, now: datetime
) -> List[NodeGeoResourceUpdate]:
    return (
        db.query(NodeGeoResourceUpdate)
        .options(joinedload(NodeGeoResourceUpdate.node))
        .filter(NodeGeoResourceUpdate.next_run_at <= now)
        .all()
    )


def upsert_node_geo_resource_update(
    db: Session,
    node_id: int,
    filename: str,
    url: str,
    cron: str,
    next_run_at: datetime,
) -> NodeGeoResourceUpdate:
    resource = get_node_geo_resource_update(db, node_id, filename)
    if resource:
        resource.url = url
        resource.cron = cron
        resource.next_run_at = next_run_at
        resource.updated_at = datetime.utcnow()
    else:
        resource = NodeGeoResourceUpdate(
            node_id=node_id,
            filename=filename,
            url=url,
            cron=cron,
            next_run_at=next_run_at,
        )
        db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def update_node_geo_resource_result(
    db: Session,
    resource: NodeGeoResourceUpdate,
    next_run_at: datetime,
    error: Optional[str] = None,
) -> NodeGeoResourceUpdate:
    resource.next_run_at = next_run_at
    resource.last_error = error
    resource.last_error_at = datetime.utcnow() if error else None
    resource.updated_at = datetime.utcnow()
    if error is None:
        resource.last_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(resource)
    return resource


def rename_node_geo_resource_update(
    db: Session, resource: NodeGeoResourceUpdate, filename: str
) -> NodeGeoResourceUpdate:
    resource.filename = filename
    resource.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(resource)
    return resource


def remove_node_geo_resource_update(
    db: Session, resource: NodeGeoResourceUpdate
) -> None:
    db.delete(resource)
    db.commit()


def get_nodes(db: Session,
              status: Optional[Union[NodeStatus, list]] = None,
              enabled: bool = None) -> List[Node]:
    """
    Retrieves nodes based on optional status and enabled filters.

    Args:
        db (Session): The database session.
        status (Optional[Union[NodeStatus, list]]): The status or list of statuses to filter by.
        enabled (bool): If True, excludes disabled nodes.

    Returns:
        List[Node]: A list of Node objects matching the criteria.
    """
    query = db.query(Node)

    if status:
        if isinstance(status, list):
            query = query.filter(Node.status.in_(status))
        else:
            query = query.filter(Node.status == status)

    if enabled:
        query = query.filter(Node.status != NodeStatus.disabled)

    return query.all()


def get_nodes_usage(db: Session, start: datetime, end: datetime) -> List[NodeUsageResponse]:
    """
    Retrieves usage data for all nodes within a specified time range.

    Args:
        db (Session): The database session.
        start (datetime): The start time of the usage period.
        end (datetime): The end time of the usage period.

    Returns:
        List[NodeUsageResponse]: A list of NodeUsageResponse objects containing usage data.
    """
    usages = {}

    for node in db.query(Node).all():
        usages[node.id] = NodeUsageResponse(
            node_id=node.id,
            node_name=node.name,
            uplink=0,
            downlink=0
        )

    cond = and_(
        NodeUsage.created_at >= start,
        NodeUsage.created_at <= end,
        NodeUsage.node_id.isnot(None),
    )

    for v in db.query(NodeUsage).filter(cond):
        try:
            usages[v.node_id].uplink += v.uplink
            usages[v.node_id].downlink += v.downlink
        except KeyError:
            pass

    return list(usages.values())


def _stats_bucket_start(value: datetime, granularity: StatsGranularity) -> datetime:
    value = value.replace(tzinfo=None)
    if granularity == StatsGranularity.week:
        value -= timedelta(days=value.weekday())
    if granularity == StatsGranularity.month:
        return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_stats_bucket(value: datetime, granularity: StatsGranularity) -> datetime:
    if granularity == StatsGranularity.day:
        return value + timedelta(days=1)
    if granularity == StatsGranularity.week:
        return value + timedelta(weeks=1)
    if value.month == 12:
        return value.replace(year=value.year + 1, month=1)
    return value.replace(month=value.month + 1)


def get_stats_history(
    db: Session,
    start: datetime,
    end: datetime,
    granularity: StatsGranularity,
) -> StatsHistoryResponse:
    """Aggregate recorded traffic and user registrations into time buckets."""
    query_start = start.astimezone(timezone.utc).replace(tzinfo=None)
    query_end = end.astimezone(timezone.utc).replace(tzinfo=None)
    first_bucket = _stats_bucket_start(query_start, granularity)

    buckets = []
    bucket = first_bucket
    while bucket <= query_end:
        buckets.append(bucket)
        bucket = _next_stats_bucket(bucket, granularity)

    nodes = db.query(Node).order_by(Node.name).all()
    traffic_by_node = {
        node.id: {period: [0, 0] for period in buckets}
        for node in nodes
    }
    usage_rows = db.query(NodeUsage).filter(
        NodeUsage.created_at >= query_start,
        NodeUsage.created_at <= query_end,
        NodeUsage.node_id.isnot(None),
    )
    for usage in usage_rows:
        if usage.node_id not in traffic_by_node:
            continue
        period = _stats_bucket_start(usage.created_at, granularity)
        values = traffic_by_node[usage.node_id].get(period)
        if values is not None:
            values[0] += usage.uplink or 0
            values[1] += usage.downlink or 0

    traffic = [
        NodeTrafficSeries(
            node_id=node.id,
            node_name=node.name,
            points=[
                NodeTrafficPoint(
                    period=period,
                    uplink=values[0],
                    downlink=values[1],
                    total=values[0] + values[1],
                )
                for period, values in traffic_by_node[node.id].items()
            ],
        )
        for node in nodes
    ]

    user_counts = {period: 0 for period in buckets}
    created_rows = db.query(User.created_at).filter(
        User.created_at >= query_start,
        User.created_at <= query_end,
    )
    for (created_at,) in created_rows:
        period = _stats_bucket_start(created_at, granularity)
        if period in user_counts:
            user_counts[period] += 1

    running_total = db.query(func.count(User.id)).filter(
        User.created_at < query_start
    ).scalar() or 0
    users = []
    previous_count = None
    for period, count in user_counts.items():
        running_total += count
        growth_percent = None
        if previous_count is not None:
            if previous_count:
                growth_percent = round(
                    ((count - previous_count) / previous_count) * 100,
                    2,
                )
            else:
                growth_percent = 100.0 if count else 0.0
        users.append(
            UserGrowthPoint(
                period=period,
                count=count,
                total=running_total,
                growth_percent=growth_percent,
            )
        )
        previous_count = count

    return StatsHistoryResponse(
        start=start,
        end=end,
        granularity=granularity,
        traffic=traffic,
        users=users,
    )


def create_node(db: Session, node: NodeCreate) -> Node:
    """
    Creates a new node in the database.

    Args:
        db (Session): The database session.
        node (NodeCreate): The node creation model containing node details.

    Returns:
        Node: The newly created Node object.
    """
    dbnode = Node(name=node.name,
                  address=node.address,
                  port=node.port,
                  api_port=node.api_port)
    dbnode.inbounds = (
        db.query(ProxyInbound)
        .filter(ProxyInbound.readonly.is_(True))
        .all()
    )
    dbnode.outbounds = (
        db.query(ProxyOutbound)
        .filter(ProxyOutbound.readonly.is_(True))
        .all()
    )
    dbnode.routing_rules = (
        db.query(RoutingRule)
        .filter(RoutingRule.readonly.is_(True))
        .all()
    )

    db.add(dbnode)
    db.commit()
    db.refresh(dbnode)
    return dbnode


def remove_node(db: Session, dbnode: Node) -> Node:
    """
    Removes a node and all data owned by it from the database.

    Shared inbounds, outbounds, and routing rules are preserved. Only their
    assignments to the deleted node are removed.

    Args:
        db (Session): The database session.
        dbnode (Node): The Node object to be removed.

    Returns:
        Node: The removed Node object.
    """
    dbnode.inbounds.clear()
    dbnode.outbounds.clear()
    dbnode.routing_rules.clear()

    for certificate in list(dbnode.certificates):
        certificate.inbounds.clear()
        db.delete(certificate)

    db.query(NodeUserUsage).filter(NodeUserUsage.node_id == dbnode.id).delete(
        synchronize_session=False
    )
    db.query(NodeUsage).filter(NodeUsage.node_id == dbnode.id).delete(
        synchronize_session=False
    )
    db.delete(dbnode)
    db.commit()
    return dbnode


def update_node(db: Session, dbnode: Node, modify: NodeModify) -> Node:
    """
    Updates an existing node with new information.

    Args:
        db (Session): The database session.
        dbnode (Node): The Node object to be updated.
        modify (NodeModify): The modification model containing updated node details.

    Returns:
        Node: The updated Node object.
    """
    if modify.name is not None:
        dbnode.name = modify.name

    if modify.address is not None:
        dbnode.address = modify.address

    if modify.port is not None:
        dbnode.port = modify.port

    if modify.api_port is not None:
        dbnode.api_port = modify.api_port

    if modify.status is NodeStatus.disabled:
        dbnode.status = modify.status
        dbnode.xray_version = None
        dbnode.message = None
    else:
        dbnode.status = NodeStatus.connecting

    if modify.usage_coefficient:
        dbnode.usage_coefficient = modify.usage_coefficient

    db.commit()
    db.refresh(dbnode)
    return dbnode


def update_node_status(db: Session, dbnode: Node, status: NodeStatus, message: str = None, version: str = None) -> Node:
    """
    Updates the status of a node.

    Args:
        db (Session): The database session.
        dbnode (Node): The Node object to be updated.
        status (NodeStatus): The new status of the node.
        message (str, optional): A message associated with the status update.
        version (str, optional): The version of the node software.

    Returns:
        Node: The updated Node object.
    """
    dbnode.status = status
    dbnode.message = message
    dbnode.xray_version = version
    dbnode.last_status_change = datetime.utcnow()
    db.commit()
    db.refresh(dbnode)
    return dbnode


def create_notification_reminder(
        db: Session, reminder_type: ReminderType, expires_at: datetime, user_id: int, threshold: Optional[int] = None) -> NotificationReminder:
    """
    Creates a new notification reminder.

    Args:
        db (Session): The database session.
        reminder_type (ReminderType): The type of reminder.
        expires_at (datetime): The expiration time of the reminder.
        user_id (int): The ID of the user associated with the reminder.
        threshold (Optional[int]): The threshold value to check for (e.g., days left or usage percent).

    Returns:
        NotificationReminder: The newly created NotificationReminder object.
    """
    reminder = NotificationReminder(type=reminder_type, expires_at=expires_at, user_id=user_id)
    if threshold is not None:
        reminder.threshold = threshold
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_notification_reminder(
        db: Session, user_id: int, reminder_type: ReminderType, threshold: Optional[int] = None
) -> Union[NotificationReminder, None]:
    """
    Retrieves a notification reminder for a user.

    Args:
        db (Session): The database session.
        user_id (int): The ID of the user.
        reminder_type (ReminderType): The type of reminder to retrieve.
        threshold (Optional[int]): The threshold value to check for (e.g., days left or usage percent).

    Returns:
        Union[NotificationReminder, None]: The NotificationReminder object if found and not expired, None otherwise.
    """
    query = db.query(NotificationReminder).filter(
        NotificationReminder.user_id == user_id,
        NotificationReminder.type == reminder_type
    )

    # If a threshold is provided, filter for reminders with this threshold
    if threshold is not None:
        query = query.filter(NotificationReminder.threshold == threshold)

    reminder = query.first()

    if reminder is None:
        return None

    # Check if the reminder has expired
    if reminder.expires_at and reminder.expires_at < datetime.utcnow():
        db.delete(reminder)
        db.commit()
        return None

    return reminder


def delete_notification_reminder_by_type(
        db: Session, user_id: int, reminder_type: ReminderType, threshold: Optional[int] = None
) -> None:
    """
    Deletes a notification reminder for a user based on the reminder type and optional threshold.

    Args:
        db (Session): The database session.
        user_id (int): The ID of the user.
        reminder_type (ReminderType): The type of reminder to delete.
        threshold (Optional[int]): The threshold to delete (e.g., days left or usage percent). If not provided, deletes all reminders of that type.
    """
    stmt = delete(NotificationReminder).where(
        NotificationReminder.user_id == user_id,
        NotificationReminder.type == reminder_type
    )

    # If a threshold is provided, include it in the filter
    if threshold is not None:
        stmt = stmt.where(NotificationReminder.threshold == threshold)

    db.execute(stmt)
    db.commit()


def delete_notification_reminder(db: Session, dbreminder: NotificationReminder) -> None:
    """
    Deletes a specific notification reminder.

    Args:
        db (Session): The database session.
        dbreminder (NotificationReminder): The NotificationReminder object to delete.
    """
    db.delete(dbreminder)
    db.commit()
    return


def count_online_users(db: Session, hours: int = 24):
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(func.count(User.id)).filter(User.online_at.isnot(
        None), User.online_at >= twenty_four_hours_ago)
    return query.scalar()
