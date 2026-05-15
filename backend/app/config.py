"""
Application configuration — loaded from .env via pydantic-settings.
All API keys are optional; the app falls back to demo data when they're missing.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # Database (SQLite)
    DATABASE_URL: str = "sqlite:///./chef.db"

    # Optional external API keys — leave blank to use demo data
    SPOONACULAR_API_KEY: str = ""
    EDAMAM_APP_ID: str = ""
    EDAMAM_APP_KEY: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str
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
