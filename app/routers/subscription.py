
from fastapi import APIRouter

from app.models.user import SubscriptionUserResponse
from config import XRAY_SUBSCRIPTION_PATH

client_config = {
    "clash-meta": {"config_format": "clash-meta", "media_type": "text/yaml", "as_base64": False, "reverse": False},
    "sing-box": {"config_format": "sing-box", "media_type": "application/json", "as_base64": False, "reverse": False},
    "clash": {"config_format": "clash", "media_type": "text/yaml", "as_base64": False, "reverse": False},
    "v2ray": {"config_format": "v2ray", "media_type": "text/plain", "as_base64": True, "reverse": False},
    "outline": {"config_format": "outline", "media_type": "application/json", "as_base64": False, "reverse": False},
    "v2ray-json": {"config_format": "v2ray-json", "media_type": "application/json", "as_base64": False,
                   "reverse": False}
}
from app.services import subscription_service as service

router = APIRouter(tags=['Subscription'], prefix=f'/{XRAY_SUBSCRIPTION_PATH}')

router.get("/{token}", include_in_schema=False)(service.user_subscription)

router.get("/{token}/info", response_model=SubscriptionUserResponse)(service.user_subscription_info)

router.get("/{token}/usage")(service.user_get_usage)

router.get("/{token}/{client_type}")(service.user_subscription_with_client_type)
