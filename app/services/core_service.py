from fastapi import Depends, HTTPException

from app.models.admin import Admin
from app.models.core import CoreTlsCertificateRequest, CoreTlsCertificateResponse
from app.utils.xray_binary import get_tls_certificate, get_x25519


def get_x25519_keys(_: Admin = Depends(Admin.check_sudo_admin)):
    res = get_x25519()
    if res is None:
        raise HTTPException(status_code=400, detail="Invalid private key")

    return res


def generate_tls_certificate(
    request: CoreTlsCertificateRequest,
    _: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        return CoreTlsCertificateResponse(
            **get_tls_certificate(request.server_name)
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
