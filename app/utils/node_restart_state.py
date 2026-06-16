from threading import RLock
from typing import Iterable, Set

_lock = RLock()
_pending_restart_node_ids: Set[int] = set()


def mark_nodes_pending_restart(node_ids: Iterable[int]) -> None:
    with _lock:
        _pending_restart_node_ids.update(
            node_id for node_id in node_ids if node_id is not None
        )


def clear_node_pending_restart(node_id: int) -> None:
    with _lock:
        _pending_restart_node_ids.discard(node_id)


def is_node_pending_restart(node_id: int) -> bool:
    with _lock:
        return node_id in _pending_restart_node_ids


def get_pending_restart_node_ids() -> Set[int]:
    with _lock:
        return set(_pending_restart_node_ids)
