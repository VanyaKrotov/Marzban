from copy import deepcopy
from typing import Dict, List, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError

from app import __version__, xray
from app.db import Session, crud, get_db
from app.models.admin import Admin
from app.models.node import NodeCertificateResponse
from app.models.proxy import (
    InboundCreate,
    InboundModify,
    InboundResponse,
    HostGroupAttachRequest,
    HostGroupCreate,
    HostGroupModify,
    HostGroupResponse,
    OutboundCreate,
    OutboundModify,
    OutboundResponse,
    ProxyHost,
    ProxyHostCreate,
    ProxyHostModify,
    ProxyHostReorder,
    ProxyHostV2,
    ProxyInbound,
    ProxyTypes,
    RUNTIME_API_PROTOCOLS,
    USER_ACCOUNT_PROTOCOLS,
    XRAY_INBOUND_PROTOCOLS,
    XRAY_LEGACY_TRANSPORT_ALIASES,
    XRAY_OUTBOUND_PROTOCOLS,
    XRAY_SECURITIES,
    XRAY_TRANSPORTS,
    XrayCapabilities,
)
from app.models.system import SystemStats
from app.models.user import UserStatus
from app.utils import responses
from app.utils.node_restart_state import mark_nodes_pending_restart
from app.utils.system import cpu_usage, memory_usage, realtime_bandwidth

router = APIRouter(tags=["System"], prefix="/api", responses={401: responses._401})


def _inbound_response(inbound) -> InboundResponse:
    return InboundResponse(
        tag=inbound.tag,
        enabled=inbound.enabled,
        readonly=inbound.readonly,
        content=inbound.content,
        node_ids=[node.id for node in inbound.nodes],
    )


def _outbound_response(outbound) -> OutboundResponse:
    return OutboundResponse(
        tag=outbound.tag,
        enabled=outbound.enabled,
        readonly=outbound.readonly,
        content=outbound.content,
        node_ids=[node.id for node in outbound.nodes],
    )


def _validate_inbound_content(tag: str, content: dict) -> dict:
    normalized = deepcopy(content)
    normalized["tag"] = tag
    if normalized.get("protocol") not in XRAY_INBOUND_PROTOCOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Inbound protocol must be one of {sorted(XRAY_INBOUND_PROTOCOLS)}",
        )

    payload = deepcopy(dict(xray.config))
    payload["inbounds"] = [
        inbound
        for inbound in payload.get("inbounds", [])
        if inbound.get("tag") not in {tag, "API_INBOUND"}
    ]
    payload["inbounds"].append(normalized)
    try:
        xray.XRayConfig(payload, api_port=xray.config.api_port)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return normalized


def _validate_outbound_content(tag: str, content: dict) -> dict:
    normalized = deepcopy(content)
    normalized["tag"] = tag
    if normalized.get("protocol") not in XRAY_OUTBOUND_PROTOCOLS:
        raise HTTPException(
            status_code=400,
            detail=f"Outbound protocol must be one of {sorted(XRAY_OUTBOUND_PROTOCOLS)}",
        )

    payload = deepcopy(dict(xray.config))
    payload["outbounds"] = [
        outbound
        for outbound in payload.get("outbounds", [])
        if outbound.get("tag") != tag
    ]
    payload["outbounds"].append(normalized)
    try:
        xray.XRayConfig(payload, api_port=xray.config.api_port)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return normalized


def _ensure_inbound_users(db: Session, inbound_tag: str) -> None:
    inbound = xray.config.inbounds_by_tag.get(inbound_tag)
    if not inbound:
        return
    protocol = inbound["protocol"]
    crud.ensure_protocol_inbounds_for_users(
        db,
        protocol=protocol,
        included_tags=[inbound_tag],
        protocol_inbound_tags=[
            item["tag"]
            for item in xray.config.inbounds_by_protocol.get(protocol, [])
        ],
    )
    db.commit()


@router.get("/system", response_model=SystemStats)
def get_system_stats(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)
):
    """Fetch system stats including memory, CPU, and user metrics."""
    mem = memory_usage()
    cpu = cpu_usage()
    system = crud.get_system_usage(db)
    dbadmin: Union[Admin, None] = crud.get_admin(db, admin.username)

    total_user = crud.get_users_count(db, admin=dbadmin if not admin.is_sudo else None)
    users_active = crud.get_users_count(
        db, status=UserStatus.active, admin=dbadmin if not admin.is_sudo else None
    )
    users_disabled = crud.get_users_count(
        db, status=UserStatus.disabled, admin=dbadmin if not admin.is_sudo else None
    )
    users_on_hold = crud.get_users_count(
        db, status=UserStatus.on_hold, admin=dbadmin if not admin.is_sudo else None
    )
    users_expired = crud.get_users_count(
        db, status=UserStatus.expired, admin=dbadmin if not admin.is_sudo else None
    )
    users_limited = crud.get_users_count(
        db, status=UserStatus.limited, admin=dbadmin if not admin.is_sudo else None
    )
    online_users = crud.count_online_users(db, 24)
    realtime_bandwidth_stats = realtime_bandwidth()

    return SystemStats(
        version=__version__,
        mem_total=mem.total,
        mem_used=mem.used,
        cpu_cores=cpu.cores,
        cpu_usage=cpu.percent,
        total_user=total_user,
        online_users=online_users,
        users_active=users_active,
        users_disabled=users_disabled,
        users_expired=users_expired,
        users_limited=users_limited,
        users_on_hold=users_on_hold,
        incoming_bandwidth=system.uplink,
        outgoing_bandwidth=system.downlink,
        incoming_bandwidth_speed=realtime_bandwidth_stats.incoming_bytes,
        outgoing_bandwidth_speed=realtime_bandwidth_stats.outgoing_bytes,
    )


@router.get("/inbounds", response_model=Dict[ProxyTypes, List[ProxyInbound]])
def get_inbounds(admin: Admin = Depends(Admin.get_current)):
    """Retrieve inbound configurations grouped by protocol."""
    return xray.config.inbounds_by_protocol


@router.get(
    "/inbounds/configs",
    response_model=List[InboundResponse],
    responses={403: responses._403},
)
def get_inbound_configs(
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    return [_inbound_response(inbound) for inbound in crud.get_inbounds(db)]


@router.post(
    "/inbounds/configs",
    response_model=InboundResponse,
    status_code=201,
    responses={400: responses._400, 403: responses._403},
)
def create_inbound_config(
    inbound: InboundCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    inbound.content = _validate_inbound_content(inbound.tag, inbound.content)
    try:
        created = crud.create_inbound(db, inbound)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Inbound tag already exists")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    xray.reload_config()
    if inbound.auto_assign_users:
        _ensure_inbound_users(db, created.tag)
    else:
        crud.exclude_protocol_inbounds_for_users(
            db,
            protocol=created.content.get("protocol"),
            excluded_tags=[created.tag],
        )
        db.commit()
    mark_nodes_pending_restart(node.id for node in created.nodes)
    return _inbound_response(created)


@router.put(
    "/inbounds/configs/{inbound_tag}",
    response_model=InboundResponse,
    responses={400: responses._400, 403: responses._403},
)
def modify_inbound_config(
    inbound_tag: str,
    modified: InboundModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    dbinbound = crud.get_inbound(db, inbound_tag)
    if not dbinbound:
        raise HTTPException(status_code=404, detail="Inbound not found")
    if dbinbound.readonly and modified.content is not None:
        raise HTTPException(
            status_code=403,
            detail="Content of inbounds loaded from the Xray JSON config is read-only",
        )

    affected_node_ids = {node.id for node in dbinbound.nodes}
    was_enabled = dbinbound.enabled
    if modified.content is not None:
        modified.content = _validate_inbound_content(
            inbound_tag,
            modified.content,
        )
    try:
        updated = crud.update_inbound(db, dbinbound, modified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    affected_node_ids.update(node.id for node in updated.nodes)
    xray.reload_config()
    if updated.enabled and not was_enabled:
        _ensure_inbound_users(db, updated.tag)
    mark_nodes_pending_restart(affected_node_ids)
    return _inbound_response(updated)


@router.delete(
    "/inbounds/configs/{inbound_tag}",
    status_code=204,
    responses={403: responses._403},
)
def delete_inbound_config(
    inbound_tag: str,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    dbinbound = crud.get_inbound(db, inbound_tag)
    if not dbinbound:
        raise HTTPException(status_code=404, detail="Inbound not found")
    if dbinbound.readonly:
        raise HTTPException(
            status_code=403,
            detail="Inbounds loaded from the Xray JSON config cannot be deleted",
        )
    affected_node_ids = {node.id for node in dbinbound.nodes}
    crud.remove_inbound(db, dbinbound)
    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)


@router.get(
    "/outbounds/configs",
    response_model=List[OutboundResponse],
    responses={403: responses._403},
)
def get_outbound_configs(
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    return [_outbound_response(outbound) for outbound in crud.get_outbounds(db)]


@router.post(
    "/outbounds/configs",
    response_model=OutboundResponse,
    status_code=201,
    responses={400: responses._400, 403: responses._403},
)
def create_outbound_config(
    outbound: OutboundCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    outbound.content = _validate_outbound_content(outbound.tag, outbound.content)
    try:
        created = crud.create_outbound(db, outbound)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Outbound tag already exists")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    # xray.reload_config()
    mark_nodes_pending_restart(node.id for node in created.nodes)
    return _outbound_response(created)


@router.put(
    "/outbounds/configs/{outbound_tag}",
    response_model=OutboundResponse,
    responses={400: responses._400, 403: responses._403},
)
def modify_outbound_config(
    outbound_tag: str,
    modified: OutboundModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    dboutbound = crud.get_outbound(db, outbound_tag)
    if not dboutbound:
        raise HTTPException(status_code=404, detail="Outbound not found")
    if dboutbound.readonly and modified.content is not None:
        raise HTTPException(
            status_code=403,
            detail="Content of outbounds loaded from the Xray JSON config is read-only",
        )

    affected_node_ids = {node.id for node in dboutbound.nodes}
    if modified.content is not None:
        modified.content = _validate_outbound_content(
            outbound_tag,
            modified.content,
        )
    try:
        updated = crud.update_outbound(db, dboutbound, modified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    affected_node_ids.update(node.id for node in updated.nodes)
    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)
    return _outbound_response(updated)


@router.delete(
    "/outbounds/configs/{outbound_tag}",
    status_code=204,
    responses={403: responses._403},
)
def delete_outbound_config(
    outbound_tag: str,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    dboutbound = crud.get_outbound(db, outbound_tag)
    if not dboutbound:
        raise HTTPException(status_code=404, detail="Outbound not found")
    if dboutbound.readonly:
        raise HTTPException(
            status_code=403,
            detail="Outbounds loaded from the Xray JSON config cannot be deleted",
        )
    affected_node_ids = {node.id for node in dboutbound.nodes}
    crud.remove_outbound(db, dboutbound)
    xray.reload_config()
    mark_nodes_pending_restart(affected_node_ids)


@router.get(
    "/inbounds/nodes",
    response_model=Dict[str, List[int]],
    responses={403: responses._403},
)
def get_inbound_nodes(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get node assignments for every managed inbound."""
    return crud.get_inbound_nodes(db, list(xray.config.inbounds_by_tag))


@router.put(
    "/inbounds/nodes",
    response_model=Dict[str, List[int]],
    responses={400: responses._400, 403: responses._403},
)
def modify_inbound_nodes(
    inbound_nodes: Dict[str, List[int]],
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Update node assignments."""
    unknown_inbounds = set(inbound_nodes) - xray.config.inbounds_by_tag.keys()
    if unknown_inbounds:
        raise HTTPException(
            status_code=400,
            detail=f"Inbounds {sorted(unknown_inbounds)} don't exist",
        )

    before = crud.get_inbound_node_ids_map(db, list(inbound_nodes))
    try:
        result = crud.update_inbound_nodes(db, inbound_nodes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    changed_tags = {
        tag
        for tag, node_ids in result.items()
        if set(node_ids) != before.get(tag, set())
    }
    affected_node_ids = {
        node_id
        for tag in changed_tags
        for node_id in before.get(tag, set()) | set(result[tag])
    }
    mark_nodes_pending_restart(affected_node_ids)

    return result


@router.get(
    "/node-certificates",
    response_model=List[NodeCertificateResponse],
    responses={403: responses._403},
)
def get_node_certificates(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get certificate metadata for all nodes."""
    return crud.get_all_node_certificates(db)


@router.get(
    "/host-groups",
    response_model=List[HostGroupResponse],
    responses={403: responses._403},
    summary="Get host groups",
)
def get_host_groups(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get all host groups ordered by name."""
    return crud.get_host_groups(db)


@router.post(
    "/host-groups",
    response_model=HostGroupResponse,
    responses={403: responses._403, 409: responses._409},
    summary="Create a host group",
)
def create_host_group(
    group: HostGroupCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Create a host group with an operator-provided slug id."""
    try:
        return crud.create_host_group(db, group)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Host group already exists") from exc


@router.get(
    "/host-groups/{group_id}",
    response_model=HostGroupResponse,
    responses={403: responses._403, 404: responses._404},
    summary="Get a host group",
)
def get_host_group(
    group_id: str,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Get a host group by id."""
    dbgroup = crud.get_host_group(db, group_id)
    if not dbgroup:
        raise HTTPException(status_code=404, detail="Host group not found")
    return dbgroup


@router.put(
    "/host-groups/{group_id}",
    response_model=HostGroupResponse,
    responses={403: responses._403, 404: responses._404},
    summary="Update a host group",
)
def update_host_group(
    group_id: str,
    group: HostGroupModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Update host group metadata without changing its id."""
    dbgroup = crud.get_host_group(db, group_id)
    if not dbgroup:
        raise HTTPException(status_code=404, detail="Host group not found")
    return crud.update_host_group(db, dbgroup, group)


@router.delete(
    "/host-groups/{group_id}",
    responses={403: responses._403, 404: responses._404},
    summary="Delete a host group",
)
def delete_host_group(
    group_id: str,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Delete a host group and detach it from all hosts."""
    dbgroup = crud.get_host_group(db, group_id)
    if not dbgroup:
        raise HTTPException(status_code=404, detail="Host group not found")
    crud.delete_host_group(db, dbgroup)
    return {}


@router.get(
    "/hosts", response_model=Dict[str, List[ProxyHost]], responses={403: responses._403}
)
def get_hosts(
    group_id: Union[str, None] = Query(None),
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get a list of proxy hosts grouped by inbound tag."""
    hosts = {
        tag: crud.get_hosts(db, tag, group_id=group_id)
        for tag in xray.config.inbounds_by_tag
    }
    return hosts


@router.get(
    "/hosts/v2", response_model=List[ProxyHostV2], responses={403: responses._403}
)
def get_hosts_v2(
    group_id: Union[str, None] = Query(None),
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get a flat list of proxy hosts ordered by position."""
    return crud.get_hosts_v2(db, group_id=group_id)


@router.post(
    "/hosts/v2", response_model=ProxyHostV2, responses={403: responses._403}
)
def create_host_v2(
    host: ProxyHostCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Create a proxy host."""
    if host.inbound_tag not in xray.config.inbounds_by_tag:
        raise HTTPException(
            status_code=400, detail=f"Inbound {host.inbound_tag} doesn't exist"
        )
    try:
        dbhost = crud.create_host_v2(db, host)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    xray.hosts.update()
    return dbhost


@router.put(
    "/hosts/v2/reorder",
    response_model=List[ProxyHostV2],
    responses={403: responses._403},
)
def reorder_hosts_v2(
    payload: ProxyHostReorder,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Update the global proxy host order without changing inbound assignments."""
    try:
        hosts = crud.reorder_hosts_v2(db, payload.host_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    xray.hosts.update()
    return hosts


@router.put(
    "/hosts/v2/{host_id}",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
)
def update_host_v2(
    host_id: int,
    host: ProxyHostModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Update a proxy host."""
    if host.inbound_tag not in xray.config.inbounds_by_tag:
        raise HTTPException(
            status_code=400, detail=f"Inbound {host.inbound_tag} doesn't exist"
        )
    dbhost = crud.get_host_v2(db, host_id)
    if not dbhost:
        raise HTTPException(status_code=404, detail="Host not found")
    try:
        dbhost = crud.update_host_v2(db, dbhost, host)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    xray.hosts.update()
    return dbhost


@router.post(
    "/hosts/v2/{host_id}/groups",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
    summary="Attach a host to groups",
)
def attach_host_groups(
    host_id: int,
    payload: HostGroupAttachRequest,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Attach a proxy host to one or more host groups."""
    dbhost = crud.get_host_v2(db, host_id)
    if not dbhost:
        raise HTTPException(status_code=404, detail="Host not found")
    try:
        return crud.attach_host_groups(db, dbhost, payload.group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete(
    "/hosts/v2/{host_id}/groups",
    response_model=ProxyHostV2,
    responses={403: responses._403, 404: responses._404},
    summary="Detach a host from groups",
)
def detach_host_groups(
    host_id: int,
    payload: HostGroupAttachRequest,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Detach a proxy host from one or more host groups."""
    dbhost = crud.get_host_v2(db, host_id)
    if not dbhost:
        raise HTTPException(status_code=404, detail="Host not found")
    try:
        return crud.detach_host_groups(db, dbhost, payload.group_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete(
    "/hosts/v2/{host_id}", responses={403: responses._403, 404: responses._404}
)
def delete_host_v2(
    host_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Delete a proxy host."""
    dbhost = crud.get_host_v2(db, host_id)
    if not dbhost:
        raise HTTPException(status_code=404, detail="Host not found")
    crud.remove_host_v2(db, dbhost)
    xray.hosts.update()
    return {}


@router.put(
    "/hosts", response_model=Dict[str, List[ProxyHost]], responses={403: responses._403}
)
def modify_hosts(
    modified_hosts: Dict[str, List[ProxyHost]],
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Modify proxy hosts and update the configuration."""
    for inbound_tag in modified_hosts:
        if inbound_tag not in xray.config.inbounds_by_tag:
            raise HTTPException(
                status_code=400, detail=f"Inbound {inbound_tag} doesn't exist"
            )

    for inbound_tag, hosts in modified_hosts.items():
        crud.update_hosts(db, inbound_tag, hosts)

    xray.hosts.update()

    return {tag: crud.get_hosts(db, tag) for tag in xray.config.inbounds_by_tag}


@router.get("/version", response_model=str)
def get_version():
    return __version__


@router.get("/xray/capabilities", response_model=XrayCapabilities)
def get_xray_capabilities(admin: Admin = Depends(Admin.get_current)):
    return XrayCapabilities(
        inbound_protocols=sorted(XRAY_INBOUND_PROTOCOLS),
        outbound_protocols=sorted(XRAY_OUTBOUND_PROTOCOLS),
        account_protocols=sorted(USER_ACCOUNT_PROTOCOLS),
        runtime_api_protocols=sorted(RUNTIME_API_PROTOCOLS),
        transports=sorted(XRAY_TRANSPORTS),
        securities=sorted(XRAY_SECURITIES),
        legacy_transport_aliases=XRAY_LEGACY_TRANSPORT_ALIASES,
    )
