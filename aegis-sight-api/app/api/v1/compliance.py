"""Compliance API endpoints -- framework scores and audit status."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.compliance import (
    AuditEvent,
    ComplianceIssue,
    ComplianceOverviewResponse,
    ISO27001Category,
    ISO27001Response,
    JSOXControl,
    JSOXResponse,
    NISTFunction,
    NISTResponse,
)

router = APIRouter(prefix="/compliance", tags=["compliance"])


# ---------------------------------------------------------------------------
# Mock data -- replace with DB queries when compliance models are added
# ---------------------------------------------------------------------------

_ISO_CATEGORIES = [
    ISO27001Category(name="A.5 情報セキュリティ方針", score=92, max_score=100, status="compliant"),
    ISO27001Category(name="A.6 情報セキュリティの組織", score=85, max_score=100, status="compliant"),
    ISO27001Category(name="A.7 人的資源セキュリティ", score=78, max_score=100, status="partial"),
    ISO27001Category(name="A.8 資産管理", score=88, max_score=100, status="compliant"),
    ISO27001Category(name="A.9 アクセス制御", score=91, max_score=100, status="compliant"),
    ISO27001Category(name="A.10 暗号", score=95, max_score=100, status="compliant"),
    ISO27001Category(name="A.11 物理的・環境的セキュリティ", score=82, max_score=100, status="compliant"),
    ISO27001Category(name="A.12 運用セキュリティ", score=76, max_score=100, status="partial"),
    ISO27001Category(name="A.13 通信セキュリティ", score=89, max_score=100, status="compliant"),
    ISO27001Category(name="A.14 システム取得・開発・保守", score=72, max_score=100, status="partial"),
]

_JSOX_CONTROLS = [
    JSOXControl(area="プログラム変更管理", status="effective", findings=0, remediation_progress=100),
    JSOXControl(area="アクセス管理", status="partially_effective", findings=2, remediation_progress=75),
    JSOXControl(area="コンピュータ運用", status="effective", findings=0, remediation_progress=100),
    JSOXControl(area="プログラム開発", status="partially_effective", findings=1, remediation_progress=60),
]

_NIST_FUNCTIONS = [
    NISTFunction(function="識別 (Identify)", tier=3, target_tier=4, score=75, max_score=100),
    NISTFunction(function="防御 (Protect)", tier=3, target_tier=4, score=80, max_score=100),
    NISTFunction(function="検知 (Detect)", tier=2, target_tier=3, score=65, max_score=100),
    NISTFunction(function="対応 (Respond)", tier=3, target_tier=4, score=70, max_score=100),
    NISTFunction(function="復旧 (Recover)", tier=2, target_tier=3, score=55, max_score=100),
    NISTFunction(function="統治 (Govern)", tier=2, target_tier=3, score=60, max_score=100),
]

_ISSUES: list[ComplianceIssue] = [
    ComplianceIssue(id="CI-001", framework="ISO 27001", severity="high", title="A.12 運用セキュリティ: ログ監視の自動化不足", status="in_progress", due_date="2026-04-15"),
    ComplianceIssue(id="CI-002", framework="J-SOX", severity="medium", title="アクセス権の定期レビュー未実施（Q1）", status="open", due_date="2026-04-30"),  # noqa: RUF001
    ComplianceIssue(id="CI-003", framework="NIST CSF", severity="high", title="インシデント対応計画の更新遅延", status="in_progress", due_date="2026-04-10"),
    ComplianceIssue(id="CI-004", framework="ISO 27001", severity="critical", title="A.14 開発環境と本番環境の分離不十分", status="open", due_date="2026-04-05"),
    ComplianceIssue(id="CI-005", framework="J-SOX", severity="low", title="変更管理チケットの承認記録不備", status="open", due_date="2026-05-01"),
]

_EVENTS: list[AuditEvent] = [
    AuditEvent(timestamp="2026-03-27T10:30:00Z", event_type="assessment", description="ISO 27001 内部監査完了", actor="監査チーム"),
    AuditEvent(timestamp="2026-03-25T14:00:00Z", event_type="remediation", description="アクセス制御ポリシー更新", actor="情報セキュリティ部"),
    AuditEvent(timestamp="2026-03-22T09:15:00Z", event_type="finding", description="J-SOX ITGC テスト: アクセス管理に指摘事項", actor="外部監査人"),
    AuditEvent(timestamp="2026-03-20T16:45:00Z", event_type="review", description="NIST CSF 成熟度評価レビュー会議", actor="CISO"),
    AuditEvent(timestamp="2026-03-18T11:00:00Z", event_type="training", description="セキュリティ意識向上トレーニング実施", actor="HR"),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/overview",
    response_model=ComplianceOverviewResponse,
    summary="Compliance overview",
    description="Aggregated compliance scores across all frameworks.",
)
async def compliance_overview():
    iso_score = sum(c.score for c in _ISO_CATEGORIES) / len(_ISO_CATEGORIES)
    jsox_status = (
        "effective"
        if all(c.status == "effective" for c in _JSOX_CONTROLS)
        else "partially_effective"
    )
    nist_tier = sum(f.tier for f in _NIST_FUNCTIONS) / len(_NIST_FUNCTIONS)
    open_count = sum(1 for i in _ISSUES if i.status != "resolved")

    return ComplianceOverviewResponse(
        iso27001_score=round(iso_score, 1),
        jsox_status=jsox_status,
        nist_tier=round(nist_tier, 1),
        open_issues=open_count,
        recent_events=_EVENTS,
        issues=_ISSUES,
    )


@router.get(
    "/iso27001",
    response_model=ISO27001Response,
    summary="ISO 27001 compliance status",
    description="Detailed ISO 27001 control category scores.",
)
async def iso27001_status():
    overall = sum(c.score for c in _ISO_CATEGORIES) / len(_ISO_CATEGORIES)
    return ISO27001Response(
        overall_score=round(overall, 1),
        categories=_ISO_CATEGORIES,
        last_assessment="2026-03-27",
        next_review="2026-06-27",
    )


@router.get(
    "/jsox",
    response_model=JSOXResponse,
    summary="J-SOX ITGC compliance status",
    description="J-SOX IT General Controls status across four areas.",
)
async def jsox_status():
    overall = (
        "effective"
        if all(c.status == "effective" for c in _JSOX_CONTROLS)
        else "partially_effective"
    )
    return JSOXResponse(
        overall_status=overall,
        controls=_JSOX_CONTROLS,
        audit_period="2025-04 ~ 2026-03",
        last_tested="2026-03-22",
    )


@router.get(
    "/nist",
    response_model=NISTResponse,
    summary="NIST CSF maturity assessment",
    description="NIST Cybersecurity Framework core function maturity tiers.",
)
async def nist_status():
    avg_tier = sum(f.tier for f in _NIST_FUNCTIONS) / len(_NIST_FUNCTIONS)
    return NISTResponse(
        overall_tier=round(avg_tier, 1),
        functions=_NIST_FUNCTIONS,
        last_assessment="2026-03-20",
    )
