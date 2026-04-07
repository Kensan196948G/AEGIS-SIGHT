import uuid
from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sla import (
    MeasurementPeriod,
    SLADefinition,
    SLAMeasurement,
    SLAMetricType,
    SLAViolation,
    ViolationSeverity,
)


async def _create_sla_definition(
    db: AsyncSession,
    name: str = "System Availability",
    metric_type: SLAMetricType = SLAMetricType.availability,
    target_value: Decimal = Decimal("99.9000"),
    unit: str = "percent",
    measurement_period: MeasurementPeriod = MeasurementPeriod.monthly,
    warning_threshold: Decimal = Decimal("99.5000"),
) -> SLADefinition:
    """Helper to insert a test SLA definition."""
    defn = SLADefinition(
        name=name,
        description="Test SLA definition",
        metric_type=metric_type,
        target_value=target_value,
        unit=unit,
        measurement_period=measurement_period,
        warning_threshold=warning_threshold,
    )
    db.add(defn)
    await db.flush()
    await db.refresh(defn)
    return defn


async def _create_sla_measurement(
    db: AsyncSession,
    sla_id: uuid.UUID,
    measured_value: Decimal = Decimal("99.9500"),
    target_value: Decimal = Decimal("99.9000"),
    is_met: bool = True,
    period_start: date = date(2026, 3, 1),
    period_end: date = date(2026, 3, 31),
) -> SLAMeasurement:
    """Helper to insert a test SLA measurement."""
    meas = SLAMeasurement(
        sla_id=sla_id,
        measured_value=measured_value,
        target_value=target_value,
        is_met=is_met,
        period_start=period_start,
        period_end=period_end,
    )
    db.add(meas)
    await db.flush()
    await db.refresh(meas)
    return meas


# ---------------------------------------------------------------------------
# SLA Definition endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_definitions_unauthorized(client: AsyncClient):
    """Test that listing SLA definitions requires authentication."""
    response = await client.get("/api/v1/sla/definitions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_definitions(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing SLA definitions with authentication."""
    await _create_sla_definition(db_session)
    response = await client.get("/api/v1/sla/definitions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_definitions_filter_metric_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing SLA definitions filtered by metric type."""
    await _create_sla_definition(
        db_session, metric_type=SLAMetricType.response_time, name="Response Time SLA"
    )
    response = await client.get(
        "/api/v1/sla/definitions?metric_type=response_time", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["metric_type"] == "response_time"


@pytest.mark.asyncio
async def test_create_definition(client: AsyncClient, auth_headers: dict):
    """Test creating a new SLA definition."""
    payload = {
        "name": "Uptime SLA",
        "description": "Monthly uptime target",
        "metric_type": "availability",
        "target_value": "99.95",
        "unit": "percent",
        "measurement_period": "monthly",
        "warning_threshold": "99.50",
    }
    response = await client.post(
        "/api/v1/sla/definitions", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Uptime SLA"
    assert data["metric_type"] == "availability"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_update_definition(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test updating an SLA definition."""
    defn = await _create_sla_definition(db_session)
    payload = {"name": "Updated SLA Name", "is_active": False}
    response = await client.patch(
        f"/api/v1/sla/definitions/{defn.id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated SLA Name"
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_update_definition_not_found(client: AsyncClient, auth_headers: dict):
    """Test updating a non-existent SLA definition."""
    fake_id = uuid.uuid4()
    payload = {"name": "Does not exist"}
    response = await client.patch(
        f"/api/v1/sla/definitions/{fake_id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# SLA Measurement endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_measurements(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing SLA measurements."""
    defn = await _create_sla_definition(db_session)
    await _create_sla_measurement(db_session, sla_id=defn.id)
    response = await client.get("/api/v1/sla/measurements", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_measurements_filter_sla_id(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing measurements filtered by SLA ID."""
    defn = await _create_sla_definition(db_session, name="Filter Test SLA")
    await _create_sla_measurement(db_session, sla_id=defn.id)
    response = await client.get(
        f"/api/v1/sla/measurements?sla_id={defn.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["sla_id"] == str(defn.id)


@pytest.mark.asyncio
async def test_create_measurement(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test creating a new SLA measurement."""
    defn = await _create_sla_definition(db_session, name="Measurement Create Test")
    payload = {
        "sla_id": str(defn.id),
        "measured_value": "99.95",
        "target_value": "99.90",
        "is_met": True,
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
    }
    response = await client.post(
        "/api/v1/sla/measurements", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sla_id"] == str(defn.id)
    assert data["is_met"] is True


@pytest.mark.asyncio
async def test_create_measurement_auto_violation(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that creating a failed measurement auto-creates a violation."""
    defn = await _create_sla_definition(db_session, name="Violation Auto Test")
    payload = {
        "sla_id": str(defn.id),
        "measured_value": "98.00",
        "target_value": "99.90",
        "is_met": False,
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
    }
    response = await client.post(
        "/api/v1/sla/measurements", json=payload, headers=auth_headers
    )
    assert response.status_code == 201

    # Check that a violation was created
    viol_response = await client.get(
        f"/api/v1/sla/violations?sla_id={defn.id}", headers=auth_headers
    )
    assert viol_response.status_code == 200
    viol_data = viol_response.json()
    assert viol_data["total"] >= 1


@pytest.mark.asyncio
async def test_create_measurement_sla_not_found(
    client: AsyncClient, auth_headers: dict
):
    """Test creating a measurement with non-existent SLA definition."""
    payload = {
        "sla_id": str(uuid.uuid4()),
        "measured_value": "99.00",
        "target_value": "99.90",
        "is_met": True,
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
    }
    response = await client.post(
        "/api/v1/sla/measurements", json=payload, headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# SLA Violation endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_violations(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing SLA violations."""
    defn = await _create_sla_definition(db_session, name="Violation List Test")
    meas = await _create_sla_measurement(
        db_session,
        sla_id=defn.id,
        measured_value=Decimal("98.0000"),
        is_met=False,
    )
    violation = SLAViolation(
        sla_id=defn.id,
        measurement_id=meas.id,
        violation_detail="SLA not met",
        severity=ViolationSeverity.breach,
    )
    db_session.add(violation)
    await db_session.flush()

    response = await client.get("/api/v1/sla/violations", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_violations_filter_severity(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing violations filtered by severity."""
    defn = await _create_sla_definition(db_session, name="Violation Severity Filter")
    meas = await _create_sla_measurement(
        db_session, sla_id=defn.id, measured_value=Decimal("99.6000"), is_met=False
    )
    violation = SLAViolation(
        sla_id=defn.id,
        measurement_id=meas.id,
        violation_detail="Warning level violation",
        severity=ViolationSeverity.warning,
    )
    db_session.add(violation)
    await db_session.flush()

    response = await client.get(
        "/api/v1/sla/violations?severity=warning", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["severity"] == "warning"


# ---------------------------------------------------------------------------
# Dashboard endpoint
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_sla_dashboard(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test SLA dashboard endpoint."""
    defn = await _create_sla_definition(db_session, name="Dashboard Test SLA")
    await _create_sla_measurement(db_session, sla_id=defn.id, is_met=True)
    await _create_sla_measurement(
        db_session,
        sla_id=defn.id,
        measured_value=Decimal("98.0000"),
        is_met=False,
        period_start=date(2026, 2, 1),
        period_end=date(2026, 2, 28),
    )

    response = await client.get("/api/v1/sla/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "overall_achievement_rate" in data
    assert "total_definitions" in data
    assert "active_definitions" in data
    assert "total_violations" in data
    assert "items" in data
    assert isinstance(data["items"], list)


# ---------------------------------------------------------------------------
# Report endpoint
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_sla_report_json(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test SLA report in JSON format."""
    defn = await _create_sla_definition(db_session, name="Report Test SLA")
    await _create_sla_measurement(
        db_session,
        sla_id=defn.id,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
    )

    response = await client.get(
        "/api/v1/sla/report?month=3&year=2026", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "month" in data
    assert "year" in data
    assert "total" in data
    assert "rows" in data


@pytest.mark.asyncio
async def test_sla_report_csv(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test SLA report in CSV format."""
    defn = await _create_sla_definition(db_session, name="CSV Report SLA")
    await _create_sla_measurement(
        db_session,
        sla_id=defn.id,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
    )

    response = await client.get(
        "/api/v1/sla/report?month=3&year=2026&format=csv", headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    content = response.text
    assert "SLA Name" in content  # CSV header
