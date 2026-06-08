from typing import Dict, List, Union

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app import __version__, xray
from app.db import Session, crud, get_db
from app.models.admin import Admin
from app.models.node import NodeCertificateResponse
from app.models.proxy import ProxyHost, ProxyInbound, ProxyTypes
from app.models.system import SystemStats
from app.models.user import UserStatus
from app.utils import responses
from app.utils.system import cpu_usage, memory_usage, realtime_bandwidth

router = APIRouter(tags=["System"], prefix="/api", responses={401: responses._401})


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

    try:
        result = crud.update_inbound_nodes(db, inbound_nodes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            bg.add_task(xray.operations.restart_node, node_id)

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

    try:
        result = crud.update_inbound_certificates(db, inbound_certificates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            bg.add_task(xray.operations.restart_node, node_id)

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
