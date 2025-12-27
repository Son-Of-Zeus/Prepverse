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
async def login(request: Request):
    """
    Initiate OAuth flow - redirects to Auth0 with Google connection.
    """
    redirect_uri = request.url_for("auth_callback")
    return await oauth.auth0.authorize_redirect(
        request,
        redirect_uri,
        connection="google-oauth2",
    )


@router.get("/callback", name="auth_callback")
async def auth_callback(request: Request, db: Client = Depends(get_db)):
    """
    OAuth callback - exchanges code for tokens, creates session cookie.
    """
    try:
        token = await oauth.auth0.authorize_access_token(request)
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=auth_failed",
            status_code=status.HTTP_302_FOUND,
        )

    userinfo = token.get("userinfo", {})
    user_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not user_id:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=invalid_user",
            status_code=status.HTTP_302_FOUND,
        )

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
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=db_error",
            status_code=status.HTTP_302_FOUND,
        )

    # Create session token with user data
    session_data = {
        "user_id": user_id,
        "email": email,
        "db_id": user_data["id"],
    }
    session_token = create_session_token(session_data)

    # Redirect to frontend with session cookie
    redirect_url = settings.FRONTEND_URL
    if not user_data.get("onboarding_completed"):
        redirect_url = f"{settings.FRONTEND_URL}/onboarding"

    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.SESSION_MAX_AGE,
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
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
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

        # Get user stats
        stats_result = (
            db.table("user_attempts")
            .select("id, is_correct")
            .eq("user_id", user_data["id"])
            .execute()
        )

        total_attempts = len(stats_result.data) if stats_result.data else 0
        correct_attempts = (
            sum(1 for attempt in stats_result.data if attempt.get("is_correct", False))
            if stats_result.data
            else 0
        )

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
