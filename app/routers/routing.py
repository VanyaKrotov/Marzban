from copy import deepcopy
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app import xray
from app.db import Session, crud, get_db
from app.models.admin import Admin
from app.models.routing import (
    RoutingRuleCreate,
    RoutingRuleModify,
    RoutingRuleOrder,
    RoutingRuleResponse,
)
from app.utils import responses

router = APIRouter(
    tags=["Routing"],
    prefix="/api/routing",
    responses={401: responses._401, 403: responses._403},
)


def _response(rule) -> RoutingRuleResponse:
    return RoutingRuleResponse(
        id=rule.id,
        create_at=rule.create_at,
        name=rule.name,
        content=rule.content,
        enabled=rule.enabled,
        readonly=rule.readonly,
        node_ids=[node.id for node in rule.nodes],
        position=rule.position,
    )


def _validate_content(content: dict) -> dict:
    normalized = deepcopy(content)
    if normalized.get("type") not in {"field", "balancer"}:
        raise HTTPException(
            status_code=400,
            detail="Routing rule type must be field or balancer",
        )
    if not normalized.get("outboundTag") and not normalized.get("balancerTag"):
        raise HTTPException(
            status_code=400,
            detail="Routing rule must contain outboundTag or balancerTag",
        )
    return normalized


@router.get("/rules", response_model=List[RoutingRuleResponse])
def get_routing_rules(
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    return [_response(rule) for rule in crud.get_routing_rules(db)]


@router.post(
    "/rules",
    response_model=RoutingRuleResponse,
    status_code=201,
    responses={400: responses._400},
)
def create_routing_rule(
    rule: RoutingRuleCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    rule.content = _validate_content(rule.content)
    try:
        created = crud.create_routing_rule(db, rule)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    xray.reload_config()
    return _response(created)


@router.put(
    "/rules/order",
    response_model=List[RoutingRuleResponse],
    responses={400: responses._400},
)
def reorder_routing_rules(
    order: RoutingRuleOrder,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        reordered = crud.reorder_routing_rules(db, order.rule_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    xray.reload_config()
    return [_response(rule) for rule in reordered]


@router.put(
    "/rules/{rule_id}",
    response_model=RoutingRuleResponse,
    responses={400: responses._400},
)
def modify_routing_rule(
    rule_id: int,
    modified: RoutingRuleModify,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbrule = crud.get_routing_rule(db, rule_id)
    if not dbrule:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    if dbrule.readonly and modified.content is not None:
        raise HTTPException(
            status_code=403,
            detail="Content of routing rules loaded from the Xray JSON config is read-only",
        )

    if modified.content is not None:
        modified.content = _validate_content(modified.content)
    try:
        updated = crud.update_routing_rule(db, dbrule, modified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    xray.reload_config()
    return _response(updated)


@router.delete("/rules/{rule_id}", status_code=204)
def delete_routing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbrule = crud.get_routing_rule(db, rule_id)
    if not dbrule:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    if dbrule.readonly:
        raise HTTPException(
            status_code=403,
            detail="Routing rules loaded from the Xray JSON config cannot be deleted",
        )

    crud.remove_routing_rule(db, dbrule)
    xray.reload_config()
