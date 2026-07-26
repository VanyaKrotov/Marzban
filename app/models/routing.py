from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


def normalize_routing_rule_content(content: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(content, dict):
        raise ValueError("Routing rule must be an object")

    normalized = deepcopy(content)
    rule_tag = normalized.get("ruleTag")
    if not isinstance(rule_tag, str) or not rule_tag.strip():
        raise ValueError("Routing rule must contain a non-empty ruleTag")

    rule_tag = rule_tag.strip()
    if len(rule_tag) > 128:
        raise ValueError("Routing rule ruleTag cannot be longer than 128 characters")

    normalized["ruleTag"] = rule_tag
    if normalized.get("type") not in {"field", "balancer"}:
        raise ValueError("Routing rule type must be field or balancer")

    if not normalized.get("outboundTag") and not normalized.get("balancerTag"):
        raise ValueError("Routing rule must contain outboundTag or balancerTag")

    return normalized


def get_routing_rule_name(content: Dict[str, Any], fallback: Optional[str] = None) -> str:
    rule_tag = content.get("ruleTag") if isinstance(content, dict) else None
    if isinstance(rule_tag, str) and rule_tag.strip():
        return rule_tag.strip()[:128]
    if fallback is not None:
        return fallback
    raise ValueError("Routing rule must contain a non-empty ruleTag")


class RoutingRuleCreate(BaseModel):
    content: Dict[str, Any]
    enabled: bool = True
    node_ids: List[int] = Field(default_factory=list)
    position: Optional[int] = Field(None, ge=0)


class RoutingRuleModify(BaseModel):
    content: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    node_ids: Optional[List[int]] = None
    position: Optional[int] = Field(None, ge=0)


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
