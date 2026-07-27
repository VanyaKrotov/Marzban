"""Domain CRUD helpers extracted from the former app.db.crud module."""

from datetime import datetime
from copy import deepcopy
from typing import List, Optional, Union

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db.models.nodes import Node
from app.db.models.usages import NodeUsage, NodeUserUsage
from app.models.node import NodeCreate, NodeModify, NodeStatus, NodeUsageResponse
from app.models.settings import default_node_config


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

def create_node(db: Session, node: NodeCreate, config_template: dict | None = None) -> Node:
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
                  api_port=node.api_port,
                  access_log_enabled=node.access_log_enabled,
                  error_log_enabled=node.error_log_enabled,
                  log_retention_days=node.log_retention_days,
                  log_storage_limit_bytes=node.log_storage_limit_bytes,
                  config_template=deepcopy(config_template or default_node_config()))

    db.add(dbnode)
    db.commit()
    db.refresh(dbnode)
    return dbnode


def update_node_config_template(db: Session, dbnode: Node, config_template: dict) -> Node:
    dbnode.config_template = deepcopy(config_template)
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

    if modify.usage_coefficient is not None:
        dbnode.usage_coefficient = modify.usage_coefficient

    for field in (
        "access_log_enabled",
        "error_log_enabled",
        "log_retention_days",
        "log_storage_limit_bytes",
    ):
        if field in modify.model_fields_set:
            setattr(dbnode, field, getattr(modify, field))

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
