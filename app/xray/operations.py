from copy import deepcopy
from functools import lru_cache
from typing import TYPE_CHECKING

from sqlalchemy.exc import SQLAlchemyError

from app import logger, xray
from app.db import GetDB
from app.models.node import NodeStatus
from app.models.proxy import ProxyTypes
from app.models.user import UserResponse
from app.utils.concurrency import threaded_function
from app.xray.node import XRayNode
from app.utils.node_restart_state import clear_node_pending_restart
from app.xray.config import load_node_xray_config
from xray_api import XRay as XRayAPI
from xray_api.types.account import Account, XTLSFlows
from app.db.crud import proxy_inbounds as inbound_crud
from app.db.crud import nodes as node_crud
from app.db.crud import users as user_crud
from app.utils.xray_config_registry import get_enabled_inbound_registry

if TYPE_CHECKING:
    from app.db.models.users import User as DBUser
    from app.db.models.nodes import Node as DBNode


def _get_inbound_node_ids(inbound_tags: list[str] | None = None):
    with GetDB() as db:
        if inbound_tags is None:
            inbound_tags = list(get_enabled_inbound_registry(db).inbounds_by_tag)
        return inbound_crud.get_inbound_node_ids_map(db, inbound_tags)


def _load_user_response(dbuser: "DBUser") -> UserResponse | None:
    with GetDB() as db:
        user_id = getattr(dbuser, "id", None)
        fresh_user = user_crud.get_user_by_id(db, user_id) if user_id else None
        if not fresh_user:
            return None
        return UserResponse.model_validate(fresh_user)


def _load_node_inbound_registries(node_ids: set[int] | None = None) -> dict[int, dict]:
    registries = {}
    target_node_ids = set(xray.nodes) if node_ids is None else node_ids
    with GetDB() as db:
        for node_id in target_node_ids:
            registries[node_id] = get_enabled_inbound_registry(
                db,
                node_id=node_id,
            ).inbounds_by_tag
    return registries


def _supports_runtime_account(proxy_type, proxy_settings: dict) -> bool:
    if not proxy_type.supports_runtime_api:
        return False
    if proxy_type.value == "shadowsocks":
        method = proxy_settings.get("method", "")
        return method in {
            "aes-128-gcm",
            "aes-256-gcm",
            "chacha20-ietf-poly1305",
            "xchacha20-poly1305",
        }
    return True


def _restart_inbound_nodes(inbound_tags: set[str], inbound_node_ids: dict):
    affected_node_ids = {
        node_id
        for inbound_tag in inbound_tags
        for node_id in inbound_node_ids.get(inbound_tag, set())
    }
    for node_id, node in list(xray.nodes.items()):
        if node_id in affected_node_ids and node.connected:
            restart_node(node_id)


@lru_cache(maxsize=None)
def get_tls():
    from app.db import GetDB
    from app.db.crud import settings as settings_crud

    with GetDB() as db:
        tls = settings_crud.get_tls_certificate(db)
        return {
            "key": tls.key,
            "certificate": tls.certificate
        }


@threaded_function
def _add_user_to_inbound(api: XRayAPI, inbound_tag: str, account: Account):
    try:
        api.add_inbound_user(tag=inbound_tag, user=account, timeout=30)
    except (xray.exc.EmailExistsError, xray.exc.ConnectionError):
        pass


@threaded_function
def _remove_user_from_inbound(api: XRayAPI, inbound_tag: str, email: str):
    try:
        api.remove_inbound_user(tag=inbound_tag, email=email, timeout=30)
    except (xray.exc.EmailNotFoundError, xray.exc.ConnectionError):
        pass


@threaded_function
def _alter_inbound_user(api: XRayAPI, inbound_tag: str, account: Account):
    try:
        api.remove_inbound_user(tag=inbound_tag, email=account.email, timeout=30)
    except (xray.exc.EmailNotFoundError, xray.exc.ConnectionError):
        pass
    try:
        api.add_inbound_user(tag=inbound_tag, user=account, timeout=30)
    except (xray.exc.EmailExistsError, xray.exc.ConnectionError):
        pass


def add_user(dbuser: "DBUser"):
    user = _load_user_response(dbuser)
    if not user:
        return
    email = f"{dbuser.id}.{dbuser.username}"
    requested_inbound_tags = [
        inbound_tag
        for inbound_tags in user.inbounds.values()
        for inbound_tag in inbound_tags
    ]
    inbound_node_ids = _get_inbound_node_ids(requested_inbound_tags)
    node_inbounds = _load_node_inbound_registries(
        {
            node_id
            for nodes in inbound_node_ids.values()
            for node_id in nodes
        }
    )
    restart_only_inbounds = set()

    for proxy_type, inbound_tags in user.inbounds.items():
        for inbound_tag in inbound_tags:
            try:
                proxy_settings = user.proxies[proxy_type].dict(no_obj=True)
            except KeyError:
                continue
            if not _supports_runtime_account(proxy_type, proxy_settings):
                restart_only_inbounds.add(inbound_tag)
                continue
            account = proxy_type.account_model(email=email, **proxy_settings)

            for node_id, node in list(xray.nodes.items()):
                if (
                    node_id in inbound_node_ids.get(inbound_tag, set())
                    and node.connected
                    and node.started
                ):
                    inbound = node_inbounds.get(node_id, {}).get(inbound_tag, {})
                    node_account = deepcopy(account)
                    # XTLS currently only supports transmission methods of TCP and mKCP
                    if getattr(node_account, 'flow', None) and (
                        inbound.get('network', 'tcp') not in ('tcp', 'raw', 'kcp')
                        or
                        (
                            inbound.get('network', 'tcp') in ('tcp', 'raw', 'kcp')
                            and
                            inbound.get('tls') not in ('tls', 'reality')
                        )
                        or
                        inbound.get('header_type') == 'http'
                    ):
                        node_account.flow = XTLSFlows.NONE
                    _add_user_to_inbound(node.api, inbound_tag, node_account)
    if restart_only_inbounds:
        _restart_inbound_nodes(restart_only_inbounds, inbound_node_ids)


def remove_user(dbuser: "DBUser"):
    email = f"{dbuser.id}.{dbuser.username}"
    inbound_node_ids = _get_inbound_node_ids()
    node_inbounds = _load_node_inbound_registries()
    restart_only_inbounds = set()
    for inbounds in node_inbounds.values():
        for inbound in inbounds.values():
            if (
                inbound["protocol"] in ProxyTypes._value2member_map_
                and not ProxyTypes(inbound["protocol"]).supports_runtime_api
            ):
                restart_only_inbounds.add(inbound["tag"])

    for inbound_tag in inbound_node_ids:
        if inbound_tag in restart_only_inbounds:
            continue
        for node_id, node in list(xray.nodes.items()):
            if (
                node_id in inbound_node_ids.get(inbound_tag, set())
                and node.connected
                and node.started
            ):
                _remove_user_from_inbound(node.api, inbound_tag, email)
    if restart_only_inbounds:
        _restart_inbound_nodes(restart_only_inbounds, inbound_node_ids)


def update_user(dbuser: "DBUser"):
    user = _load_user_response(dbuser)
    if not user:
        return
    email = f"{dbuser.id}.{dbuser.username}"
    inbound_node_ids = _get_inbound_node_ids()
    node_inbounds = _load_node_inbound_registries()
    restart_only_inbounds = set()

    active_inbounds = []
    for proxy_type, inbound_tags in user.inbounds.items():
        for inbound_tag in inbound_tags:
            active_inbounds.append(inbound_tag)

            try:
                proxy_settings = user.proxies[proxy_type].dict(no_obj=True)
            except KeyError:
                continue
            if not _supports_runtime_account(proxy_type, proxy_settings):
                restart_only_inbounds.add(inbound_tag)
                continue
            account = proxy_type.account_model(email=email, **proxy_settings)

            for node_id, node in list(xray.nodes.items()):
                if (
                    node_id in inbound_node_ids.get(inbound_tag, set())
                    and node.connected
                    and node.started
                ):
                    inbound = node_inbounds.get(node_id, {}).get(inbound_tag, {})
                    node_account = deepcopy(account)
                    # XTLS currently only supports transmission methods of TCP and mKCP
                    if getattr(node_account, 'flow', None) and (
                        inbound.get('network', 'tcp') not in ('tcp', 'raw', 'kcp')
                        or
                        (
                            inbound.get('network', 'tcp') in ('tcp', 'raw', 'kcp')
                            and
                            inbound.get('tls') not in ('tls', 'reality')
                        )
                        or
                        inbound.get('header_type') == 'http'
                    ):
                        node_account.flow = XTLSFlows.NONE
                    _alter_inbound_user(node.api, inbound_tag, node_account)

    for inbound_tag in inbound_node_ids:
        if inbound_tag in active_inbounds:
            continue
        for inbounds in node_inbounds.values():
            inbound = inbounds.get(inbound_tag)
            if (
                inbound
                and inbound["protocol"] in ProxyTypes._value2member_map_
                and not ProxyTypes(inbound["protocol"]).supports_runtime_api
            ):
                restart_only_inbounds.add(inbound_tag)
                break
        if inbound_tag in restart_only_inbounds:
            continue
        # remove disabled inbounds
        for node_id, node in list(xray.nodes.items()):
            if (
                node_id in inbound_node_ids.get(inbound_tag, set())
                and node.connected
                and node.started
            ):
                _remove_user_from_inbound(node.api, inbound_tag, email)
    if restart_only_inbounds:
        _restart_inbound_nodes(restart_only_inbounds, inbound_node_ids)


def remove_node(node_id: int):
    if node_id in xray.nodes:
        try:
            xray.nodes[node_id].disconnect()
        except Exception:
            pass
        finally:
            try:
                del xray.nodes[node_id]
            except KeyError:
                pass


def add_node(dbnode: "DBNode"):
    remove_node(dbnode.id)

    tls = get_tls()
    xray.nodes[dbnode.id] = XRayNode(address=dbnode.address,
                                     port=dbnode.port,
                                     api_port=dbnode.api_port,
                                     ssl_key=tls['key'],
                                     ssl_cert=tls['certificate'],
                                     usage_coefficient=dbnode.usage_coefficient)

    return xray.nodes[dbnode.id]


def _change_node_status(node_id: int, status: NodeStatus, message: str = None, version: str = None):
    with GetDB() as db:
        try:
            dbnode = node_crud.get_node_by_id(db, node_id)
            if not dbnode:
                return

            if dbnode.status == NodeStatus.disabled:
                remove_node(dbnode.id)
                return

            node_crud.update_node_status(db, dbnode, status, message, version)
        except SQLAlchemyError:
            db.rollback()


global _connecting_nodes
_connecting_nodes = {}


@threaded_function
def connect_node(node_id, config=None):
    global _connecting_nodes

    if _connecting_nodes.get(node_id):
        return

    with GetDB() as db:
        dbnode = node_crud.get_node_by_id(db, node_id)

    if not dbnode:
        return

    try:
        node = xray.nodes[dbnode.id]
        assert node.connected
    except (KeyError, AssertionError):
        node = xray.operations.add_node(dbnode)

    try:
        _connecting_nodes[node_id] = True

        _change_node_status(node_id, NodeStatus.connecting)
        logger.info(f"Connecting to \"{dbnode.name}\" node")

        config = config or load_node_xray_config(dbnode).include_db_users()

        node.start(config)
        version = node.get_version()
        _change_node_status(node_id, NodeStatus.connected, version=version)
        clear_node_pending_restart(node_id)
        logger.info(f"Connected to \"{dbnode.name}\" node, xray run on v{version}")

    except Exception as e:
        _change_node_status(node_id, NodeStatus.error, message=str(e))
        logger.info(f"Unable to connect to \"{dbnode.name}\" node")

    finally:
        try:
            del _connecting_nodes[node_id]
        except KeyError:
            pass


@threaded_function
def restart_node(node_id, config=None):
    with GetDB() as db:
        dbnode = node_crud.get_node_by_id(db, node_id)

    if not dbnode:
        return

    try:
        node = xray.nodes[dbnode.id]
    except KeyError:
        node = xray.operations.add_node(dbnode)

    if not node.connected:
        return connect_node(node_id, config)

    try:
        logger.info(f"Restarting Xray core of \"{dbnode.name}\" node")

        config = config or load_node_xray_config(dbnode).include_db_users()

        node.restart(config)
        version = node.get_version()
        _change_node_status(node_id, NodeStatus.connected, version=version)
        clear_node_pending_restart(node_id)
        logger.info(f"Xray core of \"{dbnode.name}\" node restarted")
    except Exception as e:
        _change_node_status(node_id, NodeStatus.error, message=str(e))
        logger.info(f"Unable to restart node {node_id}")
        try:
            node.disconnect()
        except Exception:
            pass


__all__ = [
    "add_user",
    "remove_user",
    "add_node",
    "remove_node",
    "connect_node",
    "restart_node",
]
