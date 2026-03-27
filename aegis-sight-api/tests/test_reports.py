"""Tests for report generation API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sam_report_unauthorized(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.get("/api/v1/reports/sam")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sam_report_forbidden_readonly(
    client: AsyncClient, readonly_headers: dict
):
    """Readonly users must not access SAM reports."""
    response = await client.get("/api/v1/reports/sam", headers=readonly_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_sam_report_auditor(
    client: AsyncClient, auditor_headers: dict
):
    """Auditors can generate SAM reports."""
    response = await client.get("/api/v1/reports/sam", headers=auditor_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    # Check CSV header row is present
    assert "software_name" in response.text


@pytest.mark.asyncio
async def test_sam_report_admin(
    client: AsyncClient, admin_headers: dict
):
    """Admins can generate SAM reports."""
    response = await client.get("/api/v1/reports/sam", headers=admin_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_asset_report_unauthorized(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.get("/api/v1/reports/assets")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_asset_report_forbidden_operator(
    client: AsyncClient, operator_headers: dict
):
    """Operators must not access asset reports."""
    response = await client.get("/api/v1/reports/assets", headers=operator_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_asset_report_auditor(
    client: AsyncClient, auditor_headers: dict
):
    """Auditors can generate asset reports."""
    response = await client.get("/api/v1/reports/assets", headers=auditor_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "hostname" in response.text


@pytest.mark.asyncio
async def test_security_report_unauthorized(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.get("/api/v1/reports/security")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_security_report_auditor(
    client: AsyncClient, auditor_headers: dict
):
    """Auditors can generate security reports."""
    response = await client.get("/api/v1/reports/security", headers=auditor_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "defender_on" in response.text


@pytest.mark.asyncio
async def test_security_report_admin(
    client: AsyncClient, admin_headers: dict
):
    """Admins can generate security reports."""
    response = await client.get("/api/v1/reports/security", headers=admin_headers)
    assert response.status_code == 200
