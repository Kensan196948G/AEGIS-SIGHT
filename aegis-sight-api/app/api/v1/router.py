from fastapi import APIRouter

from app.api.v1.alerts import router as alerts_router
from app.api.v1.assets import router as assets_router
from app.api.v1.batch import router as batch_router
from app.api.v1.config import router as config_router
from app.api.v1.departments import router as departments_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.logs import router as logs_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.network import router as network_router
from app.api.v1.procurement import router as procurement_router
from app.api.v1.sam import router as sam_router
from app.api.v1.security import router as security_router
from app.api.v1.software import router as software_router
from app.api.v1.reports import router as reports_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.users import router as users_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(alerts_router)
api_router.include_router(users_router)
api_router.include_router(assets_router)
api_router.include_router(audit_router)
api_router.include_router(config_router)
api_router.include_router(sam_router)
api_router.include_router(procurement_router)
api_router.include_router(metrics_router)
api_router.include_router(telemetry_router)
api_router.include_router(dashboard_router)
api_router.include_router(security_router)
api_router.include_router(logs_router)
api_router.include_router(reports_router)
api_router.include_router(software_router)
api_router.include_router(network_router)
api_router.include_router(departments_router)
api_router.include_router(batch_router)
