import asyncio
import json
import time

import commentjson
from fastapi import Depends, HTTPException, WebSocket
from starlette.websockets import WebSocketDisconnect

from app import xray
from app.db import Session, get_db
from app.models.admin import Admin
from app.models.core import CoreStats
from app.models.routing import normalize_routing_rule_content
from app.xray import XRayConfig
from config import XRAY_JSON
from app.db.crud import routing as routing_crud

CORE_LOGS_PATH = "/api/core/logs"


async def core_logs(websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token") or websocket.headers.get(
        "Authorization", ""
    ).removeprefix("Bearer ")
    admin = Admin.get_admin(token, db)
    if not admin:
        return await websocket.close(reason="Unauthorized", code=4401)

    if not admin.is_sudo:
        return await websocket.close(reason="You're not allowed", code=4403)

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
    with xray.core.get_logs() as logs:
        while True:
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


def get_core_stats(admin: Admin = Depends(Admin.get_current)):
    """Retrieve core statistics such as version and uptime."""
    return CoreStats(
        version=xray.core.version,
        started=xray.core.started,
        logs_websocket=CORE_LOGS_PATH,
    )


def restart_core(admin: Admin = Depends(Admin.check_sudo_admin)):
    """Restart all connected nodes."""
    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            xray.operations.restart_node(node_id)

    return {}


def get_core_config(admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    """Get the current core configuration."""
    with open(XRAY_JSON, "r") as f:
        config = commentjson.loads(f.read())

    return config


def _validate_routing_rules(payload: dict) -> None:
    routing = payload.get("routing")
    if not isinstance(routing, dict):
        return

    rules = routing.get("rules")
    if rules is None:
        return
    if not isinstance(rules, list):
        raise HTTPException(status_code=400, detail="Routing rules must be a list")

    for index, rule in enumerate(rules):
        try:
            rules[index] = normalize_routing_rule_content(rule)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Routing rule {index + 1}: {exc}",
            )


def modify_core_config(
    payload: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
) -> dict:
    """Modify the core configuration and restart the core."""
    _validate_routing_rules(payload)
    try:
        XRayConfig(payload, api_port=xray.config.api_port)
    except (KeyError, TypeError, ValueError) as err:
        raise HTTPException(status_code=400, detail=str(err))

    with open(XRAY_JSON, "w", encoding="utf-8") as f:
        f.write(json.dumps(payload, indent=4))

    routing_crud.sync_readonly_xray_config(db, payload)
    xray.reload_config()

    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            xray.operations.restart_node(node_id)

    return payload

def get_x25519_keys():
    res = xray.core.get_x25519()
    if res is None:
        return HTTPException(status_code=400, detail="Invalid private key")

    return res
