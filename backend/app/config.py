"""
Application configuration — loaded from .env via pydantic-settings.
All API keys are optional; the app falls back to demo data when they're missing.
"""

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
    DEBUG: bool = True

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


settings = Settings()
