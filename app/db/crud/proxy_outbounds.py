"""Domain CRUD helpers extracted from the former app.db.crud module."""

from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.db.models.nodes import Node
from app.db.models.proxies import ProxyOutbound
from app.models.proxy import OutboundCreate, OutboundModify

def get_outbounds(db: Session, node_id: int | None = None) -> List[ProxyOutbound]:
    query = db.query(ProxyOutbound).options(joinedload(ProxyOutbound.nodes))
    if node_id is not None:
        query = query.join(ProxyOutbound.nodes).filter(Node.id == node_id)
    return query.order_by(ProxyOutbound.tag).all()


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
        dboutbound.enabled = True if dboutbound.readonly else modified.enabled
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
    if dboutbound.readonly:
        raise ValueError("Read-only outbounds cannot be deleted")
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
