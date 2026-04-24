"""Pytest fixtures.

Uses SQLite in-memory for SQL so tests are hermetic, and skips Mongo
initialization via the `SKIP_MONGO_INIT` env flag. Tests that need Mongo
should be marked / skipped until a real or mocked Mongo is wired up.
"""
import os

# Flip toggles BEFORE importing the app.
os.environ["SKIP_MONGO_INIT"] = "1"
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings
from app.db.sql import get_session
from app.main import app
from app.models.sql import *  # noqa: F401,F403  populate metadata


@pytest.fixture(scope="session")
def _engine():
    # StaticPool + check_same_thread keeps the in-memory DB alive across calls.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine


@pytest.fixture()
def session(_engine):
    with Session(_engine) as s:
        yield s


@pytest.fixture()
def client(_engine):
    def _override_get_session():
        with Session(_engine) as s:
            yield s

    # Clear caches so the TestClient picks up our override cleanly.
    get_settings.cache_clear()
    app.dependency_overrides[get_session] = _override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
