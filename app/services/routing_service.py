from fastapi import Depends, HTTPException

from app import xray
from app.db import Session, get_db
from app.models.admin import Admin
from app.models.routing import (
    RoutingRuleCreate,
    RoutingRuleModify,
    RoutingRuleOrder,
    RoutingRuleResponse,
    normalize_routing_rule_content,
)
from app.utils.node_restart_state import mark_nodes_pending_restart
from app.db.crud import routing as routing_crud


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
    try:
        return normalize_routing_rule_content(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def get_routing_rules(
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    return [_response(rule) for rule in routing_crud.get_routing_rules(db)]


def create_routing_rule(
    rule: RoutingRuleCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    rule.content = _validate_content(rule.content)
    try:
        created = routing_crud.create_routing_rule(db, rule)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    xray.reload_config()
    mark_nodes_pending_restart(node.id for node in created.nodes)
    return _response(created)


def reorder_routing_rules(
    order: RoutingRuleOrder,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    rules = routing_crud.get_routing_rules(db)
    requested_positions = {
        rule_id: position
        for position, rule_id in enumerate(order.rule_ids)
    }
    affected_node_ids = {
        node.id
        for rule in rules
        if requested_positions.get(rule.id) != rule.position
        for node in rule.nodes
    }
    try:
        reordered = routing_crud.reorder_routing_rules(db, order.rule_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)
    return [_response(rule) for rule in reordered]


def modify_routing_rule(
    rule_id: int,
    modified: RoutingRuleModify,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbrule = routing_crud.get_routing_rule(db, rule_id)
    if not dbrule:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    if dbrule.readonly and modified.content is not None:
        raise HTTPException(
            status_code=403,
            detail="Content of routing rules loaded from the Xray JSON config is read-only",
        )

    affected_node_ids = {node.id for node in dbrule.nodes}
    if modified.content is not None:
        modified.content = _validate_content(modified.content)
    try:
        updated = routing_crud.update_routing_rule(db, dbrule, modified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    affected_node_ids.update(node.id for node in updated.nodes)
    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)
    return _response(updated)


def delete_routing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbrule = routing_crud.get_routing_rule(db, rule_id)
    if not dbrule:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    if dbrule.readonly:
        raise HTTPException(
            status_code=403,
            detail="Routing rules loaded from the Xray JSON config cannot be deleted",
        )

    affected_node_ids = {node.id for node in dbrule.nodes}
    routing_crud.remove_routing_rule(db, dbrule)
    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)
