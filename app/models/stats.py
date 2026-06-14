from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class StatsGranularity(str, Enum):
    day = "day"
    week = "week"
    month = "month"


class NodeTrafficPoint(BaseModel):
    period: datetime
    uplink: int
    downlink: int
    total: int


class NodeTrafficSeries(BaseModel):
    node_id: int
    node_name: str
    points: List[NodeTrafficPoint]


class UserGrowthPoint(BaseModel):
    period: datetime
    count: int
    total: int
    growth_percent: Optional[float] = None


class StatsHistoryResponse(BaseModel):
    start: datetime
    end: datetime
    granularity: StatsGranularity
    traffic: List[NodeTrafficSeries]
    users: List[UserGrowthPoint]
