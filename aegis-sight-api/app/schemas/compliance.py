"""Pydantic schemas for compliance endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# ISO 27001
# ---------------------------------------------------------------------------

class ISO27001Category(BaseModel):
    """Single ISO 27001 control category score."""
    name: str
    score: float
    max_score: float
    status: str  # compliant / partial / non_compliant


class ISO27001Response(BaseModel):
    """ISO 27001 compliance overview."""
    overall_score: float
    categories: list[ISO27001Category]
    last_assessment: str
    next_review: str


# ---------------------------------------------------------------------------
# J-SOX (ITGC)
# ---------------------------------------------------------------------------

class JSOXControl(BaseModel):
    """Single ITGC control area."""
    area: str
    status: str  # effective / partially_effective / ineffective
    findings: int
    remediation_progress: float


class JSOXResponse(BaseModel):
    """J-SOX ITGC compliance status."""
    overall_status: str
    controls: list[JSOXControl]
    audit_period: str
    last_tested: str


# ---------------------------------------------------------------------------
# NIST CSF
# ---------------------------------------------------------------------------

class NISTFunction(BaseModel):
    """Single NIST CSF core function maturity."""
    function: str
    tier: int  # 1-4
    target_tier: int
    score: float
    max_score: float


class NISTResponse(BaseModel):
    """NIST CSF maturity assessment."""
    overall_tier: float
    functions: list[NISTFunction]
    last_assessment: str


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

class ComplianceIssue(BaseModel):
    """Open compliance issue."""
    id: str
    framework: str
    severity: str  # critical / high / medium / low
    title: str
    status: str  # open / in_progress / resolved
    due_date: str | None = None


class AuditEvent(BaseModel):
    """Recent audit event entry."""
    timestamp: str
    event_type: str
    description: str
    actor: str


class ComplianceOverviewResponse(BaseModel):
    """Aggregated compliance overview."""
    iso27001_score: float
    jsox_status: str
    nist_tier: float
    open_issues: int
    recent_events: list[AuditEvent]
    issues: list[ComplianceIssue]
