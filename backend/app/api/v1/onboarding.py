"""
Onboarding assessment endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from supabase import Client
from datetime import datetime

from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.question import OnboardingQuestion, QuestionResponse
from app.schemas.onboarding import (
    OnboardingSubmission,
    OnboardingResponse,
    OnboardingStatus
)
from app.services.onboarding_service import onboarding_service

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/questions", response_model=List[QuestionResponse])
async def get_onboarding_questions(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get 10 random onboarding questions based on user's class level
    """
    user_id = current_user["user_id"]

    try:
        # Get user's class level
        result = db.table("users").select("class_level").eq("auth0_id", user_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        class_level = result.data[0]["class_level"]

        # Get random questions
        questions = onboarding_service.get_random_questions(class_level, count=10)

        # Convert to response format (without correct answers)
        response_questions = [
            QuestionResponse(
                id=q.id,
                question=q.question,
                options=q.options,
                subject=q.subject,
                topic=q.topic,
                difficulty=q.difficulty,
                time_estimate_seconds=q.time_estimate_seconds
            )
            for q in questions
        ]

        return response_questions

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch questions: {str(e)}"
        )


@router.post("/submit", response_model=OnboardingResponse)
async def submit_onboarding_answers(
    submission: OnboardingSubmission,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Submit onboarding answers and get evaluation results
    """
    user_id = current_user["user_id"]

    try:
        # Get user data
        user_result = db.table("users").select("*").eq("auth0_id", user_id).execute()

        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = user_result.data[0]
        class_level = user_data["class_level"]

        # Get the original questions based on IDs
        all_questions = onboarding_service.questions_data["questions"]
        question_ids = [ans.question_id for ans in submission.answers]

        questions = [
            OnboardingQuestion(**q)
            for q in all_questions
            if q["id"] in question_ids
        ]

        if len(questions) != 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question IDs in submission"
            )

        # Evaluate answers
        evaluation = onboarding_service.evaluate_answers(questions, submission.answers)

        # Update user's onboarding status
        update_data = {
            "onboarding_completed": True,
            "updated_at": datetime.utcnow().isoformat()
        }

        db.table("users").update(update_data).eq("id", user_data["id"]).execute()

        # Store onboarding result
        onboarding_result = {
            "user_id": user_data["id"],
            "score": evaluation.score_percentage,
            "total_questions": evaluation.total_questions,
            "correct_answers": evaluation.correct_answers,
            "weak_topics": evaluation.weak_topics,
            "strong_topics": evaluation.strong_topics,
            "completed_at": datetime.utcnow().isoformat()
        }

        db.table("onboarding_results").insert(onboarding_result).execute()

        # Store individual attempt records
        for result in evaluation.results:
            attempt = {
                "user_id": user_data["id"],
                "question_id": result.question_id,
                "selected_answer": result.selected_answer,
                "is_correct": result.is_correct,
                "subject": result.subject,
                "topic": result.topic,
                "attempt_type": "onboarding"
            }
            db.table("user_attempts").insert(attempt).execute()

        return evaluation

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process submission: {str(e)}"
        )


@router.get("/status", response_model=OnboardingStatus)
async def get_onboarding_status(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get user's onboarding completion status and results
    """
    user_id = current_user["user_id"]

    try:
        # Get user data
        user_result = db.table("users").select(
            "id, onboarding_completed"
        ).eq("auth0_id", user_id).execute()

        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = user_result.data[0]

        if not user_data["onboarding_completed"]:
            return OnboardingStatus(
                completed=False,
                score=None,
                completed_at=None,
                weak_topics=[],
                strong_topics=[]
            )

        # Get onboarding results
        result = db.table("onboarding_results").select("*").eq(
            "user_id", user_data["id"]
        ).order("completed_at", desc=True).limit(1).execute()

        if not result.data or len(result.data) == 0:
            return OnboardingStatus(
                completed=True,
                score=None,
                completed_at=None,
                weak_topics=[],
                strong_topics=[]
            )

        onboarding_data = result.data[0]

        return OnboardingStatus(
            completed=True,
            score=onboarding_data["score"],
            completed_at=onboarding_data["completed_at"],
            weak_topics=onboarding_data.get("weak_topics", []),
            strong_topics=onboarding_data.get("strong_topics", [])
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch onboarding status: {str(e)}"
        )
