from enum import Enum
from datetime import datetime
import re
from typing import List, Optional
from urllib.parse import urlparse

from apscheduler.triggers.cron import CronTrigger
from pydantic import ConfigDict, BaseModel, Field, field_validator


class NodeStatus(str, Enum):
    connected = "connected"
    connecting = "connecting"
    error = "error"
    disabled = "disabled"


class NodeSettings(BaseModel):
    min_node_version: str = "v0.2.0"
    certificate: str


class Node(BaseModel):
    name: str
    address: str
    port: int = 62050
    api_port: int = 62051
    usage_coefficient: float = Field(gt=0, default=1.0)


class NodeCreate(Node):
    add_as_new_host: bool = True
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "DE node",
            "address": "192.168.1.1",
            "port": 62050,
            "api_port": 62051,
            "add_as_new_host": True,
            "usage_coefficient": 1
        }
    })


class NodeModify(Node):
    name: Optional[str] = Field(None, nullable=True)
    address: Optional[str] = Field(None, nullable=True)
    port: Optional[int] = Field(None, nullable=True)
    api_port: Optional[int] = Field(None, nullable=True)
    status: Optional[NodeStatus] = Field(None, nullable=True)
    usage_coefficient: Optional[float] = Field(None, nullable=True)
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "DE node",
            "address": "192.168.1.1",
            "port": 62050,
            "api_port": 62051,
            "status": "disabled",
            "usage_coefficient": 1.0
        }
    })


class NodeResponse(Node):
    id: int
    xray_version: Optional[str] = None
    status: NodeStatus
    message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class NodeUsageResponse(BaseModel):
    node_id: Optional[int] = None
    node_name: str
    uplink: int
    downlink: int


class NodesUsageResponse(BaseModel):
    usages: List[NodeUsageResponse]


class NodeCertificateIssue(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    email: Optional[str] = Field(None, max_length=320)
    staging: bool = False
    force: bool = False

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str) -> str:
        value = value.strip().lower().rstrip(".")
        if not re.fullmatch(
            r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?",
            value,
        ):
            raise ValueError("Invalid domain name")
        return value


class NodeCertificateModify(BaseModel):
    active: Optional[bool] = None
    inbound_tags: Optional[List[str]] = None


class NodeCertificateResponse(BaseModel):
    id: int
    node_id: int
    domain: str
    certificate: str
    expires_at: Optional[datetime] = None
    active: bool
    inbound_tags: List[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


def validate_geo_resource_filename(value: str) -> str:
    value = value.strip()
    if (
        not value
        or value in {".", ".."}
        or not re.fullmatch(r'[^<>:"/\\|?*\x00-\x1f]+\.dat', value, re.IGNORECASE)
    ):
        raise ValueError("Filename must be a plain .dat filename")
    return value


class NodeGeoResourceRemoteCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2048)
    cron: str = Field(min_length=1, max_length=128)
    overwrite: bool = False

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        return validate_geo_resource_filename(value)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("URL must use HTTP or HTTPS")
        return value

    @field_validator("cron")
    @classmethod
    def validate_cron(cls, value: str) -> str:
        value = " ".join(value.split())
        try:
            CronTrigger.from_crontab(value, timezone="UTC")
        except ValueError as exc:
            raise ValueError("Invalid five-field cron expression") from exc
        return value


class NodeGeoResourceScheduleModify(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    cron: str = Field(min_length=1, max_length=128)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return NodeGeoResourceRemoteCreate.validate_url(value)

    @field_validator("cron")
    @classmethod
    def validate_cron(cls, value: str) -> str:
        return NodeGeoResourceRemoteCreate.validate_cron(value)


class NodeGeoResourceRename(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    overwrite: bool = False

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        return validate_geo_resource_filename(value)


class NodeGeoResourceBulkDelete(BaseModel):
    filenames: List[str] = Field(min_length=1)

    @field_validator("filenames")
    @classmethod
    def validate_filenames(cls, values: List[str]) -> List[str]:
        return list(
            dict.fromkeys(
                validate_geo_resource_filename(value) for value in values
            )
        )


class NodeGeoResourceResponse(BaseModel):
    filename: str
    size: int = 0
    modified_at: Optional[datetime] = None
    auto_update: bool = False
    url: Optional[str] = None
    cron: Optional[str] = None
    last_updated_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_error: Optional[str] = None
    last_error_at: Optional[datetime] = None
