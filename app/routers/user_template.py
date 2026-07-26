from typing import List

from fastapi import APIRouter

from app.models.user_template import UserTemplateResponse
from app.services import user_template_service as service

router = APIRouter(tags=['User Template'], prefix='/api')

router.post("/user_template", response_model=UserTemplateResponse)(service.add_user_template)

router.get("/user_template/{template_id}", response_model=UserTemplateResponse)(service.get_user_template_endpoint)

router.put("/user_template/{template_id}", response_model=UserTemplateResponse)(service.modify_user_template)

router.delete("/user_template/{template_id}")(service.remove_user_template)

router.get("/user_template", response_model=List[UserTemplateResponse])(service.get_user_templates)
