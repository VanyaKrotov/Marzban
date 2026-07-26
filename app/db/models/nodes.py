from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.db.base import Base
from app.db.models.associations import (
    node_inbounds_association,
    node_outbounds_association,
    node_routing_rules_association,
)
from app.models.node import NodeStatus


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True)
    name = Column(String(256, collation='NOCASE'), unique=True)
    address = Column(String(256), unique=False, nullable=False)
    port = Column(Integer, unique=False, nullable=False)
    api_port = Column(Integer, unique=False, nullable=False)
    xray_version = Column(String(32), nullable=True)
    status = Column(Enum(NodeStatus), nullable=False, default=NodeStatus.connecting)
    last_status_change = Column(DateTime, default=datetime.utcnow)
    message = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    uplink = Column(BigInteger, default=0)
    downlink = Column(BigInteger, default=0)
    user_usages = relationship("NodeUserUsage", back_populates="node", cascade="all, delete-orphan")
    usages = relationship("NodeUsage", back_populates="node", cascade="all, delete-orphan")
    inbounds = relationship(
        "ProxyInbound", secondary=node_inbounds_association, back_populates="nodes"
    )
    outbounds = relationship(
        "ProxyOutbound", secondary=node_outbounds_association, back_populates="nodes"
    )
    routing_rules = relationship(
        "RoutingRule",
        secondary=node_routing_rules_association,
        back_populates="nodes",
    )
    certificates = relationship(
        "NodeCertificate", back_populates="node", cascade="all, delete-orphan"
    )
    geo_resource_updates = relationship(
        "NodeGeoResourceUpdate",
        back_populates="node",
        cascade="all, delete-orphan",
    )
    usage_coefficient = Column(Float, nullable=False, server_default=text("1.0"), default=1)
