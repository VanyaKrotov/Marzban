from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.models.associations import node_routing_rules_association


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id = Column(Integer, primary_key=True)
    create_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    name = Column(String(128), nullable=False)
    content = Column(JSON, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True, server_default="1")
    readonly = Column(Boolean, nullable=False, default=False, server_default="0")
    position = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        index=True,
    )
    nodes = relationship(
        "Node",
        secondary=node_routing_rules_association,
        back_populates="routing_rules",
    )
