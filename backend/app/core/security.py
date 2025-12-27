"""
Auth0 JWT validation and security utilities.
Supports both cookie-based (primary) and Bearer token (legacy) authentication.

IMPORTANT - User ID Handling:
-----------------------------
The `current_user` dict from `get_current_user_flexible` contains different fields
depending on the auth method:

- Session auth (cookie/bearer_session): Has `db_id` (database UUID) and `user_id` (Auth0 ID)
- Legacy JWT auth (bearer_jwt): Has `user_id` (Auth0 ID) but `db_id` is None

When you need the database user ID for queries, ALWAYS use `get_db_user_id()`:

    from app.core.security import get_db_user_id

    user_id = await get_db_user_id(current_user, db)

DO NOT use patterns like:
    user_id = current_user.get("db_id") or current_user.get("id")  # WRONG!
"""
from typing import Optional
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
from functools import lru_cache

from app.config import get_settings
from app.core.session import verify_session_token

settings = get_settings()
security = HTTPBearer(auto_error=False)  # Don't auto-error, we'll handle it


@lru_cache()
def get_auth0_public_key():
    """
    Fetch Auth0 public key for JWT verification
    """
    jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
    try:
        response = requests.get(jwks_url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch Auth0 public key: {str(e)}"
        )


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Auth0 JWT token and return decoded payload
    """
    token = credentials.credentials

    try:
        # Get the key id from token header
        unverified_header = jwt.get_unverified_header(token)

        # Get Auth0 public keys
        jwks = get_auth0_public_key()

        # Find the matching key
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key"
            )

        # Verify and decode the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=settings.AUTH0_ALGORITHMS,
            audience=settings.AUTH0_AUDIENCE,
            issuer=f"https://{settings.AUTH0_DOMAIN}/"
        )

        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}"
        )


async def get_current_user(token_payload: dict = Depends(verify_token)) -> dict:
    """
    Extract current user information from token payload.
    Legacy: Used for Bearer token authentication.
    """
    user_id = token_payload.get("sub")
    email = token_payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    return {
        "user_id": user_id,
        "email": email,
        "token_payload": token_payload
    }


async def get_current_user_from_cookie(
    request: Request,
    prepverse_session: Optional[str] = Cookie(default=None),
) -> dict:
    """
    Extract and validate user from HTTP-only session cookie.
    Primary authentication method for web frontend.
    """
    if not prepverse_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    user_data = verify_session_token(prepverse_session)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    return user_data


async def get_current_user_flexible(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    prepverse_session: Optional[str] = Cookie(default=None),
) -> dict:
    """
    Unified authentication that accepts either:
    1. HTTP-only session cookie (web frontend)
    2. Bearer session token (Android with server-side OAuth)
    3. Bearer Auth0 JWT token (legacy mobile apps)

    Tries cookie first, then Bearer session token, then Bearer JWT.
    """
    # Try cookie-based auth first (web)
    # Also check request.cookies directly in case Cookie() param extraction fails
    session_cookie = prepverse_session or request.cookies.get("prepverse_session")
    if session_cookie:
        user_data = verify_session_token(session_cookie)
        if user_data:
            return {**user_data, "auth_method": "cookie"}

    # Try Bearer token auth (mobile)
    if credentials and credentials.credentials:
        token = credentials.credentials

        # FIRST: Try to verify as session token (Android server-side OAuth)
        session_user = verify_session_token(token)
        if session_user:
            return {**session_user, "auth_method": "bearer_session"}

        # FALLBACK: Try Auth0 JWT verification (legacy mobile auth)
        try:
            unverified_header = jwt.get_unverified_header(token)
            jwks = get_auth0_public_key()

            rsa_key = {}
            for key in jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break

            if rsa_key:
                payload = jwt.decode(
                    token,
                    rsa_key,
                    algorithms=settings.AUTH0_ALGORITHMS,
                    audience=settings.AUTH0_AUDIENCE,
                    issuer=f"https://{settings.AUTH0_DOMAIN}/"
                )

                return {
                    "user_id": payload.get("sub"),
                    "email": payload.get("email"),
                    "db_id": None,  # Will be fetched from DB if needed
                    "auth_method": "bearer_jwt"
                }
        except (JWTError, Exception):
            pass  # Fall through to error

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a valid session cookie or Bearer token."
    )


async def get_db_user_id(current_user: dict, db) -> Optional[str]:
    """
    Get the database user ID (UUID) from current_user.

    Handles all auth methods:
    - Session auth (cookie/bearer_session): Returns db_id directly
    - Legacy JWT auth (bearer_jwt): Looks up db_id from Auth0 ID

    Args:
        current_user: Dict from get_current_user_flexible()
        db: Supabase client instance

    Returns:
        Database UUID string, or None if user not found

    Usage:
        user_id = await get_db_user_id(current_user, db)
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")
    """
    # Session auth already has db_id
    db_id = current_user.get("db_id")
    if db_id:
        return db_id

    # Legacy JWT auth - lookup by Auth0 ID
    auth0_id = current_user.get("user_id")
    if auth0_id:
        result = db.table("users").select("id").eq("auth0_id", auth0_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]

    return None
