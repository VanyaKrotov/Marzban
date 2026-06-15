from datetime import datetime, timezone

import requests
from apscheduler.triggers.cron import CronTrigger

from app import xray
from app.models.node import validate_geo_resource_filename


MAX_GEO_RESOURCE_SIZE = 128 * 1024 * 1024


def get_next_run_at(cron: str, now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    trigger = CronTrigger.from_crontab(cron, timezone="UTC")
    next_run = trigger.get_next_fire_time(None, now)
    if next_run is None:
        raise ValueError("Cron expression does not produce a future run")
    return next_run.astimezone(timezone.utc).replace(tzinfo=None)


def download_geo_resource(url: str) -> bytes:
    with requests.get(url, stream=True, timeout=(10, 60)) as response:
        response.raise_for_status()
        declared_size = int(response.headers.get("content-length") or 0)
        if declared_size > MAX_GEO_RESOURCE_SIZE:
            raise ValueError("Geo resource exceeds the 128 MiB limit")

        chunks = []
        size = 0
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_GEO_RESOURCE_SIZE:
                raise ValueError("Geo resource exceeds the 128 MiB limit")
            chunks.append(chunk)
        return b"".join(chunks)


def get_remote_node(dbnode):
    node = xray.nodes.get(dbnode.id) or xray.operations.add_node(dbnode)
    if not node.connected:
        node.connect()
    return node


def upload_remote_geo_resource(
    dbnode, filename: str, content: bytes, overwrite: bool = False
):
    filename = validate_geo_resource_filename(filename)
    if len(content) > MAX_GEO_RESOURCE_SIZE:
        raise ValueError("Geo resource exceeds the 128 MiB limit")
    return get_remote_node(dbnode).upload_geo_resource(filename, content, overwrite)
