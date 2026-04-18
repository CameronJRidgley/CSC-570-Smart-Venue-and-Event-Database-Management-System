from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env file."""

    # App
    app_env: str = Field(default="development")
    app_name: str = Field(default="Smart Event Management API")
    api_v1_prefix: str = Field(default="/api")

    # CORS
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # PostgreSQL
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/event_mgmt"
    )

    # MongoDB
    mongo_url: str = Field(default="mongodb://localhost:27017")
    mongo_db_name: str = Field(default="event_mgmt")

    # Auth / JWT
    jwt_secret: str = Field(default="change-me-in-production-please")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expires_minutes: int = Field(default=60)

    # Logging
    log_level: str = Field(default="INFO")

    # Test / dev toggles
    skip_mongo_init: bool = Field(default=False)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor so .env is parsed only once."""
    return Settings()
