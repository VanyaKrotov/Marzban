from datetime import datetime

from app import logger, scheduler
from app.db import GetDB, crud
from app.utils.node_geo_resources import (
    download_geo_resource,
    get_next_run_at,
    upload_remote_geo_resource,
)


def update_due_node_geo_resources():
    now = datetime.utcnow()
    with GetDB() as db:
        resources = crud.get_due_node_geo_resource_updates(db, now)
        for resource in resources:
            try:
                content = download_geo_resource(resource.url)
                upload_remote_geo_resource(
                    resource.node, resource.filename, content, overwrite=True
                )
                error = None
            except Exception as exc:
                error = str(exc)
                logger.warning(
                    f'Unable to update geo resource "{resource.filename}" '
                    f'on node "{resource.node.name}": {exc}'
                )

            next_run_at = get_next_run_at(resource.cron)
            crud.update_node_geo_resource_result(
                db, resource, next_run_at=next_run_at, error=error
            )


scheduler.add_job(
    update_due_node_geo_resources,
    "interval",
    minutes=20,
    coalesce=True,
    max_instances=1,
)
