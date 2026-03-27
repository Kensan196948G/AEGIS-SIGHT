import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_departments_unauthorized(client: AsyncClient):
    """Test that listing departments requires authentication."""
    response = await client.get("/api/v1/departments")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_departments_empty(client: AsyncClient, auth_headers: dict):
    """Test listing departments when none exist."""
    response = await client.get("/api/v1/departments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_create_department(client: AsyncClient, auth_headers: dict):
    """Test creating a new department."""
    payload = {
        "name": "Engineering",
        "code": "ENG",
        "manager_name": "Tanaka Taro",
        "budget_yearly": "50000000.00",
    }
    response = await client.post(
        "/api/v1/departments", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Engineering"
    assert data["code"] == "ENG"
    assert data["manager_name"] == "Tanaka Taro"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_department_duplicate_code(client: AsyncClient, auth_headers: dict):
    """Test that duplicate department codes are rejected."""
    payload = {
        "name": "Sales Division",
        "code": "SALES-DUP",
    }
    await client.post("/api/v1/departments", json=payload, headers=auth_headers)
    response = await client.post(
        "/api/v1/departments", json=payload, headers=auth_headers
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_department(client: AsyncClient, auth_headers: dict):
    """Test retrieving a specific department."""
    # Create first
    create_response = await client.post(
        "/api/v1/departments",
        json={"name": "HR Department", "code": "HR-GET"},
        headers=auth_headers,
    )
    dept_id = create_response.json()["id"]

    # Get
    response = await client.get(
        f"/api/v1/departments/{dept_id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["code"] == "HR-GET"


@pytest.mark.asyncio
async def test_get_department_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent department returns 404."""
    response = await client.get(
        "/api/v1/departments/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_department(client: AsyncClient, auth_headers: dict):
    """Test updating a department."""
    create_response = await client.post(
        "/api/v1/departments",
        json={"name": "Finance", "code": "FIN-UPD"},
        headers=auth_headers,
    )
    dept_id = create_response.json()["id"]

    response = await client.patch(
        f"/api/v1/departments/{dept_id}",
        json={"manager_name": "Suzuki Hanako"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["manager_name"] == "Suzuki Hanako"


@pytest.mark.asyncio
async def test_list_departments_tree(client: AsyncClient, auth_headers: dict):
    """Test retrieving departments as a tree structure."""
    # Create parent
    parent_resp = await client.post(
        "/api/v1/departments",
        json={"name": "Corporate", "code": "CORP-TREE"},
        headers=auth_headers,
    )
    parent_id = parent_resp.json()["id"]

    # Create child
    await client.post(
        "/api/v1/departments",
        json={"name": "IT Division", "code": "IT-TREE", "parent_id": parent_id},
        headers=auth_headers,
    )

    response = await client.get(
        "/api/v1/departments?tree=true", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_department_devices(client: AsyncClient, auth_headers: dict):
    """Test listing devices for a department."""
    create_response = await client.post(
        "/api/v1/departments",
        json={"name": "Dev Team", "code": "DEV-DEVS"},
        headers=auth_headers,
    )
    dept_id = create_response.json()["id"]

    response = await client.get(
        f"/api/v1/departments/{dept_id}/devices", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_department_costs(client: AsyncClient, auth_headers: dict):
    """Test department cost aggregation."""
    create_response = await client.post(
        "/api/v1/departments",
        json={"name": "Marketing", "code": "MKT-COST", "budget_yearly": "10000000"},
        headers=auth_headers,
    )
    dept_id = create_response.json()["id"]

    response = await client.get(
        f"/api/v1/departments/{dept_id}/costs", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["department_name"] == "Marketing"
    assert "device_count" in data
    assert "total_cost" in data
