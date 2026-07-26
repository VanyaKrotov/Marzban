from typing import List

from fastapi import APIRouter

from app.models.admin import Admin, Token
from app.utils import responses
from app.services import admin_service as service

router = APIRouter(tags=["Admin"], prefix="/api", responses={401: responses._401})

router.post("/admin/token", response_model=Token)(service.admin_token)

router.post(
    "/admin",
    response_model=Admin,
    responses={403: responses._403, 409: responses._409},
)(service.create_admin)

router.put(
    "/admin/{username}",
    response_model=Admin,
    responses={403: responses._403},
)(service.modify_admin)

router.delete(
    "/admin/{username}",
    responses={403: responses._403},
)(service.remove_admin)

router.get("/admin", response_model=Admin)(service.get_current_admin)

router.get(
    "/admins",
    response_model=List[Admin],
    responses={403: responses._403},
)(service.get_admins)

router.post("/admin/{username}/users/disable", responses={403: responses._403, 404: responses._404})(service.disable_all_active_users)

router.post("/admin/{username}/users/activate", responses={403: responses._403, 404: responses._404})(service.activate_all_disabled_users)

router.post(
    "/admin/usage/reset/{username}",
    response_model=Admin,
    responses={403: responses._403},
)(service.reset_admin_usage)

router.get(
    "/admin/usage/{username}",
    response_model=int,
    responses={403: responses._403},
)(service.get_admin_usage)
