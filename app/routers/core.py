
from fastapi import APIRouter

from app.models.core import CoreStats
from app.utils import responses
from app.services import core_service as service

router = APIRouter(tags=["Core"], prefix="/api", responses={401: responses._401})

router.websocket("/core/logs")(service.core_logs)

router.get("/core", response_model=CoreStats)(service.get_core_stats)

router.post("/core/restart", responses={403: responses._403})(service.restart_core)

router.get("/core/config", responses={403: responses._403})(service.get_core_config)

router.put("/core/config", responses={403: responses._403})(service.modify_core_config)

router.get("/core/x25519", responses={400: responses._400})(service.get_x25519_keys)
