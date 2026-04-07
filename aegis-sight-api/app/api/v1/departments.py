import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import create_paginated_response
from app.models.department import Department
from app.models.device import Device
from app.models.user import User
from app.schemas.department import (
    DepartmentCostResponse,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)

router = APIRouter(prefix="/departments", tags=["departments"])


def _build_tree(departments: list[Department], parent_id: uuid.UUID | None = None) -> list[dict]:
    """Recursively build a department tree structure."""
    tree = []
    for dept in departments:
        if dept.parent_id == parent_id:
            node = {
                "id": dept.id,
                "name": dept.name,
                "code": dept.code,
                "parent_id": dept.parent_id,
                "manager_name": dept.manager_name,
                "budget_yearly": dept.budget_yearly,
                "description": dept.description,
                "created_at": dept.created_at,
                "updated_at": dept.updated_at,
                "children": _build_tree(departments, dept.id),
                "device_count": 0,
            }
            tree.append(node)
    return tree


@router.get(
    "",
    summary="List departments",
    description="Retrieve all departments. Use tree=true for hierarchical structure.",
)
async def list_departments(
    tree: bool = Query(False, description="Return as tree structure"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all departments, optionally as a tree."""
    if tree:
        result = await db.execute(select(Department))
        departments = list(result.scalars().all())
        return _build_tree(departments)

    count_result = await db.execute(select(func.count(Department.id)))
    total = count_result.scalar_one()

    result = await db.execute(
        select(Department)
        .offset(offset)
        .limit(limit)
        .order_by(Department.name)
    )
    items = result.scalars().all()
    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Get department",
    description="Retrieve a specific department by UUID.",
    responses={404: {"description": "Department not found"}},
)
async def get_department(
    department_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific department by ID."""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    dept = result.scalar_one_or_none()
    if dept is None:
        raise NotFoundError("Department", str(department_id))
    return dept


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=201,
    summary="Create department",
    description="Create a new department. Code must be unique.",
    responses={409: {"description": "Department with this code already exists"}},
)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new department."""
    # Check unique code
    result = await db.execute(
        select(Department).where(Department.code == data.code)
    )
    if result.scalar_one_or_none() is not None:
        raise ConflictError(f"Department with code '{data.code}' already exists")

    # Validate parent exists if specified
    if data.parent_id is not None:
        parent_result = await db.execute(
            select(Department).where(Department.id == data.parent_id)
        )
        if parent_result.scalar_one_or_none() is None:
            raise NotFoundError("Parent department", str(data.parent_id))

    dept = Department(**data.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Update department",
    description="Partially update a department.",
    responses={404: {"description": "Department not found"}},
)
async def update_department(
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update a department."""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    dept = result.scalar_one_or_none()
    if dept is None:
        raise NotFoundError("Department", str(department_id))

    update_data = data.model_dump(exclude_unset=True)

    # Validate unique code if changing
    if "code" in update_data and update_data["code"] != dept.code:
        existing = await db.execute(
            select(Department).where(Department.code == update_data["code"])
        )
        if existing.scalar_one_or_none() is not None:
            raise ConflictError(
                f"Department with code '{update_data['code']}' already exists"
            )

    for field, value in update_data.items():
        setattr(dept, field, value)

    await db.flush()
    await db.refresh(dept)
    return dept


@router.get(
    "/{department_id}/devices",
    summary="List devices in department",
    description="Retrieve devices belonging to a specific department.",
    responses={404: {"description": "Department not found"}},
)
async def list_department_devices(
    department_id: uuid.UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List devices belonging to a department."""
    # Verify department exists
    dept_result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    if dept_result.scalar_one_or_none() is None:
        raise NotFoundError("Department", str(department_id))

    # Query devices with domain matching department code
    dept = (
        await db.execute(
            select(Department).where(Department.id == department_id)
        )
    ).scalar_one()

    count_query = select(func.count(Device.id)).where(
        Device.domain == dept.code
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    result = await db.execute(
        select(Device)
        .where(Device.domain == dept.code)
        .offset(offset)
        .limit(limit)
        .order_by(Device.hostname)
    )
    items = result.scalars().all()
    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/{department_id}/costs",
    response_model=DepartmentCostResponse,
    summary="Department cost summary",
    description="Retrieve cost aggregation for a specific department.",
    responses={404: {"description": "Department not found"}},
)
async def get_department_costs(
    department_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get cost aggregation for a department."""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    dept = result.scalar_one_or_none()
    if dept is None:
        raise NotFoundError("Department", str(department_id))

    # Count devices associated with this department
    device_count_result = await db.execute(
        select(func.count(Device.id)).where(Device.domain == dept.code)
    )
    device_count = device_count_result.scalar_one()

    from decimal import Decimal

    from app.models.procurement import ProcurementRequest

    # Sum procurement costs for this department
    proc_result = await db.execute(
        select(func.coalesce(func.sum(ProcurementRequest.total_price), 0)).where(
            ProcurementRequest.department == dept.name
        )
    )
    procurement_total = Decimal(str(proc_result.scalar_one()))

    total_cost = procurement_total

    return DepartmentCostResponse(
        department_id=dept.id,
        department_name=dept.name,
        department_code=dept.code,
        budget_yearly=dept.budget_yearly,
        device_count=device_count,
        license_cost_total=Decimal("0"),
        procurement_cost_total=procurement_total,
        total_cost=total_cost,
    )
