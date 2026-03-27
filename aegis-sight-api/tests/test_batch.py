import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_import_devices_unauthorized(client: AsyncClient):
    """Test that device import requires authentication."""
    response = await client.post("/api/v1/batch/import/devices")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_import_devices_csv(client: AsyncClient, auth_headers: dict):
    """Test importing devices from a CSV file."""
    csv_content = "hostname,os_version,ip_address,domain,status\n"
    csv_content += "BATCH-PC-001,Windows 11,10.0.1.1,test.local,active\n"
    csv_content += "BATCH-PC-002,Windows 10,10.0.1.2,test.local,active\n"

    response = await client.post(
        "/api/v1/batch/import/devices",
        files={"file": ("devices.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["success_count"] == 2
    assert data["error_count"] == 0
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_import_devices_invalid_file(client: AsyncClient, auth_headers: dict):
    """Test that non-CSV files are rejected."""
    response = await client.post(
        "/api/v1/batch/import/devices",
        files={"file": ("data.txt", io.BytesIO(b"not csv"), "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_import_devices_duplicate_hostname(client: AsyncClient, auth_headers: dict):
    """Test that duplicate hostnames are reported as errors."""
    csv_content = "hostname,os_version\nBATCH-DUP-001,Windows 11\n"

    # First import
    await client.post(
        "/api/v1/batch/import/devices",
        files={"file": ("d1.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )

    # Second import (duplicate)
    response = await client.post(
        "/api/v1/batch/import/devices",
        files={"file": ("d2.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )
    data = response.json()
    assert data["error_count"] >= 1


@pytest.mark.asyncio
async def test_import_licenses_csv(client: AsyncClient, auth_headers: dict):
    """Test importing licenses from a CSV file."""
    csv_content = (
        "software_name,vendor,license_type,purchased_count,cost_per_unit\n"
        "TestSoft Pro,TestVendor,subscription,100,5000\n"
        "TestDB Enterprise,DBVendor,perpetual,10,200000\n"
    )

    response = await client.post(
        "/api/v1/batch/import/licenses",
        files={"file": ("licenses.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["success_count"] == 2


@pytest.mark.asyncio
async def test_import_licenses_invalid_type(client: AsyncClient, auth_headers: dict):
    """Test that invalid license types are reported as errors."""
    csv_content = (
        "software_name,vendor,license_type\n"
        "BadSoft,BadVendor,invalid_type\n"
    )

    response = await client.post(
        "/api/v1/batch/import/licenses",
        files={"file": ("lic.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )
    data = response.json()
    assert data["error_count"] >= 1


@pytest.mark.asyncio
async def test_export_devices_csv(client: AsyncClient, auth_headers: dict):
    """Test exporting devices as CSV."""
    response = await client.get(
        "/api/v1/batch/export/devices", headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_licenses_csv(client: AsyncClient, auth_headers: dict):
    """Test exporting licenses as CSV."""
    response = await client.get(
        "/api/v1/batch/export/licenses", headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_list_batch_jobs(client: AsyncClient, auth_headers: dict):
    """Test listing batch job history."""
    response = await client.get(
        "/api/v1/batch/jobs", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert "total" in data
    assert isinstance(data["jobs"], list)


@pytest.mark.asyncio
async def test_import_empty_csv(client: AsyncClient, auth_headers: dict):
    """Test that empty CSV files are rejected."""
    csv_content = "hostname,os_version\n"

    response = await client.post(
        "/api/v1/batch/import/devices",
        files={"file": ("empty.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400
