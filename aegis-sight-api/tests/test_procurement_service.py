"""Unit tests for ProcurementService.

Covers:
  - Full lifecycle: draft -> submitted -> approved -> ordered -> received
  - Invalid state transition guards
  - Disposal flow
  - Request number generation
"""

from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.procurement import ProcurementCategory, ProcurementRequest, ProcurementStatus
from app.models.user import User
from app.schemas.procurement import ProcurementCreate
from app.services.procurement_service import ProcurementService
from tests.factories import ProcurementFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_create_data(**kwargs) -> ProcurementCreate:
    defaults = {
        "item_name": "Dell Latitude 5550",
        "category": ProcurementCategory.hardware,
        "quantity": 2,
        "unit_price": Decimal("150000"),
        "department": "IT",
        "purpose": "Laptop replacement",
    }
    defaults.update(kwargs)
    return ProcurementCreate(**defaults)


async def _create_user_in_db(db: AsyncSession) -> User:
    user = UserFactory()
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Tests: Creation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_create_request(db_session: AsyncSession):
    """Creating a procurement request sets status=draft and computes total_price."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)
    data = _make_create_data(quantity=3, unit_price=Decimal("100000"))

    proc = await svc.create_request(data, user)

    assert proc.status == ProcurementStatus.draft
    assert proc.total_price == Decimal("300000")
    assert proc.requester_id == user.id
    assert proc.request_number.startswith("PRQ-")


@pytest.mark.asyncio
async def test_create_generates_unique_numbers(db_session: AsyncSession):
    """Each request gets a unique request_number."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc1 = await svc.create_request(_make_create_data(), user)
    proc2 = await svc.create_request(_make_create_data(), user)

    assert proc1.request_number != proc2.request_number


# ---------------------------------------------------------------------------
# Tests: State transitions (happy path)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_submit_from_draft(db_session: AsyncSession):
    """A draft request can be submitted."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)
    proc = await svc.create_request(_make_create_data(), user)

    submitted = await svc.submit(proc.id)
    assert submitted.status == ProcurementStatus.submitted


@pytest.mark.asyncio
async def test_approve_from_submitted(db_session: AsyncSession):
    """A submitted request can be approved."""
    user = await _create_user_in_db(db_session)
    approver = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    await svc.submit(proc.id)
    approved = await svc.approve(proc.id, approver)

    assert approved.status == ProcurementStatus.approved
    assert approved.approver_id == approver.id
    assert approved.approved_at is not None


@pytest.mark.asyncio
async def test_mark_as_ordered(db_session: AsyncSession):
    """An approved request can be marked as ordered."""
    user = await _create_user_in_db(db_session)
    approver = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    await svc.submit(proc.id)
    await svc.approve(proc.id, approver)
    ordered = await svc.mark_as_ordered(proc.id)

    assert ordered.status == ProcurementStatus.ordered
    assert ordered.ordered_at is not None


@pytest.mark.asyncio
async def test_mark_as_received(db_session: AsyncSession):
    """An ordered request can be marked as received."""
    user = await _create_user_in_db(db_session)
    approver = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    await svc.submit(proc.id)
    await svc.approve(proc.id, approver)
    await svc.mark_as_ordered(proc.id)
    received = await svc.mark_as_received(proc.id)

    assert received.status == ProcurementStatus.received
    assert received.received_at is not None


@pytest.mark.asyncio
async def test_full_lifecycle(db_session: AsyncSession):
    """Entire lifecycle from draft through received completes without error."""
    user = await _create_user_in_db(db_session)
    approver = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    assert proc.status == ProcurementStatus.draft

    await svc.submit(proc.id)
    await svc.approve(proc.id, approver)
    await svc.mark_as_ordered(proc.id)
    received = await svc.mark_as_received(proc.id)
    assert received.status == ProcurementStatus.received


# ---------------------------------------------------------------------------
# Tests: Invalid state transition guards
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cannot_submit_from_approved(db_session: AsyncSession):
    """Submitting an already-approved request raises 400."""
    user = await _create_user_in_db(db_session)
    approver = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    await svc.submit(proc.id)
    await svc.approve(proc.id, approver)

    with pytest.raises(HTTPException) as exc_info:
        await svc.submit(proc.id)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_cannot_approve_draft(db_session: AsyncSession):
    """Approving a draft (not submitted) raises 400."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)

    with pytest.raises(HTTPException) as exc_info:
        await svc.approve(proc.id, user)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_cannot_order_draft(db_session: AsyncSession):
    """Marking a draft as ordered raises 400."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)

    with pytest.raises(HTTPException) as exc_info:
        await svc.mark_as_ordered(proc.id)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_cannot_receive_submitted(db_session: AsyncSession):
    """Marking a submitted request as received raises 400."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)
    await svc.submit(proc.id)

    with pytest.raises(HTTPException) as exc_info:
        await svc.mark_as_received(proc.id)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_cannot_dispose_draft(db_session: AsyncSession):
    """Disposing a draft request raises 400 (only active/disposal_requested allowed)."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    proc = await svc.create_request(_make_create_data(), user)

    with pytest.raises(HTTPException) as exc_info:
        await svc.dispose(proc.id)
    assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Tests: Disposal
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dispose_from_active(db_session: AsyncSession):
    """An active procurement can be disposed."""
    user = await _create_user_in_db(db_session)
    svc = ProcurementService(db_session)

    # Manually create a procurement in 'active' status
    proc_obj = ProcurementFactory(
        requester_id=user.id, status=ProcurementStatus.active
    )
    db_session.add(proc_obj)
    await db_session.flush()
    await db_session.refresh(proc_obj)

    disposed = await svc.dispose(proc_obj.id, disposal_cert="CERT-001")
    assert disposed.status == ProcurementStatus.disposed
    assert disposed.disposal_at is not None
    assert disposed.disposal_cert == "CERT-001"


# ---------------------------------------------------------------------------
# Tests: Not found
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_nonexistent_procurement(db_session: AsyncSession):
    """Accessing a non-existent procurement raises 404."""
    svc = ProcurementService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        await svc.submit(uuid.uuid4())
    assert exc_info.value.status_code == 404
