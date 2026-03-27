from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.auth import router as auth_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.procurement import router as procurement_router
from app.api.v1.sam import router as sam_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(assets_router)
api_router.include_router(sam_router)
api_router.include_router(procurement_router)
api_router.include_router(metrics_router)
