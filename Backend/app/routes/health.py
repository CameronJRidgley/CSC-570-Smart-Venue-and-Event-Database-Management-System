"""Health and status endpoints.

Kept intentionally thin. No business logic lives here.
"""
from fastapi import APIRouter

from app.core.config import get_settings
from app.db.mongo import ping_mongo
from app.db.sql import ping_sql

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/")
async def root():
    return {"message": "The Python backend is ALIVE!"}


@router.get("/api/status")
async def get_status():
    return {
        "status": "Connected to FastAPI",
        "app": settings.app_name,
        "env": settings.app_env,
    }


@router.get("/api/health/db")
async def db_health():
    """Pings both Postgres and MongoDB. Used for liveness/readiness checks."""
    sql_ok = ping_sql()
    mongo_ok = await ping_mongo()
    return {
        "postgres": "up" if sql_ok else "down",
        "mongodb": "up" if mongo_ok else "down",
        "healthy": sql_ok and mongo_ok,
    }
