
from fastapi import APIRouter

from app.models.core import CoreTlsCertificateResponse
from app.utils import responses
from app.services import core_service as service

router = APIRouter(tags=["Core"], prefix="/api", responses={401: responses._401})

router.get("/core/x25519", responses={400: responses._400})(service.get_x25519_keys)
router.post(
    "/core/tls/certificate",
    response_model=CoreTlsCertificateResponse,
)(service.generate_tls_certificate)
