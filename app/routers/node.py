from typing import List

from fastapi import APIRouter

from app.models.node import (
    NodeCertificateResponse,
    NodeGeoResourceResponse,
    NodeStaticLogFileResponse,
    NodeResponse,
    NodeSettings,
    NodesUsageResponse,
)
from app.utils import responses
from app.services import node_service as service

router = APIRouter(
    tags=["Node"], prefix="/api", responses={401: responses._401, 403: responses._403}
)

router.get("/node/settings", response_model=NodeSettings)(service.get_node_settings)

router.post("/node", response_model=NodeResponse, responses={409: responses._409})(service.add_node)

router.get(
    "/node/{node_id}/config-template",
    responses={403: responses._403},
)(service.get_node_config_template)

router.put(
    "/node/{node_id}/config-template",
    responses={400: responses._400, 403: responses._403},
)(service.modify_node_config_template)

router.get("/node/{node_id}", response_model=NodeResponse)(service.get_node)

router.websocket("/node/{node_id}/logs")(service.node_logs)

router.get("/nodes", response_model=List[NodeResponse])(service.get_nodes)

router.put("/node/{node_id}", response_model=NodeResponse)(service.modify_node)

router.post("/node/{node_id}/reconnect")(service.reconnect_node)

router.post("/node/{node_id}/restart")(service.restart_node)

router.get(
    "/node/{node_id}/geo-resources",
    response_model=List[NodeGeoResourceResponse],
)(service.get_node_geo_resources)

router.get(
    "/node/{node_id}/static-logs",
    response_model=List[NodeStaticLogFileResponse],
)(service.get_node_static_logs)

router.get("/node/{node_id}/static-logs/{log_type}/{filename}/download")(
    service.download_node_static_log
)

router.delete("/node/{node_id}/static-logs/{log_type}/{filename}")(
    service.delete_node_static_log
)

router.post("/node/{node_id}/geo-resources/upload")(service.upload_node_geo_resource)

router.post(
    "/node/{node_id}/geo-resources/remote",
    response_model=NodeGeoResourceResponse,
)(service.create_remote_node_geo_resource)

router.put(
    "/node/{node_id}/geo-resources/{filename}/schedule",
    response_model=NodeGeoResourceResponse,
)(service.modify_node_geo_resource_schedule)

router.post("/node/{node_id}/geo-resources/{filename}/refresh")(service.refresh_node_geo_resource)

router.get("/node/{node_id}/geo-resources/{filename}/download")(service.download_node_geo_resource)

router.post("/node/{node_id}/geo-resources/{filename}/rename")(service.rename_node_geo_resource)

router.post("/node/{node_id}/geo-resources/bulk-delete")(service.bulk_delete_node_geo_resources)

router.delete("/node/{node_id}/geo-resources/{filename}")(service.delete_node_geo_resource)

router.get(
    "/node/{node_id}/certificates",
    response_model=List[NodeCertificateResponse],
)(service.get_node_certificates)

router.post(
    "/node/{node_id}/certificates/issue",
    response_model=NodeCertificateResponse,
)(service.issue_node_certificate)

router.post(
    "/node/{node_id}/certificates/import",
    response_model=NodeCertificateResponse,
)(service.import_node_certificate)

router.put(
    "/node/{node_id}/certificates/{certificate_id}",
    response_model=NodeCertificateResponse,
)(service.modify_node_certificate)

router.delete("/node/{node_id}/certificates/{certificate_id}")(service.remove_node_certificate)

router.delete("/node/{node_id}")(service.remove_node)

router.get("/nodes/usage", response_model=NodesUsageResponse)(service.get_usage)
