"""
Authentication endpoints with server-side OAuth flow.
Handles login, callback, logout, and user profile.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from supabase import Client

from app.config import get_settings
from app.core.oauth import oauth
from app.core.session import create_session_token
from app.core.security import get_current_user_from_cookie, get_current_user_flexible
from app.db.session import get_db
from app.schemas.user import UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.get("/login")
async def login(request: Request, platform: str = "web"):
    """
    Initiate OAuth flow - redirects to Auth0 with Google connection.

    Args:
        platform: "web" (default) or "android" - determines callback behavior
    """
    # Store platform in session for callback to retrieve
    request.session["oauth_platform"] = platform

    # Determine callback URL based on platform and environment
    if settings.DEBUG:
        if platform == "android":
            # Android emulator: use direct backend URL (127.0.0.1 = host's localhost)
            # This URL must be registered in Auth0 allowed callbacks
            redirect_uri = "http://127.0.0.1:8000/api/v1/auth/callback"
        else:
            # Web: requests come through Vite proxy, use frontend URL
            redirect_uri = f"{settings.FRONTEND_URL}/api/v1/auth/callback"
    else:
        redirect_uri = request.url_for("auth_callback")

    return await oauth.auth0.authorize_redirect(
        request,
        redirect_uri,
        connection="google-oauth2",
    )


@router.get("/callback", name="auth_callback")
async def auth_callback(request: Request, db: Client = Depends(get_db)):
    """
    OAuth callback - exchanges code for tokens.
    - Web: Sets session cookie and redirects to FRONTEND_URL
    - Android: Redirects to deep link with session token
    """
    # Get platform from session (set in /login)
    # Get platform from session (set in /login)
    platform = request.session.get("oauth_platform")
    
    # Fallback: if session lost, infer from request URL
    if not platform:
        # Check if running on Android Emulator local IP (127.0.0.1) or Android IP (10.0.2.2)
        host = request.headers.get("host", "")
        if "127.0.0.1" in host or "10.0.2.2" in host:
             platform = "android"
        else:
             platform = "web"

    # Helper to build error redirect based on platform
    def error_redirect(error: str):
        if platform == "android":
            return RedirectResponse(
                url=f"{settings.ANDROID_CALLBACK_URL}?error={error}",
                status_code=status.HTTP_302_FOUND,
            )
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={error}",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        token = await oauth.auth0.authorize_access_token(request)
    except Exception as e:
        return error_redirect("auth_failed")

    userinfo = token.get("userinfo", {})
    user_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not user_id:
        return error_redirect("invalid_user")

    # Create or update user in database
    try:
        result = db.table("users").select("*").eq("auth0_id", user_id).execute()

        if not result.data or len(result.data) == 0:
            # Create new user
            new_user = {
                "auth0_id": user_id,
                "email": email,
                "full_name": name,
                "onboarding_completed": False,
                "class_level": 10,
            }
            insert_result = db.table("users").insert(new_user).execute()
            user_data = insert_result.data[0]
        else:
            user_data = result.data[0]
            # Update name if changed
            if name and user_data.get("full_name") != name:
                db.table("users").update({"full_name": name}).eq(
                    "auth0_id", user_id
                ).execute()
                user_data["full_name"] = name

    except Exception as e:
        return error_redirect("db_error")

    # Create session token with user data
    session_data = {
        "user_id": user_id,
        "email": email,
        "db_id": user_data["id"],
    }
    session_token = create_session_token(session_data)

    needs_onboarding = not user_data.get("onboarding_completed")

    # Platform-specific response
    if platform == "android":
        # Android: Redirect to deep link with token
        redirect_url = f"{settings.ANDROID_CALLBACK_URL}?token={session_token}"
        if needs_onboarding:
            redirect_url += "&needs_onboarding=true"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    # Web: Set cookie and redirect to frontend
    redirect_url = settings.FRONTEND_URL
    if needs_onboarding:
        redirect_url = f"{settings.FRONTEND_URL}/onboarding"

    is_production = not settings.DEBUG
    samesite_policy = "none" if is_production else "lax"
    secure_policy = True if is_production else False

    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=secure_policy,
        samesite=samesite_policy,
        max_age=settings.SESSION_MAX_AGE,
        path="/",  # Important: send cookie for all paths
    )

    return response


@router.post("/logout")
async def logout():
    """
    Clear session cookie and logout user.
    """
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",  # Must match the path used when setting the cookie
    )
    return response


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    request: Request,
    current_user: dict = Depends(get_current_user_flexible),
    db: Client = Depends(get_db),
):
    """
    Get current authenticated user's profile.
    Supports both cookie auth (web) and Bearer token auth (mobile).
    """
    user_id = current_user.get("user_id")
    db_id = current_user.get("db_id")

    try:
        # Fetch user from database
        if db_id:
            result = db.table("users").select("*").eq("id", db_id).execute()
        else:
            result = db.table("users").select("*").eq("auth0_id", user_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user_data = result.data[0]

        # Get user stats from both user_attempts (onboarding) and practice_session_questions
        # 1. Onboarding attempts from user_attempts
        onboarding_stats = (
            db.table("user_attempts")
            .select("id, is_correct")
            .eq("user_id", user_data["id"])
            .execute()
        )
        onboarding_total = len(onboarding_stats.data) if onboarding_stats.data else 0
        onboarding_correct = (
            sum(1 for a in onboarding_stats.data if a.get("is_correct", False))
            if onboarding_stats.data
            else 0
        )

        # 2. Practice attempts from practice_session_questions (via practice_sessions)
        practice_stats = (
            db.table("practice_session_questions")
            .select("id, is_correct, practice_sessions!inner(user_id)")
            .eq("practice_sessions.user_id", user_data["id"])
            .not_.is_("user_answer", "null")  # Only count answered questions
            .execute()
        )
        practice_total = len(practice_stats.data) if practice_stats.data else 0
        practice_correct = (
            sum(1 for a in practice_stats.data if a.get("is_correct", False))
            if practice_stats.data
            else 0
        )

        # Combine stats
        total_attempts = onboarding_total + practice_total
        correct_attempts = onboarding_correct + practice_correct
        accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0

        return UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data.get("full_name"),
            class_level=user_data["class_level"],
            onboarding_completed=user_data["onboarding_completed"],
            total_questions_attempted=total_attempts,
            correct_answers=correct_attempts,
            accuracy=round(accuracy, 2),
            created_at=user_data["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user profile: {str(e)}",
        )
