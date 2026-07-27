from contextlib import contextmanager
from datetime import datetime, timezone
from typing import BinaryIO, Iterable, Iterator

import requests
from apscheduler.triggers.cron import CronTrigger

from app import xray
from app.models.node import validate_geo_resource_filename


MAX_GEO_RESOURCE_SIZE = 128 * 1024 * 1024
GEO_RESOURCE_UPLOAD_CHUNK_SIZE = 1024 * 1024


def get_next_run_at(cron: str, now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    trigger = CronTrigger.from_crontab(cron, timezone="UTC")
    next_run = trigger.get_next_fire_time(None, now)
    if next_run is None:
        raise ValueError("Cron expression does not produce a future run")
    return next_run.astimezone(timezone.utc).replace(tzinfo=None)


def iter_geo_resource_chunks(
    source: BinaryIO | Iterable[bytes], chunk_size: int = GEO_RESOURCE_UPLOAD_CHUNK_SIZE
) -> Iterator[bytes]:
    size = 0
    if hasattr(source, "read"):
        chunks = iter(lambda: source.read(chunk_size), b"")
    else:
        chunks = iter(source)

    for chunk in chunks:
        if not chunk:
            continue
        if not isinstance(chunk, (bytes, bytearray, memoryview)):
            raise ValueError("Geo resource stream must contain bytes")
        chunk = bytes(chunk)
        size += len(chunk)
        if size > MAX_GEO_RESOURCE_SIZE:
            raise ValueError("Geo resource exceeds the 128 MiB limit")
        yield chunk


@contextmanager
def download_geo_resource(url: str) -> Iterator[Iterator[bytes]]:
    with requests.get(url, stream=True, timeout=(10, 60)) as response:
        response.raise_for_status()
        declared_size = int(response.headers.get("content-length") or 0)
        if declared_size > MAX_GEO_RESOURCE_SIZE:
            raise ValueError("Geo resource exceeds the 128 MiB limit")
        yield iter_geo_resource_chunks(response.iter_content(chunk_size=GEO_RESOURCE_UPLOAD_CHUNK_SIZE))


def get_remote_node(dbnode):
    node = xray.nodes.get(dbnode.id) or xray.operations.add_node(dbnode)
    if not node.connected:
        node.connect()
    return node


def upload_remote_geo_resource(
    dbnode, filename: str, chunks: Iterable[bytes], overwrite: bool = False
):
    filename = validate_geo_resource_filename(filename)
    return get_remote_node(dbnode).upload_geo_resource(
        filename, iter_geo_resource_chunks(chunks), overwrite
    )
