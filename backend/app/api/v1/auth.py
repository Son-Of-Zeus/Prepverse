"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.user import UserProfile, UserCreate, User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get current authenticated user's profile
    """
    user_id = current_user["user_id"]

    try:
        # Fetch user from database
        result = db.table("users").select("*").eq("auth0_id", user_id).execute()

        if not result.data or len(result.data) == 0:
            # User doesn't exist - create new user
            email = current_user.get("email", "")

            new_user = {
                "auth0_id": user_id,
                "email": email,
                "onboarding_completed": False,
                "class_level": 10  # Default class
            }

            insert_result = db.table("users").insert(new_user).execute()
            user_data = insert_result.data[0]
        else:
            user_data = result.data[0]

        # Get user stats
        stats_result = db.table("user_attempts").select(
            "id, is_correct"
        ).eq("user_id", user_data["id"]).execute()

        total_attempts = len(stats_result.data) if stats_result.data else 0
        correct_attempts = sum(
            1 for attempt in stats_result.data
            if attempt.get("is_correct", False)
        ) if stats_result.data else 0

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
            created_at=user_data["created_at"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user profile: {str(e)}"
        )
