from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.logs import router as logs_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.procurement import router as procurement_router
from app.api.v1.sam import router as sam_router
from app.api.v1.security import router as security_router
from app.api.v1.software import router as software_router
from app.api.v1.reports import router as reports_router
from app.api.v1.telemetry import router as telemetry_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(assets_router)
api_router.include_router(audit_router)
api_router.include_router(sam_router)
api_router.include_router(procurement_router)
api_router.include_router(metrics_router)
api_router.include_router(telemetry_router)
api_router.include_router(dashboard_router)
api_router.include_router(security_router)
api_router.include_router(logs_router)
api_router.include_router(reports_router)
api_router.include_router(software_router)
