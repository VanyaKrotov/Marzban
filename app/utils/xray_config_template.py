from copy import deepcopy
from typing import Any, Dict

from fastapi import HTTPException

from app.models.routing import normalize_routing_rule_content
from app.xray.config import XRayConfig


def normalize_xray_config_template(payload: Dict[str, Any], api_port: int) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Xray config template must be an object")

    normalized = deepcopy(payload)
    routing = normalized.get("routing")
    rules = routing.get("rules", []) if isinstance(routing, dict) else []
    if rules is not None and not isinstance(rules, list):
        raise HTTPException(status_code=400, detail="Routing rules must be a list")

    rule_tags = set()
    for index, rule in enumerate(rules):
        try:
            rules[index] = normalize_routing_rule_content(rule)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Routing rule {index + 1}: {exc}",
            )
        rule_tag = rules[index]["ruleTag"]
        if rule_tag in rule_tags:
            raise HTTPException(
                status_code=400,
                detail=f"Routing rule {index + 1}: duplicate ruleTag {rule_tag}",
            )
        rule_tags.add(rule_tag)

    try:
        XRayConfig(normalized, api_port=api_port, allow_empty_inbounds=True)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return normalized
