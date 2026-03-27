import uuid

import pytest
from httpx import AsyncClient


# ---- Authentication ----


@pytest.mark.asyncio
async def test_list_licenses_unauthorized(client: AsyncClient):
    """Test that listing licenses requires authentication."""
    response = await client.get("/api/v1/sam/licenses")
    assert response.status_code == 401


# ---- License CRUD ----


@pytest.mark.asyncio
async def test_list_licenses(client: AsyncClient, auth_headers: dict):
    """Test listing licenses with authentication."""
    response = await client.get("/api/v1/sam/licenses", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "offset" in data
    assert "limit" in data
    assert "has_more" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_licenses_pagination(client: AsyncClient, auth_headers: dict):
    """Test listing licenses with custom pagination."""
    response = await client.get(
        "/api/v1/sam/licenses?skip=0&limit=5", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["items"], list)
    assert len(data["items"]) <= 5
    assert data["limit"] == 5


@pytest.mark.asyncio
async def test_create_license(client: AsyncClient, auth_headers: dict):
    """Test creating a new software license."""
    payload = {
        "software_name": "Microsoft Office 365",
        "vendor": "Microsoft",
        "license_type": "subscription",
        "purchased_count": 100,
        "installed_count": 85,
        "m365_assigned": 90,
        "cost_per_unit": "1500.00",
        "currency": "JPY",
    }
    response = await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["software_name"] == "Microsoft Office 365"
    assert data["purchased_count"] == 100
    assert data["installed_count"] == 85
    assert data["m365_assigned"] == 90


@pytest.mark.asyncio
async def test_create_license_with_expiry(client: AsyncClient, auth_headers: dict):
    """Test creating a license with expiry date."""
    payload = {
        "software_name": "Adobe Acrobat Pro",
        "vendor": "Adobe",
        "license_type": "subscription",
        "purchased_count": 50,
        "installed_count": 30,
        "expiry_date": "2027-03-31",
        "cost_per_unit": "23000.00",
        "currency": "JPY",
    }
    response = await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["expiry_date"] == "2027-03-31"


@pytest.mark.asyncio
async def test_get_license_by_id(client: AsyncClient, auth_headers: dict):
    """Test getting a specific license by ID."""
    # Create first
    payload = {
        "software_name": "Slack Enterprise",
        "vendor": "Salesforce",
        "license_type": "subscription",
        "purchased_count": 200,
    }
    create_resp = await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )
    license_id = create_resp.json()["id"]

    # Get by ID
    response = await client.get(
        f"/api/v1/sam/licenses/{license_id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["software_name"] == "Slack Enterprise"


@pytest.mark.asyncio
async def test_get_license_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent license returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/sam/licenses/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_license(client: AsyncClient, auth_headers: dict):
    """Test updating a license record."""
    # Create
    payload = {
        "software_name": "Zoom Business",
        "vendor": "Zoom",
        "license_type": "subscription",
        "purchased_count": 100,
        "installed_count": 80,
    }
    create_resp = await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )
    license_id = create_resp.json()["id"]

    # Update
    update_payload = {"installed_count": 95}
    response = await client.patch(
        f"/api/v1/sam/licenses/{license_id}",
        json=update_payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["installed_count"] == 95


# ---- Compliance: over-deployment detection ----


@pytest.mark.asyncio
async def test_compliance_check(client: AsyncClient, auth_headers: dict):
    """Test running a compliance check."""
    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_compliance(client: AsyncClient, auth_headers: dict):
    """Test getting compliance status."""
    response = await client.get(
        "/api/v1/sam/compliance", headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_compliance_detects_over_deployment(
    client: AsyncClient, auth_headers: dict
):
    """Test that compliance check detects license over-deployment."""
    # Create a license that is over-deployed
    payload = {
        "software_name": "OverDeployed App",
        "vendor": "TestVendor",
        "license_type": "subscription",
        "purchased_count": 10,
        "installed_count": 15,
        "m365_assigned": 5,
    }
    await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )

    # Run compliance check
    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    assert response.status_code == 200
    checks = response.json()

    # Find our over-deployed license
    over_deployed = [
        c for c in checks if c["software_name"] == "OverDeployed App"
    ]
    assert len(over_deployed) == 1
    check = over_deployed[0]
    assert check["is_compliant"] is False
    assert check["total_used"] == 20  # 15 installed + 5 m365
    assert check["over_deployed"] == 10  # 20 used - 10 purchased


@pytest.mark.asyncio
async def test_compliance_compliant_license(
    client: AsyncClient, auth_headers: dict
):
    """Test that compliance check marks properly licensed software as compliant."""
    payload = {
        "software_name": "CompliantApp",
        "vendor": "GoodVendor",
        "license_type": "perpetual",
        "purchased_count": 100,
        "installed_count": 50,
        "m365_assigned": 0,
    }
    await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )

    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    checks = response.json()
    compliant = [c for c in checks if c["software_name"] == "CompliantApp"]
    assert len(compliant) == 1
    assert compliant[0]["is_compliant"] is True
    assert compliant[0]["over_deployed"] == 0


# ---- M365 sync ----


@pytest.mark.asyncio
async def test_compliance_includes_m365_in_total(
    client: AsyncClient, auth_headers: dict
):
    """Test that M365 assigned licenses are included in total usage count."""
    payload = {
        "software_name": "M365 Test License",
        "vendor": "Microsoft",
        "license_type": "subscription",
        "purchased_count": 100,
        "installed_count": 40,
        "m365_assigned": 50,
    }
    await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )

    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    checks = response.json()
    m365_check = [c for c in checks if c["software_name"] == "M365 Test License"]
    assert len(m365_check) == 1
    assert m365_check[0]["total_used"] == 90  # 40 + 50
    assert m365_check[0]["is_compliant"] is True


@pytest.mark.asyncio
async def test_compliance_m365_causes_over_deployment(
    client: AsyncClient, auth_headers: dict
):
    """Test that M365 assignments can push a license into over-deployment."""
    payload = {
        "software_name": "M365 OverDeploy",
        "vendor": "Microsoft",
        "license_type": "subscription",
        "purchased_count": 50,
        "installed_count": 30,
        "m365_assigned": 25,  # 30 + 25 = 55 > 50
    }
    await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )

    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    checks = response.json()
    m365_over = [c for c in checks if c["software_name"] == "M365 OverDeploy"]
    assert len(m365_over) == 1
    assert m365_over[0]["is_compliant"] is False
    assert m365_over[0]["over_deployed"] == 5
