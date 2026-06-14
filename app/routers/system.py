from copy import deepcopy
from typing import Dict, List, Set, Union

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.exc import IntegrityError

from app import __version__, xray
from app.db import Session, crud, get_db
from app.models.admin import Admin
from app.models.node import NodeCertificateResponse
from app.models.proxy import (
    InboundCreate,
    InboundModify,
    InboundResponse,
    OutboundCreate,
    OutboundModify,
    OutboundResponse,
    ProxyHost,
    ProxyInbound,
    ProxyTypes,
)
from app.models.system import SystemStats
from app.models.user import UserStatus
from app.utils import responses
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
    if normalized.get("protocol") not in ProxyTypes._value2member_map_:
        raise HTTPException(
            status_code=400,
            detail="Inbound protocol must be vmess, vless, trojan or shadowsocks",
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
    if not normalized.get("protocol"):
        raise HTTPException(
            status_code=400,
            detail="Outbound protocol is required",
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


def _restart_connected_nodes(bg: BackgroundTasks, node_ids: Set[int]) -> None:
    for node_id in node_ids:
        node = xray.nodes.get(node_id)
        if node and node.connected:
            bg.add_task(xray.operations.restart_node, node_id)


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
    bg: BackgroundTasks,
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
    _restart_connected_nodes(bg, set(inbound.node_ids))
    return _inbound_response(created)


@router.put(
    "/inbounds/configs/{inbound_tag}",
    response_model=InboundResponse,
    responses={400: responses._400, 403: responses._403},
)
def modify_inbound_config(
    inbound_tag: str,
    modified: InboundModify,
    bg: BackgroundTasks,
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
    _restart_connected_nodes(bg, affected_node_ids)
    return _inbound_response(updated)


@router.delete(
    "/inbounds/configs/{inbound_tag}",
    status_code=204,
    responses={403: responses._403},
)
def delete_inbound_config(
    inbound_tag: str,
    bg: BackgroundTasks,
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
    _restart_connected_nodes(bg, affected_node_ids)


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
    bg: BackgroundTasks,
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
    xray.reload_config()
    _restart_connected_nodes(bg, set(outbound.node_ids))
    return _outbound_response(created)


@router.put(
    "/outbounds/configs/{outbound_tag}",
    response_model=OutboundResponse,
    responses={400: responses._400, 403: responses._403},
)
def modify_outbound_config(
    outbound_tag: str,
    modified: OutboundModify,
    bg: BackgroundTasks,
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
    _restart_connected_nodes(bg, affected_node_ids)
    return _outbound_response(updated)


@router.delete(
    "/outbounds/configs/{outbound_tag}",
    status_code=204,
    responses={403: responses._403},
)
def delete_outbound_config(
    outbound_tag: str,
    bg: BackgroundTasks,
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
    _restart_connected_nodes(bg, affected_node_ids)


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
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Update node assignments and restart connected nodes."""
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
    _restart_connected_nodes(bg, affected_node_ids)

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
    "/inbounds/certificates",
    response_model=Dict[str, List[int]],
    responses={403: responses._403},
)
def get_inbound_certificates(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get certificate assignments for every managed inbound."""
    return crud.get_inbound_certificates(db, list(xray.config.inbounds_by_tag))


@router.put(
    "/inbounds/certificates",
    response_model=Dict[str, List[int]],
    responses={400: responses._400, 403: responses._403},
)
def modify_inbound_certificates(
    inbound_certificates: Dict[str, List[int]],
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Assign node certificates to TLS inbounds and restart affected nodes."""
    unknown_inbounds = set(inbound_certificates) - xray.config.inbounds_by_tag.keys()
    if unknown_inbounds:
        raise HTTPException(
            status_code=400,
            detail=f"Inbounds {sorted(unknown_inbounds)} don't exist",
        )

    non_tls_inbounds = [
        tag
        for tag, certificate_ids in inbound_certificates.items()
        if certificate_ids and xray.config.inbounds_by_tag[tag]["tls"] != "tls"
    ]
    if non_tls_inbounds:
        raise HTTPException(
            status_code=400,
            detail=f"Inbounds {sorted(non_tls_inbounds)} don't use TLS",
        )

    before = crud.get_inbound_certificates(db, list(inbound_certificates))
    try:
        result = crud.update_inbound_certificates(db, inbound_certificates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    changed_tags = {
        tag
        for tag, certificate_ids in result.items()
        if set(certificate_ids) != set(before.get(tag, []))
    }
    assignments = crud.get_inbound_node_ids_map(db, list(changed_tags))
    affected_node_ids = {
        node_id
        for node_ids in assignments.values()
        for node_id in node_ids
    }
    _restart_connected_nodes(bg, affected_node_ids)

    return result


@router.get(
    "/hosts", response_model=Dict[str, List[ProxyHost]], responses={403: responses._403}
)
def get_hosts(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Get a list of proxy hosts grouped by inbound tag."""
    hosts = {tag: crud.get_hosts(db, tag) for tag in xray.config.inbounds_by_tag}
    return hosts


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
