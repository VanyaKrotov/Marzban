from datetime import datetime

from app import logger, scheduler, xray
from app.db import GetDB
from app.utils.node_geo_resources import (
    download_geo_resource,
    get_next_run_at,
    upload_remote_geo_resource,
)
from app.utils.node_restart_state import mark_nodes_pending_restart
from app.db.crud import node_geo_resources as geo_resource_crud


def restart_updated_nodes(node_ids: set[int]) -> None:
    for node_id in node_ids:
        try:
            xray.operations.restart_node(node_id)
        except Exception as exc:
            logger.warning(
                f'Unable to schedule Xray restart for node "{node_id}" '
                f"after geo resource update: {exc}"
            )


def update_due_node_geo_resources():
    now = datetime.utcnow()
    updated_node_ids = set()
    with GetDB() as db:
        resources = geo_resource_crud.get_due_node_geo_resource_updates(db, now)
        for resource in resources:
            try:
                content = download_geo_resource(resource.url)
                upload_remote_geo_resource(
                    resource.node, resource.filename, content, overwrite=True
                )
                mark_nodes_pending_restart([resource.node_id])
                updated_node_ids.add(resource.node_id)
                error = None
            except Exception as exc:
                error = str(exc)
                logger.warning(
                    f'Unable to update geo resource "{resource.filename}" '
                    f'on node "{resource.node.name}": {exc}'
                )

            next_run_at = get_next_run_at(resource.cron)
            geo_resource_crud.update_node_geo_resource_result(
                db, resource, next_run_at=next_run_at, error=error
            )
    restart_updated_nodes(updated_node_ids)


scheduler.add_job(
    update_due_node_geo_resources,
    "interval",
    minutes=20,
    coalesce=True,
    max_instances=1,
)
