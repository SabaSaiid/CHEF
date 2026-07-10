"""
Application configuration — loaded from .env via pydantic-settings.
All API keys are optional; the app falls back to demo data when they're missing.
"""

import os
import secrets
import logging
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Generate a secure fallback so the app never ships a guessable default.
# If JWT_SECRET_KEY is not explicitly set, this random value is used —
# safe, but tokens won't survive container restarts.
_GENERATED_JWT_SECRET = secrets.token_hex(32)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "CHEF"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # Defaults to off — set DEBUG=true in .env for development

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:8001"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # Database — dual-backend support (SQLite for local dev, PostgreSQL for production)
    # Set DATABASE_BACKEND=postgresql and DATABASE_URL=postgresql://... in .env to use PG
    DATABASE_BACKEND: str = "sqlite"  # "sqlite" or "postgresql"
    DATABASE_URL: str = f"sqlite:///{os.environ.get('HOME', '.')}/chef.db"

    # Optional external API keys — leave blank to use demo data
    SPOONACULAR_API_KEY: str = ""
    EDAMAM_APP_ID: str = ""
    EDAMAM_APP_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # JWT Authentication — defaults to a per-process random secret so tokens
    # are never signed with a publicly known key.  Set JWT_SECRET_KEY in your
    # environment / .env for persistent sessions across restarts.
    JWT_SECRET_KEY: str = _GENERATED_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 30

    @field_validator("JWT_EXPIRY_MINUTES")
    @classmethod
    def validate_jwt_expiry(cls, v: int) -> int:
        if v < 5:
            raise ValueError("JWT_EXPIRY_MINUTES must be at least 5")
        if v > 10080:
            raise ValueError("JWT_EXPIRY_MINUTES must be at most 10080 (1 week)")
        return v


settings = Settings()

# Warn operators if they haven't set an explicit secret
if settings.JWT_SECRET_KEY == _GENERATED_JWT_SECRET:
    logger.warning(
        "⚠️  JWT_SECRET_KEY is not set — using a random secret. "
        "User sessions will NOT survive server restarts. "
        "Set JWT_SECRET_KEY in your environment or .env file for production."
    )
