from typing import Optional

from pydantic import BaseModel, Field, field_validator


class CoreTlsCertificateRequest(BaseModel):
    server_name: Optional[str] = Field(None, max_length=253)

    @field_validator("server_name")
    @classmethod
    def normalize_server_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip().lower().rstrip(".")
        return value or None


class CoreTlsCertificateResponse(BaseModel):
    certificate: list[str]
    key: list[str]
