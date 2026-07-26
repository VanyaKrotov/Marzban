from typing import List

from fastapi import APIRouter

from app.models.routing import RoutingRuleResponse
from app.utils import responses
from app.services import routing_service as service

router = APIRouter(
    tags=["Routing"],
    prefix="/api/routing",
    responses={401: responses._401, 403: responses._403},
)

router.get("/rules", response_model=List[RoutingRuleResponse])(service.get_routing_rules)

router.post(
    "/rules",
    response_model=RoutingRuleResponse,
    status_code=201,
    responses={400: responses._400},
)(service.create_routing_rule)

router.put(
    "/rules/order",
    response_model=List[RoutingRuleResponse],
    responses={400: responses._400},
)(service.reorder_routing_rules)

router.put(
    "/rules/{rule_id}",
    response_model=RoutingRuleResponse,
    responses={400: responses._400},
)(service.modify_routing_rule)

router.delete("/rules/{rule_id}", status_code=204)(service.delete_routing_rule)
