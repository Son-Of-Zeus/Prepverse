"""
Supabase client setup and database session management
"""
from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings

settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """
    Create and return a cached Supabase client instance
    """
    supabase: Client = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )
    return supabase


def get_db() -> Client:
    """
    Dependency to get Supabase client in route handlers
    """
    return get_supabase_client()
