"""
Configuration settings for PrepVerse Backend
Loads environment variables for Supabase, Auth0, and Gemini
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "PrepVerse API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Auth0 Settings
    AUTH0_DOMAIN: str
    AUTH0_AUDIENCE: str
    AUTH0_ALGORITHMS: list[str] = ["RS256"]

    # Google Gemini Settings
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # CORS Settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "exp://localhost:8081"
    ]

    # API Settings
    API_V1_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance
    """
    return Settings()
