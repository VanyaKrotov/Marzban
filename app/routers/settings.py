from fastapi import APIRouter, Depends, HTTPException

from app.db import Session, get_db
from app.models.admin import Admin
from app.models.settings import (
    RuntimeSettingsModify,
    RuntimeSettingsResponse,
    SubscriptionTemplate,
    SubscriptionTemplateModify,
)
from app.utils import responses
from app.utils.runtime_settings import (
    get_runtime_settings,
    get_subscription_templates,
    runtime_settings_response,
    update_runtime_settings,
    update_subscription_template,
)

router = APIRouter(tags=["Settings"], prefix="/api", responses={401: responses._401})


@router.get("/settings", response_model=RuntimeSettingsResponse, responses={403: responses._403})
def get_settings(admin: Admin = Depends(Admin.check_sudo_admin)):
    return runtime_settings_response(get_runtime_settings())


@router.patch("/settings", response_model=RuntimeSettingsResponse, responses={403: responses._403})
def modify_settings(
    modified_settings: RuntimeSettingsModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    settings = update_runtime_settings(db, modified_settings)
    return runtime_settings_response(settings)


@router.get(
    "/settings/subscription-templates",
    response_model=list[SubscriptionTemplate],
    responses={403: responses._403},
)
def get_settings_subscription_templates(admin: Admin = Depends(Admin.check_sudo_admin)):
    return list(get_subscription_templates())


@router.patch(
    "/settings/subscription-templates/{template_key}",
    response_model=SubscriptionTemplate,
    responses={403: responses._403, 404: responses._404},
)
def modify_settings_subscription_template(
    template_key: str,
    modified_template: SubscriptionTemplateModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        return update_subscription_template(db, template_key, modified_template.content)
    except KeyError:
        raise HTTPException(status_code=404, detail="Template not found")
