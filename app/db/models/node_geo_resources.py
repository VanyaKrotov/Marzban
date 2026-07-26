from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class NodeGeoResourceUpdate(Base):
    __tablename__ = "node_geo_resource_updates"
    __table_args__ = (UniqueConstraint("node_id", "filename"),)

    id = Column(Integer, primary_key=True)
    node_id = Column(Integer, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    url = Column(String(2048), nullable=False)
    cron = Column(String(128), nullable=False)
    last_updated_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=False, index=True)
    last_error = Column(Text, nullable=True)
    last_error_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    node = relationship("Node", back_populates="geo_resource_updates")
