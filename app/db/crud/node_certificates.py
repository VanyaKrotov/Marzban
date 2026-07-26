"""Domain CRUD helpers extracted from the former app.db.crud module."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.db.models.node_certificates import NodeCertificate
from app.models.node import NodeCertificateModify

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
