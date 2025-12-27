"""
Session management utilities for HTTP-only cookie authentication.
Uses itsdangerous for secure cookie signing.
"""
from typing import Optional
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from app.config import get_settings


def get_serializer() -> URLSafeTimedSerializer:
    """Get the session serializer instance."""
    settings = get_settings()
    return URLSafeTimedSerializer(settings.SESSION_SECRET_KEY)


def create_session_token(user_data: dict) -> str:
    """
    Create a signed session token containing user data.

    Args:
        user_data: Dictionary with user_id, email, and any other claims

    Returns:
        Signed token string
    """
    serializer = get_serializer()
    return serializer.dumps(user_data)


def verify_session_token(token: str) -> Optional[dict]:
    """
    Verify and decode a session token.

    Args:
        token: The signed session token

    Returns:
        User data dictionary if valid, None if invalid or expired
    """
    settings = get_settings()
    serializer = get_serializer()

    try:
        user_data = serializer.loads(token, max_age=settings.SESSION_MAX_AGE)
        return user_data
    except SignatureExpired:
        return None
    except BadSignature:
        return None
