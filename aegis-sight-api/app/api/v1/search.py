from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError
from app.models.alert import Alert
from app.models.device import Device
from app.models.license import SoftwareLicense
from app.models.procurement import ProcurementRequest
from app.models.user import User
from app.schemas.search import SearchResponse, SearchResultGroup, SearchResultItem

router = APIRouter(prefix="/search", tags=["search"])


async def _search_devices(db: AsyncSession, q: str, offset: int, limit: int):
    """Search devices by hostname, ip_address, domain."""
    pattern = f"%{q}%"
    base = select(Device).where(
        or_(
            Device.hostname.ilike(pattern),
            cast(Device.ip_address, String).ilike(pattern),
            Device.domain.ilike(pattern),
        )
    )
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(base.offset(offset).limit(limit).order_by(Device.hostname))
    devices = result.scalars().all()

    items = []
    for d in devices:
        # Determine which field matched
        matched_field = "hostname"
        matched_value = d.hostname
        if q.lower() in (d.ip_address or "").lower():
            matched_field = "ip_address"
            matched_value = str(d.ip_address) if d.ip_address else ""
        elif q.lower() in (d.domain or "").lower():
            matched_field = "domain"
            matched_value = d.domain or ""

        items.append(
            SearchResultItem(
                id=d.id,
                type="device",
                title=d.hostname,
                subtitle=f"{d.os_version or ''} - {d.ip_address or ''}",
                matched_field=matched_field,
                matched_value=matched_value,
                created_at=d.created_at,
            )
        )
    return total, items


async def _search_licenses(db: AsyncSession, q: str, offset: int, limit: int):
    """Search licenses by software_name, vendor."""
    pattern = f"%{q}%"
    base = select(SoftwareLicense).where(
        or_(
            SoftwareLicense.software_name.ilike(pattern),
            SoftwareLicense.vendor.ilike(pattern),
        )
    )
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        base.offset(offset).limit(limit).order_by(SoftwareLicense.software_name)
    )
    licenses = result.scalars().all()

    items = []
    for lic in licenses:
        matched_field = "software_name"
        matched_value = lic.software_name
        if q.lower() in lic.vendor.lower():
            matched_field = "vendor"
            matched_value = lic.vendor

        items.append(
            SearchResultItem(
                id=lic.id,
                type="license",
                title=lic.software_name,
                subtitle=f"{lic.vendor} - {lic.license_type.value}",
                matched_field=matched_field,
                matched_value=matched_value,
                created_at=lic.created_at,
            )
        )
    return total, items


async def _search_procurements(db: AsyncSession, q: str, offset: int, limit: int):
    """Search procurements by item_name, request_number."""
    pattern = f"%{q}%"
    base = select(ProcurementRequest).where(
        or_(
            ProcurementRequest.item_name.ilike(pattern),
            ProcurementRequest.request_number.ilike(pattern),
        )
    )
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        base.offset(offset).limit(limit).order_by(ProcurementRequest.created_at.desc())
    )
    procs = result.scalars().all()

    items = []
    for p in procs:
        matched_field = "item_name"
        matched_value = p.item_name
        if q.lower() in p.request_number.lower():
            matched_field = "request_number"
            matched_value = p.request_number

        items.append(
            SearchResultItem(
                id=p.id,
                type="procurement",
                title=p.item_name,
                subtitle=f"{p.request_number} - {p.status.value}",
                matched_field=matched_field,
                matched_value=matched_value,
                created_at=p.created_at,
            )
        )
    return total, items


async def _search_alerts(db: AsyncSession, q: str, offset: int, limit: int):
    """Search alerts by title, message."""
    pattern = f"%{q}%"
    base = select(Alert).where(
        or_(
            Alert.title.ilike(pattern),
            Alert.message.ilike(pattern),
        )
    )
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        base.offset(offset).limit(limit).order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()

    items = []
    for a in alerts:
        matched_field = "title"
        matched_value = a.title
        if q.lower() in a.message.lower():
            matched_field = "message"
            matched_value = a.message[:200]

        items.append(
            SearchResultItem(
                id=a.id,
                type="alert",
                title=a.title,
                subtitle=f"{a.severity.value} - {a.category.value}",
                matched_field=matched_field,
                matched_value=matched_value,
                created_at=a.created_at,
            )
        )
    return total, items


_SEARCH_FUNCTIONS = {
    "device": _search_devices,
    "license": _search_licenses,
    "procurement": _search_procurements,
    "alert": _search_alerts,
}


@router.get(
    "",
    response_model=SearchResponse,
    summary="Unified search",
    description=(
        "Search across devices, licenses, procurements, and alerts. "
        "Results are grouped by entity type."
    ),
)
async def unified_search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query string"),
    type: str = Query("all", description="Entity type filter: device/license/procurement/alert/all"),
    offset: int = Query(0, ge=0, description="Number of records to skip per type"),
    limit: int = Query(20, ge=1, le=100, description="Max records per type"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Perform a unified search across all entity types."""
    if type != "all" and type not in _SEARCH_FUNCTIONS:
        raise BadRequestError(
            f"Invalid type '{type}'. Must be one of: all, device, license, procurement, alert"
        )

    types_to_search = list(_SEARCH_FUNCTIONS.keys()) if type == "all" else [type]

    groups: list[SearchResultGroup] = []
    grand_total = 0

    for entity_type in types_to_search:
        search_fn = _SEARCH_FUNCTIONS[entity_type]
        total, items = await search_fn(db, q, offset, limit)
        grand_total += total
        if items:
            groups.append(
                SearchResultGroup(type=entity_type, count=total, items=items)
            )

    return SearchResponse(
        query=q,
        total=grand_total,
        groups=groups,
        offset=offset,
        limit=limit,
        has_more=any(g.count > offset + limit for g in groups),
    )
