"""Pydantic schemas for the device policy engine."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.policy import PolicyType

# ---------------------------------------------------------------------------
# DevicePolicy schemas
# ---------------------------------------------------------------------------

class DevicePolicyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    policy_type: PolicyType
    rules: dict | None = None
    target_groups: list[uuid.UUID] | None = None
    is_enabled: bool = True
    priority: int = Field(0, ge=0)


class DevicePolicyUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    policy_type: PolicyType | None = None
    rules: dict | None = None
    target_groups: list[uuid.UUID] | None = None
    is_enabled: bool | None = None
    priority: int | None = Field(None, ge=0)


class DevicePolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    policy_type: PolicyType
    rules: dict | None
    target_groups: list | None
    is_enabled: bool
    priority: int
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# PolicyViolation schemas
# ---------------------------------------------------------------------------

class PolicyViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    policy_id: uuid.UUID
    device_id: uuid.UUID
    violation_type: str
    detail: dict | None
    detected_at: datetime
    resolved_at: datetime | None
    is_resolved: bool


class PolicyViolationResolve(BaseModel):
    """Body for resolving a violation."""
    pass


# ---------------------------------------------------------------------------
# Compliance summary
# ---------------------------------------------------------------------------

class PolicyComplianceSummary(BaseModel):
    total_policies: int
    enabled_policies: int
    total_violations: int
    unresolved_violations: int
    compliance_rate: float = Field(..., description="Percentage 0-100")
    by_type: dict[str, int] = Field(
        default_factory=dict,
        description="Unresolved violation count per policy_type",
    )


# ---------------------------------------------------------------------------
# Evaluate request
# ---------------------------------------------------------------------------

class PolicyEvaluateRequest(BaseModel):
    policy_ids: list[uuid.UUID] | None = Field(
        None, description="Specific policies to evaluate; null = all enabled"
    )
    device_ids: list[uuid.UUID] | None = Field(
        None, description="Specific devices to evaluate; null = all"
    )


class PolicyEvaluateResponse(BaseModel):
    evaluated_policies: int
    evaluated_devices: int
    new_violations: int
