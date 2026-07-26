from typing import Dict, List

from fastapi import APIRouter

from app.models.node import NodeCertificateResponse
from app.models.proxy import (
    InboundResponse,
    HostGroupResponse,
    OutboundResponse,
    ProxyHost,
    ProxyHostV2,
    ProxyInbound,
    ProxyTypes,
    XrayCapabilities,
)
from app.models.system import SystemStats
from app.utils import responses
from app.services import system_service as service

router = APIRouter(tags=["System"], prefix="/api", responses={401: responses._401})

router.get("/system", response_model=SystemStats)(service.get_system_stats)

router.get("/inbounds", response_model=Dict[ProxyTypes, List[ProxyInbound]])(service.get_inbounds)

router.get(
    "/inbounds/configs",
    response_model=List[InboundResponse],
    responses={403: responses._403},
)(service.get_inbound_configs)

router.post(
    "/inbounds/configs",
    response_model=InboundResponse,
    status_code=201,
    responses={400: responses._400, 403: responses._403},
)(service.create_inbound_config)

router.put(
    "/inbounds/configs/{inbound_tag}",
    response_model=InboundResponse,
    responses={400: responses._400, 403: responses._403},
)(service.modify_inbound_config)

router.delete(
    "/inbounds/configs/{inbound_tag}",
    status_code=204,
    responses={403: responses._403},
)(service.delete_inbound_config)

router.get(
    "/outbounds/configs",
    response_model=List[OutboundResponse],
    responses={403: responses._403},
)(service.get_outbound_configs)

router.post(
    "/outbounds/configs",
    response_model=OutboundResponse,
    status_code=201,
    responses={400: responses._400, 403: responses._403},
)(service.create_outbound_config)

router.put(
    "/outbounds/configs/{outbound_tag}",
    response_model=OutboundResponse,
    responses={400: responses._400, 403: responses._403},
)(service.modify_outbound_config)

router.delete(
    "/outbounds/configs/{outbound_tag}",
    status_code=204,
    responses={403: responses._403},
)(service.delete_outbound_config)

router.get(
    "/inbounds/nodes",
    response_model=Dict[str, List[int]],
    responses={403: responses._403},
)(service.get_inbound_nodes)

router.put(
    "/inbounds/nodes",
    response_model=Dict[str, List[int]],
    responses={400: responses._400, 403: responses._403},
)(service.modify_inbound_nodes)

router.get(
    "/node-certificates",
    response_model=List[NodeCertificateResponse],
    responses={403: responses._403},
)(service.get_node_certificates)

router.get(
    "/host-groups",
    response_model=List[HostGroupResponse],
    responses={403: responses._403},
    summary="Get host groups",
)(service.get_host_groups)

router.post(
    "/host-groups",
    response_model=HostGroupResponse,
    responses={403: responses._403, 409: responses._409},
    summary="Create a host group",
)(service.create_host_group)

router.get(
    "/host-groups/{group_id}",
    response_model=HostGroupResponse,
    responses={403: responses._403, 404: responses._404},
    summary="Get a host group",
)(service.get_host_group)

router.put(
    "/host-groups/{group_id}",
    response_model=HostGroupResponse,
    responses={403: responses._403, 404: responses._404},
    summary="Update a host group",
)(service.update_host_group)

router.delete(
    "/host-groups/{group_id}",
    responses={403: responses._403, 404: responses._404},
    summary="Delete a host group",
)(service.delete_host_group)

router.get(
    "/hosts", response_model=Dict[str, List[ProxyHost]], responses={403: responses._403}
)(service.get_hosts)

router.get(
    "/hosts/v2", response_model=List[ProxyHostV2], responses={403: responses._403}
)(service.get_hosts_v2)

router.post(
    "/hosts/v2", response_model=ProxyHostV2, responses={403: responses._403}
)(service.create_host_v2)

router.put(
    "/hosts/v2/reorder",
    response_model=List[ProxyHostV2],
    responses={403: responses._403},
)(service.reorder_hosts_v2)

router.put(
    "/hosts/v2/{host_id}",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
)(service.update_host_v2)

router.post(
    "/hosts/v2/{host_id}/groups",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
    summary="Attach a host to groups",
)(service.attach_host_groups)

router.delete(
    "/hosts/v2/{host_id}/groups",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
    summary="Detach a host from groups",
)(service.detach_host_groups)

router.delete(
    "/hosts/v2/{host_id}", responses={403: responses._403, 404: responses._404}
)(service.delete_host_v2)

router.put(
    "/hosts", response_model=Dict[str, List[ProxyHost]], responses={403: responses._403}
)(service.modify_hosts)

router.get("/version", response_model=str)(service.get_version)

router.get("/xray/capabilities", response_model=XrayCapabilities)(service.get_xray_capabilities)
