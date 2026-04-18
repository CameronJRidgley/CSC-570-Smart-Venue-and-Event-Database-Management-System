"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload

Responsibilities (keep thin):
    - configure logging
    - configure CORS
    - manage DB lifecycle (Mongo init/close)
    - register routers
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, logger
from app.core.middleware import RequestContextMiddleware
from app.db.mongo import close_mongo, init_mongo
from app.models.nosql import DOCUMENT_MODELS
from app.models.sql import *  # noqa: F401,F403  eagerly register SQLModel tables
from app.routes import (
    auth,
    checkin,
    crowd,
    events,
    health,
    incidents,
    reports,
    tickets,
    vendor_sales,
    vendors,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    logger.info("Starting %s (env=%s)", settings.app_name, settings.app_env)

    await init_mongo(document_models=DOCUMENT_MODELS)
    if not settings.skip_mongo_init:
        logger.info("MongoDB initialized")

    yield

    await close_mongo()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

# Middleware order: request-id outermost, CORS innermost (executes first).
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

register_exception_handlers(app)

# Routers
app.include_router(health.router)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(events.router, prefix=settings.api_v1_prefix)
app.include_router(tickets.router, prefix=settings.api_v1_prefix)
app.include_router(checkin.router, prefix=settings.api_v1_prefix)
app.include_router(incidents.router, prefix=settings.api_v1_prefix)
app.include_router(vendors.router, prefix=settings.api_v1_prefix)
app.include_router(vendor_sales.router, prefix=settings.api_v1_prefix)
app.include_router(crowd.router, prefix=settings.api_v1_prefix)
app.include_router(reports.router, prefix=settings.api_v1_prefix)
