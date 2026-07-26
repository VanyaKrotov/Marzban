"""Domain CRUD helpers extracted from the former app.db.crud module."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.db.models.node_geo_resources import NodeGeoResourceUpdate

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
