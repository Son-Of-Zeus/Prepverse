"""
Onboarding assessment endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List, Dict, Any
from supabase import Client
from datetime import datetime, timezone

from app.core.security import get_current_user_flexible
from app.db.session import get_db
from app.schemas.question import OnboardingQuestion, QuestionResponse
from app.schemas.onboarding import (
    OnboardingSubmission,
    OnboardingResponse,
    OnboardingStatus,
    OnboardingResult,
)
from app.services.onboarding_service import onboarding_service

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _calculate_recommended_difficulty(accuracy: float) -> str:
    """Calculate recommended difficulty based on accuracy percentage."""
    if accuracy < 40:
        return "easy"
    elif accuracy < 70:
        return "medium"
    else:
        return "hard"


async def _seed_concept_scores_from_onboarding(
    db: Client,
    user_id: str,
    results: List[OnboardingResult],
) -> None:
    """
    Seed concept_scores table from onboarding results.
    This initializes the adaptive difficulty algorithm with the user's baseline performance.
    """
    # Group results by subject + topic
    topic_stats: Dict[str, Dict[str, Any]] = {}

    for result in results:
        key = f"{result.subject}:{result.topic}"
        if key not in topic_stats:
            topic_stats[key] = {
                "subject": result.subject,
                "topic": result.topic,
                "total": 0,
                "correct": 0,
            }
        topic_stats[key]["total"] += 1
        if result.is_correct:
            topic_stats[key]["correct"] += 1

    # Create concept_score entries for each topic
    now = datetime.now(timezone.utc).isoformat()

    for key, stats in topic_stats.items():
        accuracy = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        mastery_score = accuracy  # Initial mastery = accuracy from onboarding

        # Determine recommended difficulty
        recommended_diff = _calculate_recommended_difficulty(accuracy)

        concept_score = {
            "user_id": user_id,
            "subject": stats["subject"],
            "topic": stats["topic"],
            "subtopic": "",  # Onboarding doesn't track subtopics
            "concept_tag": "",
            "total_attempts": stats["total"],
            "correct_attempts": stats["correct"],
            "mastery_score": round(mastery_score, 2),
            "current_streak": stats["correct"],  # Initial streak = correct count
            "best_streak": stats["correct"],
            "recommended_difficulty": recommended_diff,
            # Distribute attempts to difficulty buckets (assume onboarding is "medium")
            "easy_attempts": 0,
            "easy_correct": 0,
            "medium_attempts": stats["total"],
            "medium_correct": stats["correct"],
            "hard_attempts": 0,
            "hard_correct": 0,
            "last_practiced_at": now,
            "created_at": now,
        }

        try:
            # Use upsert to handle potential duplicates
            db.table("concept_scores").upsert(
                concept_score,
                on_conflict="user_id,subject,topic,subtopic,concept_tag"
            ).execute()
        except Exception as e:
            # Log but don't fail - concept scores will be created on first practice
            print(f"Warning: Failed to seed concept score for {key}: {e}")


@router.get("/questions", response_model=List[QuestionResponse])
async def get_onboarding_questions(
    class_level: int = None,
    current_user: dict = Depends(get_current_user_flexible),
    db: Client = Depends(get_db)
):
    """
    Get 10 random onboarding questions based on class level.

    Args:
        class_level: Optional class level (10 or 12). If not provided, uses user's saved class level.
    """
    user_id = current_user["user_id"]

    try:
        # Get user's data from database
        result = db.table("users").select("id, class_level").eq("auth0_id", user_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = result.data[0]

        # Use provided class_level or fall back to user's saved class level
        effective_class_level = class_level if class_level in (10, 12) else user_data["class_level"]

        # If class_level was provided and differs from saved, update the user's class level
        if class_level in (10, 12) and class_level != user_data["class_level"]:
            db.table("users").update({"class_level": class_level}).eq("id", user_data["id"]).execute()

        # Get random questions
        questions = onboarding_service.get_random_questions(effective_class_level, count=10)

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
    current_user: dict = Depends(get_current_user_flexible),
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

        # Seed concept_scores from onboarding results for adaptive difficulty
        await _seed_concept_scores_from_onboarding(
            db=db,
            user_id=user_data["id"],
            results=evaluation.results,
        )

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
    current_user: dict = Depends(get_current_user_flexible),
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
