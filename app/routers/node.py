import asyncio
import time
from datetime import datetime, timezone
from typing import List

import requests
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    WebSocket,
)
from sqlalchemy.exc import IntegrityError
from starlette.websockets import WebSocketDisconnect

from app import logger, xray
from app.db import Session, crud, get_db
from app.dependencies import get_dbnode, validate_dates
from app.models.admin import Admin
from app.models.node import (
    NodeCreate,
    NodeCertificateIssue,
    NodeCertificateModify,
    NodeCertificateResponse,
    NodeGeoResourceBulkDelete,
    NodeGeoResourceRemoteCreate,
    NodeGeoResourceRename,
    NodeGeoResourceResponse,
    NodeGeoResourceScheduleModify,
    NodeModify,
    NodeResponse,
    NodeSettings,
    NodeStatus,
    NodesUsageResponse,
    validate_geo_resource_filename,
)
from app.xray.node import NodeAPIError
from app.models.proxy import ProxyHost
from app.utils import responses
from app.utils.node_geo_resources import (
    MAX_GEO_RESOURCE_SIZE,
    download_geo_resource,
    get_next_run_at,
    get_remote_node,
    upload_remote_geo_resource,
)

router = APIRouter(
    tags=["Node"], prefix="/api", responses={401: responses._401, 403: responses._403}
)


def add_host_if_needed(new_node: NodeCreate, db: Session):
    """Add a host if specified in the new node settings."""
    if new_node.add_as_new_host:
        host = ProxyHost(
            remark=f"{new_node.name} ({{USERNAME}}) [{{PROTOCOL}} - {{TRANSPORT}}]",
            address=new_node.address,
        )
        for inbound_tag in xray.config.inbounds_by_tag:
            crud.add_host(db, inbound_tag, host)
        xray.hosts.update()


@router.get("/node/settings", response_model=NodeSettings)
def get_node_settings(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Retrieve the current node settings, including TLS certificate."""
    tls = crud.get_tls_certificate(db)
    return NodeSettings(certificate=tls.certificate)


@router.post("/node", response_model=NodeResponse, responses={409: responses._409})
def add_node(
    new_node: NodeCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Add a new node to the database and optionally add it as a host."""
    try:
        dbnode = crud.create_node(db, new_node)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail=f'Node "{new_node.name}" already exists'
        )

    bg.add_task(xray.operations.connect_node, node_id=dbnode.id)
    bg.add_task(add_host_if_needed, new_node, db)

    logger.info(f'New node "{dbnode.name}" added')
    return dbnode


@router.get("/node/{node_id}", response_model=NodeResponse)
def get_node(
    dbnode: NodeResponse = Depends(get_dbnode),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Retrieve details of a specific node by its ID."""
    return dbnode


@router.websocket("/node/{node_id}/logs")
async def node_logs(node_id: int, websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token") or websocket.headers.get(
        "Authorization", ""
    ).removeprefix("Bearer ")
    admin = Admin.get_admin(token, db)
    if not admin:
        return await websocket.close(reason="Unauthorized", code=4401)

    if not admin.is_sudo:
        return await websocket.close(reason="You're not allowed", code=4403)

    if not xray.nodes.get(node_id):
        return await websocket.close(reason="Node not found", code=4404)

    if not xray.nodes[node_id].connected:
        return await websocket.close(reason="Node is not connected", code=4400)

    interval = websocket.query_params.get("interval")
    if interval:
        try:
            interval = float(interval)
        except ValueError:
            return await websocket.close(reason="Invalid interval value", code=4400)
        if interval > 10:
            return await websocket.close(
                reason="Interval must be more than 0 and at most 10 seconds", code=4400
            )

    await websocket.accept()

    cache = ""
    last_sent_ts = 0
    node = xray.nodes[node_id]
    with node.get_logs() as logs:
        while True:
            if not node == xray.nodes[node_id]:
                break

            if interval and time.time() - last_sent_ts >= interval and cache:
                try:
                    await websocket.send_text(cache)
                except (WebSocketDisconnect, RuntimeError):
                    break
                cache = ""
                last_sent_ts = time.time()

            if not logs:
                try:
                    await asyncio.wait_for(websocket.receive(), timeout=0.2)
                    continue
                except asyncio.TimeoutError:
                    continue
                except (WebSocketDisconnect, RuntimeError):
                    break

            log = logs.popleft()

            if interval:
                cache += f"{log}\n"
                continue

            try:
                await websocket.send_text(log)
            except (WebSocketDisconnect, RuntimeError):
                break


@router.get("/nodes", response_model=List[NodeResponse])
def get_nodes(
    db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)
):
    """Retrieve a list of all nodes. Accessible only to sudo admins."""
    return crud.get_nodes(db)


@router.put("/node/{node_id}", response_model=NodeResponse)
def modify_node(
    modified_node: NodeModify,
    bg: BackgroundTasks,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Update a node's details. Only accessible to sudo admins."""
    updated_node = crud.update_node(db, dbnode, modified_node)
    xray.operations.remove_node(updated_node.id)
    if updated_node.status != NodeStatus.disabled:
        bg.add_task(xray.operations.connect_node, node_id=updated_node.id)

    logger.info(f'Node "{dbnode.name}" modified')
    return dbnode


@router.post("/node/{node_id}/reconnect")
def reconnect_node(
    bg: BackgroundTasks,
    dbnode: NodeResponse = Depends(get_node),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Trigger a reconnection for the specified node. Only accessible to sudo admins."""
    bg.add_task(xray.operations.connect_node, node_id=dbnode.id)
    return {"detail": "Reconnection task scheduled"}


@router.post("/node/{node_id}/restart")
def restart_node(
    bg: BackgroundTasks,
    dbnode: NodeResponse = Depends(get_node),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Restart Xray core on one remote node using its current generated config."""
    bg.add_task(xray.operations.restart_node, node_id=dbnode.id)
    return {"detail": "Restart task scheduled"}


def _raise_geo_resource_error(exc: Exception) -> None:
    if isinstance(exc, NodeAPIError):
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=f"Node geo resource request failed: {exc.detail}",
        )
    if isinstance(exc, requests.RequestException):
        raise HTTPException(status_code=502, detail=f"Resource download failed: {exc}")
    if isinstance(exc, ValueError):
        raise HTTPException(status_code=422, detail=str(exc))
    raise HTTPException(status_code=502, detail=f"Node geo resource request failed: {exc}")


def _validate_geo_resource_path(filename: str) -> str:
    try:
        return validate_geo_resource_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get(
    "/node/{node_id}/geo-resources",
    response_model=List[NodeGeoResourceResponse],
)
def get_node_geo_resources(
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        files = get_remote_node(dbnode).list_geo_resources()
    except Exception as exc:
        _raise_geo_resource_error(exc)

    updates = {
        resource.filename: resource
        for resource in crud.get_node_geo_resource_updates(db, dbnode.id)
    }
    result = []
    for file in files:
        filename = file.get("filename")
        if not isinstance(filename, str):
            continue
        update = updates.get(filename)
        result.append(
            NodeGeoResourceResponse(
                filename=filename,
                size=file.get("size", 0),
                modified_at=file.get("modified_at"),
                auto_update=update is not None,
                url=update.url if update else None,
                cron=update.cron if update else None,
                last_updated_at=update.last_updated_at if update else None,
                next_run_at=update.next_run_at if update else None,
                last_error=update.last_error if update else None,
                last_error_at=update.last_error_at if update else None,
            )
        )
    return result


@router.post("/node/{node_id}/geo-resources/upload")
def upload_node_geo_resource(
    file: UploadFile = File(...),
    overwrite: bool = Query(False),
    dbnode: NodeResponse = Depends(get_node),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    content = file.file.read(MAX_GEO_RESOURCE_SIZE + 1)
    try:
        upload_remote_geo_resource(
            dbnode, file.filename or "", content, overwrite=overwrite
        )
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return {}


@router.post(
    "/node/{node_id}/geo-resources/remote",
    response_model=NodeGeoResourceResponse,
)
def create_remote_node_geo_resource(
    request: NodeGeoResourceRemoteCreate,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        content = download_geo_resource(request.url)
        upload_remote_geo_resource(
            dbnode, request.filename, content, overwrite=request.overwrite
        )
        resource = crud.upsert_node_geo_resource_update(
            db,
            node_id=dbnode.id,
            filename=request.filename,
            url=request.url,
            cron=request.cron,
            next_run_at=get_next_run_at(request.cron),
        )
        resource = crud.update_node_geo_resource_result(
            db, resource, next_run_at=resource.next_run_at
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Geo resource already exists")
    except Exception as exc:
        _raise_geo_resource_error(exc)

    return NodeGeoResourceResponse(
        filename=resource.filename,
        auto_update=True,
        url=resource.url,
        cron=resource.cron,
        last_updated_at=resource.last_updated_at,
        next_run_at=resource.next_run_at,
        last_error=resource.last_error,
        last_error_at=resource.last_error_at,
    )


@router.put(
    "/node/{node_id}/geo-resources/{filename}/schedule",
    response_model=NodeGeoResourceResponse,
)
def modify_node_geo_resource_schedule(
    filename: str,
    request: NodeGeoResourceScheduleModify,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    filename = _validate_geo_resource_path(filename)
    resource = crud.get_node_geo_resource_update(db, dbnode.id, filename)
    if not resource:
        raise HTTPException(status_code=404, detail="Auto-update configuration not found")
    try:
        resource = crud.upsert_node_geo_resource_update(
            db,
            node_id=dbnode.id,
            filename=filename,
            url=request.url,
            cron=request.cron,
            next_run_at=get_next_run_at(request.cron),
        )
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return NodeGeoResourceResponse(
        filename=resource.filename,
        auto_update=True,
        url=resource.url,
        cron=resource.cron,
        last_updated_at=resource.last_updated_at,
        next_run_at=resource.next_run_at,
        last_error=resource.last_error,
        last_error_at=resource.last_error_at,
    )


@router.post("/node/{node_id}/geo-resources/{filename}/refresh")
def refresh_node_geo_resource(
    filename: str,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    filename = _validate_geo_resource_path(filename)
    resource = crud.get_node_geo_resource_update(db, dbnode.id, filename)
    if not resource:
        raise HTTPException(status_code=404, detail="Auto-update configuration not found")
    try:
        content = download_geo_resource(resource.url)
        upload_remote_geo_resource(dbnode, filename, content, overwrite=True)
        crud.update_node_geo_resource_result(
            db, resource, next_run_at=get_next_run_at(resource.cron)
        )
    except Exception as exc:
        crud.update_node_geo_resource_result(
            db,
            resource,
            next_run_at=get_next_run_at(resource.cron),
            error=str(exc),
        )
        _raise_geo_resource_error(exc)
    return {}


@router.get("/node/{node_id}/geo-resources/{filename}/download")
def download_node_geo_resource(
    filename: str,
    dbnode: NodeResponse = Depends(get_node),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    filename = _validate_geo_resource_path(filename)
    try:
        content = get_remote_node(dbnode).download_geo_resource(filename)
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/node/{node_id}/geo-resources/{filename}/rename")
def rename_node_geo_resource(
    filename: str,
    request: NodeGeoResourceRename,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    filename = _validate_geo_resource_path(filename)
    resource = crud.get_node_geo_resource_update(db, dbnode.id, filename)
    target_resource = (
        crud.get_node_geo_resource_update(db, dbnode.id, request.filename)
        if filename != request.filename
        else None
    )
    if target_resource and not request.overwrite:
        raise HTTPException(
            status_code=409, detail="Auto-update configuration already exists"
        )
    try:
        get_remote_node(dbnode).rename_geo_resource(
            filename, request.filename, request.overwrite
        )
        if target_resource:
            crud.remove_node_geo_resource_update(db, target_resource)
        if resource:
            crud.rename_node_geo_resource_update(db, resource, request.filename)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Geo resource already exists")
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return {}


@router.post("/node/{node_id}/geo-resources/bulk-delete")
def bulk_delete_node_geo_resources(
    request: NodeGeoResourceBulkDelete,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        get_remote_node(dbnode).delete_geo_resources(request.filenames)
        for filename in request.filenames:
            resource = crud.get_node_geo_resource_update(db, dbnode.id, filename)
            if resource:
                crud.remove_node_geo_resource_update(db, resource)
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return {}


@router.delete("/node/{node_id}/geo-resources/{filename}")
def delete_node_geo_resource(
    filename: str,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    filename = _validate_geo_resource_path(filename)
    try:
        get_remote_node(dbnode).delete_geo_resources([filename])
        resource = crud.get_node_geo_resource_update(db, dbnode.id, filename)
        if resource:
            crud.remove_node_geo_resource_update(db, resource)
    except Exception as exc:
        _raise_geo_resource_error(exc)
    return {}


@router.get(
    "/node/{node_id}/certificates",
    response_model=List[NodeCertificateResponse],
)
def get_node_certificates(
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    return crud.get_node_certificates(db, dbnode.id)


@router.post(
    "/node/{node_id}/certificates/issue",
    response_model=NodeCertificateResponse,
)
def issue_node_certificate(
    request: NodeCertificateIssue,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        node = xray.nodes.get(dbnode.id) or xray.operations.add_node(dbnode)
        result = node.issue_certificate(**request.model_dump())
    except NodeAPIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=f"Node certificate request failed: {exc.detail}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Node certificate request failed: {exc}"
        )

    certificate = result.get("certificate") or result.get("fullchain")
    private_key = result.get("private_key") or result.get("key")
    if (
        not isinstance(certificate, str)
        or "BEGIN CERTIFICATE" not in certificate
        or not isinstance(private_key, str)
        or "BEGIN " not in private_key
        or "PRIVATE KEY" not in private_key
    ):
        raise HTTPException(status_code=502, detail="Node returned invalid PEM data")

    expires_at = result.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expires_at.tzinfo:
                expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(
                status_code=502, detail="Node returned invalid certificate expiry"
            )
    elif expires_at is not None and not isinstance(expires_at, datetime):
        raise HTTPException(
            status_code=502, detail="Node returned invalid certificate expiry"
        )

    dbcertificate = crud.upsert_node_certificate(
        db,
        node_id=dbnode.id,
        domain=request.domain,
        certificate=certificate,
        private_key=private_key,
        expires_at=expires_at,
    )
    return dbcertificate


@router.put(
    "/node/{node_id}/certificates/{certificate_id}",
    response_model=NodeCertificateResponse,
)
def modify_node_certificate(
    certificate_id: int,
    modified: NodeCertificateModify,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbcertificate = crud.get_node_certificate(db, dbnode.id, certificate_id)
    if not dbcertificate:
        raise HTTPException(status_code=404, detail="Node certificate not found")
    try:
        updated = crud.update_node_certificate(db, dbcertificate, modified)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return updated


@router.delete("/node/{node_id}/certificates/{certificate_id}")
def remove_node_certificate(
    certificate_id: int,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    dbcertificate = crud.get_node_certificate(db, dbnode.id, certificate_id)
    if not dbcertificate:
        raise HTTPException(status_code=404, detail="Node certificate not found")
    crud.remove_node_certificate(db, dbcertificate)
    return {}


@router.delete("/node/{node_id}")
def remove_node(
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Delete a node and remove it from xray in the background."""
    node_id = dbnode.id
    node_name = dbnode.name
    crud.remove_node(db, dbnode)
    xray.operations.remove_node(node_id)

    logger.info(f'Node "{node_name}" deleted')
    return {}


@router.get("/nodes/usage", response_model=NodesUsageResponse)
def get_usage(
    db: Session = Depends(get_db),
    start: str = "",
    end: str = "",
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Retrieve usage statistics for nodes within a specified date range."""
    start, end = validate_dates(start, end)

    usages = crud.get_nodes_usage(db, start, end)

    return {"usages": usages}
