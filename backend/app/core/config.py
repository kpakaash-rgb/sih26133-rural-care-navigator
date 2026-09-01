"""
core/config.py
==============
Centralised configuration for the Rural Care Navigator backend.

Reads settings from environment variables (or a .env file).
All modules MUST import settings from here — never use os.getenv() directly.

Replace policy:
  - To switch databases, update DATABASE_URL in .env — no code changes needed.
  - CORS origins, JWT algorithm, and token TTL are all externally configurable.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Pydantic-Settings reads .env files automatically when env_file is set.
    All fields have safe defaults for local development so the app
    starts without a .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ──────────────────────────────────────────────
    # Application metadata
    # ──────────────────────────────────────────────
    PROJECT_NAME: str = "Rural Care Navigator API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # ──────────────────────────────────────────────
    # Database
    # ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/rural_care_db"

    # ──────────────────────────────────────────────
    # Security / JWT
    # ──────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ──────────────────────────────────────────────
    # OTP / Authentication
    # ──────────────────────────────────────────────
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    OTP_DEMO_MODE: bool = True
    DEMO_OTP: str = "123456"

    # ──────────────────────────────────────────────
    # SMS Provider Configuration
    # ──────────────────────────────────────────────
    SMS_PROVIDER: str = "console"
    SMS_API_KEY: Optional[str] = None
    SMS_API_SECRET: Optional[str] = None
    SMS_SENDER_ID: Optional[str] = "RURLCR"
    SMS_TEMPLATE_ID: Optional[str] = None
    SMS_ENABLED: bool = False


    # ──────────────────────────────────────────────
    # CORS
    # ──────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> List[str]:
        """
        Parse FRONTEND_ORIGIN into a list of allowed origins.
        Supports comma-separated values:
            FRONTEND_ORIGIN=http://localhost:5173,http://localhost:3000
        """
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]

    # ──────────────────────────────────────────────
    # Convenience
    # ──────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    Using lru_cache means the .env file is read exactly once per process,
    not on every request. Call get_settings.cache_clear() in tests to reset.
    """
    return Settings()


# Module-level singleton — all imports use this object.
settings: Settings = get_settings()
