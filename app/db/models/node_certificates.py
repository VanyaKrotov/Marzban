from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.models.associations import node_certificate_inbounds_association


class NodeCertificate(Base):
    __tablename__ = "node_certificates"
    __table_args__ = (UniqueConstraint("node_id", "domain"),)

    id = Column(Integer, primary_key=True)
    node_id = Column(
        Integer, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )
    domain = Column(String(253), nullable=False)
    certificate = Column(Text, nullable=False)
    private_key = Column(Text, nullable=False)
    certificate_file = Column(String(2048), nullable=True)
    key_file = Column(String(2048), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    node = relationship("Node", back_populates="certificates")
    inbounds = relationship(
        "ProxyInbound",
        secondary=node_certificate_inbounds_association,
        back_populates="node_certificates",
    )

    @property
    def inbound_tags(self):
        return [inbound.tag for inbound in self.inbounds]
