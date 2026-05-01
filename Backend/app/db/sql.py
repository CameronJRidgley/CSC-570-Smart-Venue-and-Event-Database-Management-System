"""PostgreSQL (SQLModel) engine and session management."""
from collections.abc import Generator

from sqlmodel import Session, create_engine, text

from app.core.config import get_settings

settings = get_settings()

# echo controlled by settings.db_echo; set DB_ECHO=true in env to see SQL.
engine = create_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a transactional SQLModel session."""
    with Session(engine) as session:
        yield session


def ping_sql() -> bool:
    """Lightweight connectivity check used by the health endpoint."""
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
        return True
    except Exception:
        return False
