
from fastapi import APIRouter

from app.models.settings import RuntimeSettingsResponse, SubscriptionTemplate
from app.utils import responses
from app.services import settings_service as service

router = APIRouter(tags=["Settings"], prefix="/api", responses={401: responses._401})

router.get("/settings", response_model=RuntimeSettingsResponse, responses={403: responses._403})(service.get_settings)

router.patch("/settings", response_model=RuntimeSettingsResponse, responses={403: responses._403})(service.modify_settings)

router.get(
    "/settings/subscription-templates",
    response_model=list[SubscriptionTemplate],
    responses={403: responses._403},
)(service.get_settings_subscription_templates)

router.patch(
    "/settings/subscription-templates/{template_key}",
    response_model=SubscriptionTemplate,
    responses={403: responses._403, 404: responses._404},
)(service.modify_settings_subscription_template)

router.get("/settings/backups/database", responses={403: responses._403})(service.download_database_backup)

router.post("/settings/backups/database", responses={403: responses._403})(service.restore_database_backup)

router.get("/settings/backups/full", responses={403: responses._403})(service.download_full_backup)

router.post("/settings/backups/full", responses={403: responses._403})(service.restore_full_backup)
