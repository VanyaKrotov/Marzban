from enum import Enum
from datetime import datetime
import re
from typing import List, Optional
from urllib.parse import urlparse

from apscheduler.triggers.cron import CronTrigger
from pydantic import ConfigDict, BaseModel, Field, field_validator, model_validator


NODE_CERTIFICATES_DIR = "/var/lib/marzban-node/certificates"


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
    access_log_enabled: bool = False
    error_log_enabled: bool = False
    log_retention_days: int = Field(default=14, ge=1)
    log_storage_limit_bytes: Optional[int] = Field(default=None, ge=1)


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
    access_log_enabled: Optional[bool] = Field(None, nullable=True)
    error_log_enabled: Optional[bool] = Field(None, nullable=True)
    log_retention_days: Optional[int] = Field(None, ge=1, nullable=True)
    log_storage_limit_bytes: Optional[int] = Field(None, ge=1, nullable=True)
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
    restart_required: bool = False
    model_config = ConfigDict(from_attributes=True)


class NodeUsageResponse(BaseModel):
    node_id: int
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


class NodeCertificateImport(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    certificate_file: str = Field(min_length=1, max_length=2048)
    key_file: str = Field(min_length=1, max_length=2048)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str) -> str:
        return NodeCertificateIssue.validate_domain(value)

    @field_validator("certificate_file", "key_file")
    @classmethod
    def validate_file_path(cls, value: str) -> str:
        value = value.strip()
        if not value.startswith("/"):
            raise ValueError("Path must be absolute")
        return value


class NodeCertificateModify(BaseModel):
    active: Optional[bool] = None


class NodeCertificateResponse(BaseModel):
    id: int
    node_id: int
    domain: str
    certificate: str
    certificate_file: Optional[str] = None
    key_file: Optional[str] = None
    expires_at: Optional[datetime] = None
    active: bool
    inbound_tags: List[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def fill_file_paths(self):
        base = f"{NODE_CERTIFICATES_DIR}/{self.domain}/production"
        if not self.certificate_file:
            self.certificate_file = f"{base}/fullchain.pem"
        if not self.key_file:
            self.key_file = f"{base}/private_key.pem"
        return self


def validate_geo_resource_filename(value: str) -> str:
    value = value.strip()
    if (
        not value
        or value in {".", ".."}
        or not re.fullmatch(r'[^<>:"/\\|?*\x00-\x1f]+\.dat', value, re.IGNORECASE)
    ):
        raise ValueError("Filename must be a plain .dat filename")
    return value


def validate_static_log_filename(value: str) -> str:
    value = value.strip()
    if not re.fullmatch(r"(?:0[1-9]|[12]\d|3[01])-(?:0[1-9]|1[0-2])-\d{4}\.txt", value):
        raise ValueError("Filename must use DD-MM-YYYY.txt format")
    try:
        datetime.strptime(value[:-4], "%d-%m-%Y")
    except ValueError as exc:
        raise ValueError("Filename must use a valid date") from exc
    return value


class NodeStaticLogFileResponse(BaseModel):
    type: str
    filename: str
    size: int
    modified_at: datetime
    active: bool


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
