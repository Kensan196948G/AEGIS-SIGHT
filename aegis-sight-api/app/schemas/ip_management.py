import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.ip_management import AssignmentStatus, AssignmentType


# ---------------------------------------------------------------------------
# IPRange schemas
# ---------------------------------------------------------------------------
class IPRangeCreate(BaseModel):
    network_address: str = Field(..., description="CIDR notation, e.g. 192.168.1.0/24")
    name: str = Field(..., max_length=255)
    vlan_id: int | None = None
    gateway: str | None = None
    dns_servers: list[str] | None = None
    dhcp_enabled: bool = False
    location: str | None = Field(None, description="本社 / 支社 / 現場")
    description: str | None = None


class IPRangeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    network_address: str
    name: str
    vlan_id: int | None
    gateway: str | None
    dns_servers: list[str] | None
    dhcp_enabled: bool
    location: str | None
    description: str | None
    created_at: datetime


class IPRangeDetailResponse(IPRangeResponse):
    """IPRange with nested assignments."""
    assignments: list["IPAssignmentResponse"] = []


class IPRangeUtilization(BaseModel):
    range_id: uuid.UUID
    network_address: str
    name: str
    total_hosts: int
    assigned_count: int
    active_count: int
    reserved_count: int
    utilization_percent: float


# ---------------------------------------------------------------------------
# IPAssignment schemas
# ---------------------------------------------------------------------------
class IPAssignmentCreate(BaseModel):
    ip_address: str
    mac_address: str | None = None
    hostname: str | None = None
    device_id: uuid.UUID | None = None
    range_id: uuid.UUID
    assignment_type: AssignmentType = AssignmentType.static
    status: AssignmentStatus = AssignmentStatus.active
    notes: str | None = None


class IPAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str
    mac_address: str | None
    hostname: str | None
    device_id: uuid.UUID | None
    range_id: uuid.UUID
    assignment_type: AssignmentType
    status: AssignmentStatus
    first_seen: datetime
    last_seen: datetime
    notes: str | None


class IPConflict(BaseModel):
    ip_address: str
    assignments: list[IPAssignmentResponse]


# ---------------------------------------------------------------------------
# Topology schemas
# ---------------------------------------------------------------------------
class TopologyNode(BaseModel):
    id: str
    label: str
    type: str  # "range" | "device" | "gateway"
    ip_address: str | None = None
    status: str | None = None


class TopologyEdge(BaseModel):
    source: str
    target: str
    label: str | None = None


class TopologyResponse(BaseModel):
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]
