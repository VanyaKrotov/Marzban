from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class NodeUserUsage(Base):
    __tablename__ = "node_user_usages"
    __table_args__ = (
        UniqueConstraint('created_at', 'user_id', 'node_id'),
    )

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, unique=False, nullable=False)  # one hour per record
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="node_usages")
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    node = relationship("Node", back_populates="user_usages")
    used_traffic = Column(BigInteger, default=0)


class NodeUsage(Base):
    __tablename__ = "node_usages"
    __table_args__ = (
        UniqueConstraint('created_at', 'node_id'),
    )

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, unique=False, nullable=False)  # one hour per record
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    node = relationship("Node", back_populates="usages")
    uplink = Column(BigInteger, default=0)
    downlink = Column(BigInteger, default=0)
