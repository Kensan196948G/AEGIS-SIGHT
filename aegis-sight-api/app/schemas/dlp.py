"""DLP Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.dlp import DLPAction, DLPActionTaken, DLPRuleType, DLPSeverity


# ---------------------------------------------------------------------------
# DLP Rule schemas
# ---------------------------------------------------------------------------
class DLPRuleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    rule_type: DLPRuleType
    pattern: str = Field(..., max_length=1000)
    action: DLPAction
    severity: DLPSeverity
    is_enabled: bool = True


class DLPRuleUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    rule_type: DLPRuleType | None = None
    pattern: str | None = Field(None, max_length=1000)
    action: DLPAction | None = None
    severity: DLPSeverity | None = None
    is_enabled: bool | None = None


class DLPRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    rule_type: DLPRuleType
    pattern: str
    action: DLPAction
    severity: DLPSeverity
    is_enabled: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# DLP Event schemas
# ---------------------------------------------------------------------------
class DLPEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    rule_id: uuid.UUID
    device_id: uuid.UUID | None
    user_name: str
    file_path: str
    file_name: str
    file_size: int | None
    action_taken: DLPActionTaken
    matched_pattern: str
    detected_at: datetime


class DLPEventSummary(BaseModel):
    total_events: int
    blocked: int
    alerted: int
    logged: int
    by_severity: dict[str, int]
    by_rule_type: dict[str, int]


# ---------------------------------------------------------------------------
# DLP Evaluate schemas
# ---------------------------------------------------------------------------
class DLPEvaluateRequest(BaseModel):
    file_path: str
    file_name: str
    file_size: int | None = None
    user_name: str
    device_id: uuid.UUID | None = None


class DLPEvaluateResult(BaseModel):
    matched: bool
    actions: list[DLPAction]
    matched_rules: list[DLPRuleResponse]
    events_created: int
