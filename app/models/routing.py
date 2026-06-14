from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoutingRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    content: Dict[str, Any]
    enabled: bool = True
    node_ids: List[int] = Field(default_factory=list)
    position: Optional[int] = Field(None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Routing rule name cannot be empty")
        return value


class RoutingRuleModify(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    content: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    node_ids: Optional[List[int]] = None
    position: Optional[int] = Field(None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Routing rule name cannot be empty")
        return value


class RoutingRuleOrder(BaseModel):
    rule_ids: List[int]


class RoutingRuleResponse(BaseModel):
    id: int
    create_at: datetime
    name: str
    content: Dict[str, Any]
    enabled: bool
    readonly: bool
    node_ids: List[int]
    position: int

    model_config = ConfigDict(from_attributes=True)
