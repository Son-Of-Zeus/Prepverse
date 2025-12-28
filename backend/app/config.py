"""
Configuration settings for PrepVerse Backend
Loads environment variables for Supabase, Auth0, and Gemini
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator


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
    AUTH0_CLIENT_ID: str
    AUTH0_CLIENT_SECRET: str
    AUTH0_AUDIENCE: str
    AUTH0_ALGORITHMS: list[str] = ["RS256"]

    # Session Settings
    SESSION_SECRET_KEY: str
    SESSION_COOKIE_NAME: str = "prepverse_session"
    SESSION_MAX_AGE: int = 604800  # 7 days in seconds

    # Frontend URL (for OAuth redirects)
    FRONTEND_URL: str = "http://localhost:5173"

    # Android deep link callback URL
    ANDROID_CALLBACK_URL: str = "prepverse://auth/callback"

    # Google Gemini Settings
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Groq Settings (for Whisper STT)
    GROQ_API_KEY: str = ""

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://localhost:8081"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # API Settings
    API_V1_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra env variables without error


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance
    """
    return Settings()