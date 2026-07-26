from typing import List

from fastapi import APIRouter

from app.models.user import UserResponse, UsersResponse, UsersUsagesResponse, UserUsagesResponse
from app.utils import responses
from app.services import user_service as service

router = APIRouter(tags=["User"], prefix="/api", responses={401: responses._401})

router.post("/user", response_model=UserResponse, responses={400: responses._400, 409: responses._409})(service.add_user)

router.get("/user/{username}", response_model=UserResponse, responses={403: responses._403, 404: responses._404})(service.get_user)

router.put("/user/{username}", response_model=UserResponse, responses={400: responses._400, 403: responses._403, 404: responses._404})(service.modify_user)

router.delete("/user/{username}", responses={403: responses._403, 404: responses._404})(service.remove_user)

router.post("/user/{username}/reset", response_model=UserResponse, responses={403: responses._403, 404: responses._404})(service.reset_user_data_usage)

router.post("/user/{username}/revoke_sub", response_model=UserResponse, responses={403: responses._403, 404: responses._404})(service.revoke_user_subscription)

router.get("/users", response_model=UsersResponse, responses={400: responses._400, 403: responses._403, 404: responses._404})(service.get_users)

router.post("/users/reset", responses={403: responses._403, 404: responses._404})(service.reset_users_data_usage)

router.get("/user/{username}/usage", response_model=UserUsagesResponse, responses={403: responses._403, 404: responses._404})(service.get_user_usage)

router.post("/user/{username}/active-next", response_model=UserResponse, responses={403: responses._403, 404: responses._404})(service.active_next_plan)

router.get("/users/usage", response_model=UsersUsagesResponse)(service.get_users_usage)

router.put("/user/{username}/set-owner", response_model=UserResponse)(service.set_owner)

router.get("/users/expired", response_model=List[str])(service.get_expired_users)

router.delete("/users/expired", response_model=List[str])(service.delete_expired_users)
