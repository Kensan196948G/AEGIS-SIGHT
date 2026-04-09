"""
Device policy engine API.

Endpoints for managing device policies (USB control, software restriction,
patch requirement, security baseline), tracking violations, and evaluating
compliance.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.device import Device
from app.models.policy import DevicePolicy, PolicyType, PolicyViolation
from app.models.user import User
from app.schemas.policy import (
    DevicePolicyCreate,
    DevicePolicyResponse,
    DevicePolicyUpdate,
    PolicyComplianceSummary,
    PolicyEvaluateRequest,
    PolicyEvaluateResponse,
    PolicyViolationResponse,
)

router = APIRouter(prefix="/policies", tags=["policies"])


# ---------------------------------------------------------------------------
# Policy list & create  (static paths first)
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=PaginatedResponse[DevicePolicyResponse],
    summary="List policies",
    description="Retrieve a paginated list of device policies.",
)
async def list_policies(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    policy_type: PolicyType | None = Query(None),
    is_enabled: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all device policies."""
    base_query = select(DevicePolicy)
    count_query = select(func.count(DevicePolicy.id))

    if policy_type is not None:
        base_query = base_query.where(DevicePolicy.policy_type == policy_type)
        count_query = count_query.where(DevicePolicy.policy_type == policy_type)

    if is_enabled is not None:
        base_query = base_query.where(DevicePolicy.is_enabled == is_enabled)
        count_query = count_query.where(DevicePolicy.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(
            DevicePolicy.priority.desc(), DevicePolicy.created_at.desc()
        )
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=DevicePolicyResponse,
    status_code=201,
    summary="Create policy",
    description="Create a new device policy.",
)
async def create_policy(
    data: DevicePolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new device policy."""
    dump = data.model_dump()
    # Serialize UUID list for JSONB storage
    if dump.get("target_groups"):
        dump["target_groups"] = [str(g) for g in dump["target_groups"]]
    dump["created_by"] = current_user.id

    policy = DevicePolicy(**dump)
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# Static sub-paths (must be registered BEFORE /{policy_id})
# ---------------------------------------------------------------------------

@router.get(
    "/violations",
    response_model=PaginatedResponse[PolicyViolationResponse],
    summary="All violations",
    description="List all policy violations with optional filters.",
)
async def list_all_violations(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    policy_id: uuid.UUID | None = Query(None),
    device_id: uuid.UUID | None = Query(None),
    is_resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all violations across all policies."""
    base_query = select(PolicyViolation)
    count_query = select(func.count(PolicyViolation.id))

    if policy_id is not None:
        base_query = base_query.where(PolicyViolation.policy_id == policy_id)
        count_query = count_query.where(PolicyViolation.policy_id == policy_id)

    if device_id is not None:
        base_query = base_query.where(PolicyViolation.device_id == device_id)
        count_query = count_query.where(PolicyViolation.device_id == device_id)

    if is_resolved is not None:
        base_query = base_query.where(PolicyViolation.is_resolved == is_resolved)
        count_query = count_query.where(PolicyViolation.is_resolved == is_resolved)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(
            PolicyViolation.detected_at.desc()
        )
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/evaluate",
    response_model=PolicyEvaluateResponse,
    summary="Evaluate policies",
    description=(
        "Trigger manual policy evaluation. Checks enabled policies against "
        "devices and creates violation records for non-compliant devices."
    ),
)
async def evaluate_policies(
    body: PolicyEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Manually trigger policy evaluation.

    This is a simplified evaluation stub. In production, each policy_type
    would have its own evaluation logic (USB audit, software inventory
    comparison, patch status check, security baseline scan).
    """
    # Determine policies to evaluate
    policy_query = select(DevicePolicy).where(DevicePolicy.is_enabled .is_(True))
    if body.policy_ids:
        policy_query = policy_query.where(DevicePolicy.id.in_(body.policy_ids))

    policy_result = await db.execute(policy_query)
    policies = policy_result.scalars().all()

    # Determine devices to evaluate
    device_query = select(Device)
    if body.device_ids:
        device_query = device_query.where(Device.id.in_(body.device_ids))

    device_result = await db.execute(device_query)
    devices = device_result.scalars().all()

    new_violations = 0

    for policy in policies:
        target_device_ids = None
        if policy.target_groups:
            # In a full implementation, resolve group memberships here
            pass

        for device in devices:
            if target_device_ids is not None and str(device.id) not in target_device_ids:
                continue

            # Check if an unresolved violation already exists
            existing = await db.execute(
                select(PolicyViolation).where(
                    PolicyViolation.policy_id == policy.id,
                    PolicyViolation.device_id == device.id,
                    PolicyViolation.is_resolved .is_(False),
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            # Stub: evaluate policy rules against device
            # In production, this would inspect USB events, installed software,
            # patch status, or security configuration depending on policy_type.
            # For now, we skip actual evaluation logic -- no violations created
            # unless a real engine is plugged in.

    return PolicyEvaluateResponse(
        evaluated_policies=len(policies),
        evaluated_devices=len(devices),
        new_violations=new_violations,
    )


@router.get(
    "/compliance",
    response_model=PolicyComplianceSummary,
    summary="Compliance summary",
    description="Aggregated policy compliance rate and violation breakdown.",
)
async def compliance_summary(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get policy compliance summary."""
    # Total & enabled policies
    total_policies_result = await db.execute(select(func.count(DevicePolicy.id)))
    total_policies = total_policies_result.scalar_one()

    enabled_result = await db.execute(
        select(func.count(DevicePolicy.id)).where(
            DevicePolicy.is_enabled.is_(True)
        )
    )
    enabled_policies = enabled_result.scalar_one()

    # Total & unresolved violations
    total_violations_result = await db.execute(
        select(func.count(PolicyViolation.id))
    )
    total_violations = total_violations_result.scalar_one()

    unresolved_result = await db.execute(
        select(func.count(PolicyViolation.id)).where(
            PolicyViolation.is_resolved.is_(False)
        )
    )
    unresolved_violations = unresolved_result.scalar_one()

    # Compliance rate: (total_violations == 0) -> 100%, else based on resolved ratio
    if total_violations == 0:
        compliance_rate = 100.0
    else:
        resolved = total_violations - unresolved_violations
        compliance_rate = round((resolved / total_violations) * 100, 1)

    # Unresolved by policy type
    by_type_result = await db.execute(
        select(
            DevicePolicy.policy_type,
            func.count(PolicyViolation.id),
        )
        .join(DevicePolicy, PolicyViolation.policy_id == DevicePolicy.id)
        .where(PolicyViolation.is_resolved.is_(False))
        .group_by(DevicePolicy.policy_type)
    )
    by_type = {row[0].value: row[1] for row in by_type_result.all()}

    return PolicyComplianceSummary(
        total_policies=total_policies,
        enabled_policies=enabled_policies,
        total_violations=total_violations,
        unresolved_violations=unresolved_violations,
        compliance_rate=compliance_rate,
        by_type=by_type,
    )


# ---------------------------------------------------------------------------
# Dynamic paths: /{policy_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{policy_id}",
    response_model=DevicePolicyResponse,
    summary="Get policy",
    description="Retrieve a single device policy by ID.",
)
async def get_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific policy."""
    result = await db.execute(
        select(DevicePolicy).where(DevicePolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        raise NotFoundError("Policy", str(policy_id))
    return policy


@router.patch(
    "/{policy_id}",
    response_model=DevicePolicyResponse,
    summary="Update policy",
    description="Partially update an existing device policy.",
)
async def update_policy(
    policy_id: uuid.UUID,
    data: DevicePolicyUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update a policy."""
    result = await db.execute(
        select(DevicePolicy).where(DevicePolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        raise NotFoundError("Policy", str(policy_id))

    update_data = data.model_dump(exclude_unset=True)
    if "target_groups" in update_data and update_data["target_groups"] is not None:
        update_data["target_groups"] = [str(g) for g in update_data["target_groups"]]

    for field, value in update_data.items():
        setattr(policy, field, value)

    policy.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(policy)
    return policy


@router.delete(
    "/{policy_id}",
    status_code=204,
    summary="Delete policy",
    description="Delete a device policy and its violations.",
)
async def delete_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Delete a policy."""
    result = await db.execute(
        select(DevicePolicy).where(DevicePolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        raise NotFoundError("Policy", str(policy_id))

    await db.delete(policy)
    await db.flush()


@router.get(
    "/{policy_id}/violations",
    response_model=PaginatedResponse[PolicyViolationResponse],
    summary="Policy violations",
    description="List violations for a specific policy.",
)
async def list_policy_violations(
    policy_id: uuid.UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List violations for a specific policy."""
    # Verify policy exists
    policy_result = await db.execute(
        select(DevicePolicy).where(DevicePolicy.id == policy_id)
    )
    if policy_result.scalar_one_or_none() is None:
        raise NotFoundError("Policy", str(policy_id))

    base_query = select(PolicyViolation).where(
        PolicyViolation.policy_id == policy_id
    )
    count_query = select(func.count(PolicyViolation.id)).where(
        PolicyViolation.policy_id == policy_id
    )

    if is_resolved is not None:
        base_query = base_query.where(PolicyViolation.is_resolved == is_resolved)
        count_query = count_query.where(PolicyViolation.is_resolved == is_resolved)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(
            PolicyViolation.detected_at.desc()
        )
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)
