"""MongoDB (Beanie + Motor) client and initialization.

Beanie document models will be registered here as they are created in
later milestones. For Milestone 1 the document list is intentionally empty.
"""
from typing import List, Type

from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings

settings = get_settings()

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_url)
    return _client


async def init_mongo(document_models: List[Type[Document]] | None = None) -> None:
    """Initialize Beanie with the registered document models.

    Called once on application startup (see app.main lifespan).
    Skipped when `settings.skip_mongo_init` is true (used in tests).
    """
    if settings.skip_mongo_init:
        return
    client = get_mongo_client()
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=document_models or [],
    )


async def close_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ping_mongo() -> bool:
    """Lightweight connectivity check used by the health endpoint."""
    try:
        client = get_mongo_client()
        await client.admin.command("ping")
        return True
    except Exception:
        return False
