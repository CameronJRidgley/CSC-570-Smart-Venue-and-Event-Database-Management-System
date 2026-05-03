# Author: Cameron Ridgley
# Copilot had helped me work through bugs and things to sharp up this file
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
        kwargs = {}
        if settings.db_echo:
            # Print every Mongo command that the driver sends. This is the
            # async equivalent of SQLAlchemy's echo=True.
            from pymongo import monitoring

            class _MongoEcho(monitoring.CommandListener):
                def started(self, event):
                    print(f"[MONGO] {event.command_name} on {event.database_name}.{event.command.get(event.command_name)}: {dict(event.command)}")
                def succeeded(self, event): pass
                def failed(self, event):
                    print(f"[MONGO ERROR] {event.command_name}: {event.failure}")
            kwargs["event_listeners"] = [_MongoEcho()]
        _client = AsyncIOMotorClient(settings.mongo_url, **kwargs)
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
