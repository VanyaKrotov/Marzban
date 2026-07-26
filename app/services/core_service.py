from fastapi import Depends, HTTPException

from app.models.admin import Admin
from app.utils.xray_binary import get_x25519


def get_x25519_keys(_: Admin = Depends(Admin.check_sudo_admin)):
    res = get_x25519()
    if res is None:
        raise HTTPException(status_code=400, detail="Invalid private key")

    return res
