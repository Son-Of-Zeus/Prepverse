"""
Practice Mode API Endpoints

Provides:
- Topic listing for practice
- Session management (start, submit, end)
- Review and history
- Progress tracking
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.services.practice_service import get_practice_service
from app.schemas.practice import (
    TopicsResponse,
    StartSessionRequest,
    StartSessionResponse,
    NextQuestionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    EndSessionRequest,
    EndSessionResponse,
    SessionHistoryResponse,
    UserProgress,
    ConceptMastery,
)

router = APIRouter(prefix="/practice", tags=["practice"])


# =============================================================================
# Helper Functions
# =============================================================================


async def _get_user_class_level(current_user: dict, db) -> int:
    """
    Fetch user's class_level from database.
    This is the source of truth since class_level can be updated during onboarding.
    """
    db_id = current_user.get("db_id")
    user_id = current_user.get("user_id")

    if db_id:
        result = db.table("users").select("class_level").eq("id", db_id).execute()
    elif user_id:
        result = db.table("users").select("class_level").eq("auth0_id", user_id).execute()
    else:
        return 10  # Default fallback

    if result.data and len(result.data) > 0:
        return result.data[0].get("class_level", 10)

    return 10  # Default fallback


# =============================================================================
# Topics
# =============================================================================


@router.get("/topics", response_model=TopicsResponse)
async def get_topics(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get available topics for practice.

    Returns curriculum topics for the user's class level, optionally filtered by subject.
    """
    service = get_practice_service(db)

    # Fetch class_level from database (source of truth)
    class_level = await _get_user_class_level(current_user, db)

    topics = await service.get_topics(class_level, subject)
    subjects = await service.get_subjects(class_level)

    return TopicsResponse(
        class_level=class_level,
        subjects=subjects,
        topics=topics,
    )


# =============================================================================
# Session Management
# =============================================================================


@router.post("/session/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Start a new practice session.

    - Select subject and optionally topic
    - Choose difficulty (or let adaptive algorithm decide)
    - Set question count and optional time limit
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    # Fetch class_level from database (source of truth)
    class_level = await _get_user_class_level(current_user, db)

    result = await service.start_session(user_id, class_level, request)

    return StartSessionResponse(
        session_id=result["session_id"],
        subject=result["subject"],
        topic=result["topic"],
        difficulty=result["difficulty"],
        question_count=result["question_count"],
        time_limit_seconds=result["time_limit_seconds"],
        started_at=result["started_at"],
    )


@router.get("/session/{session_id}/next", response_model=NextQuestionResponse)
async def get_next_question(
    session_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get the next question in the session.

    Returns the next unanswered question with progress info.
    Returns 404 if session is complete or not found.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    result = await service.get_next_question(session_id, user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No more questions or session not found",
        )

    return NextQuestionResponse(**result)


@router.post("/session/{session_id}/submit", response_model=SubmitAnswerResponse)
async def submit_answer(
    session_id: str,
    request: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Submit an answer for the current question.

    Returns whether the answer was correct, the explanation,
    and current progress stats.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    result = await service.submit_answer(
        session_id=session_id,
        user_id=user_id,
        answer=request.answer,
        time_taken_seconds=request.time_taken_seconds,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or no pending question",
        )

    return SubmitAnswerResponse(**result)


@router.post("/session/{session_id}/end", response_model=EndSessionResponse)
async def end_session(
    session_id: str,
    request: EndSessionRequest = None,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    End a practice session.

    Call this when:
    - All questions are answered (normal completion)
    - User wants to quit early (abandoned)
    - Time limit exceeded

    Returns session summary and full question review.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)
    abandoned = request and request.reason is not None

    result = await service.end_session(session_id, user_id, abandoned=abandoned)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return EndSessionResponse(
        summary=result["summary"],
        questions_review=result["questions_review"],
    )


@router.get("/session/{session_id}/review", response_model=EndSessionResponse)
async def get_session_review(
    session_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get review for a completed session.

    Returns the full session summary and question-by-question review.
    Only works for completed or abandoned sessions.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    result = await service.get_session_review(session_id, user_id)

    if not result:
        # Check if session exists to give better error message
        session_check = db.table("practice_sessions").select("status").eq("id", session_id).execute()
        status_msg = session_check.data[0]["status"] if session_check.data else "not found"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {status_msg}. Call /end first to complete the session.",
        )

    return EndSessionResponse(
        summary=result["summary"],
        questions_review=result["questions_review"],
    )


# =============================================================================
# History & Progress
# =============================================================================


@router.get("/history", response_model=SessionHistoryResponse)
async def get_session_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get paginated history of past practice sessions.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    sessions, total = await service.get_session_history(user_id, page, page_size)

    return SessionHistoryResponse(
        sessions=sessions,
        total_count=total,
        page=page,
        page_size=page_size,
    )


@router.get("/progress/concepts")
async def get_concept_progress(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get concept mastery scores.

    Returns per-topic mastery with recommended difficulty levels.
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    concepts = await service.get_concept_mastery(user_id, subject)

    return {
        "user_id": user_id,
        "concepts": [c.model_dump() for c in concepts],
        "total_concepts": len(concepts),
    }


@router.get("/progress/summary")
async def get_progress_summary(
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get overall progress summary.

    Includes:
    - Total sessions and questions
    - Overall accuracy
    - Subject-wise breakdown
    - continue_learning: Recently practiced topics (based on recency)
    - suggested_topics: Topics user is weak on (mastery < 50%)
    """
    service = get_practice_service(db)
    user_id = await get_db_user_id(current_user, db)

    # Get all concept scores
    concepts = await service.get_concept_mastery(user_id)

    # Get session history stats (sorted by most recent)
    sessions, total_sessions = await service.get_session_history(
        user_id, page=1, page_size=1000
    )

    # Calculate aggregates
    total_questions = sum(s["total_questions"] for s in sessions)
    total_correct = sum(s["correct_answers"] for s in sessions)
    overall_accuracy = (
        total_correct / total_questions * 100 if total_questions > 0 else 0
    )
    total_time = sum(s["total_time_seconds"] for s in sessions)

    # Get user's class level first (needed for subject normalization)
    class_level = await _get_user_class_level(current_user, db)

    # Subject breakdown with normalization for Class 10
    # Class 10: physics, chemistry, biology -> "science" (CBSE has combined Science)
    # Class 12: keep separate subjects
    def normalize_subject(subject: str) -> str:
        if class_level == 10 and subject.lower() in ("physics", "chemistry", "biology"):
            return "science"
        return subject.lower()

    subject_stats = {}
    for c in concepts:
        subj = normalize_subject(c.subject)
        if subj not in subject_stats:
            subject_stats[subj] = {"attempts": 0, "correct": 0}
        subject_stats[subj]["attempts"] += c.total_attempts
        subject_stats[subj]["correct"] += c.correct_attempts

    subject_scores = {
        subj: (
            round(stats["correct"] / stats["attempts"] * 100, 1)
            if stats["attempts"] > 0
            else 0
        )
        for subj, stats in subject_stats.items()
    }

    # Identify weak areas (mastery < 50)
    weak_areas = [c.topic for c in concepts if c.mastery_score < 50]

    # Get all topics for the user's class level
    all_topics = await service.get_topics(class_level)

    # Continue Learning: Recently practiced topics (based purely on recency)
    continue_learning = []
    seen_topics = set()
    for session in sessions[:5]:  # Look at last 5 sessions
        session_topic = session.get("topic")
        if session_topic and session_topic not in seen_topics:
            matching_topic = next(
                (t for t in all_topics if t.topic == session_topic), None
            )
            if matching_topic:
                continue_learning.append(matching_topic)
                seen_topics.add(session_topic)
    continue_learning = continue_learning[:3]  # Limit to 3

    # Suggested Topics: Topics the user is weak on (mastery < 50%)
    suggested_topics = []
    for topic in all_topics:
        if topic.topic in weak_areas:
            suggested_topics.append(topic)
    suggested_topics = suggested_topics[:5]  # Limit to 5

    # Helper to normalize topic dict subjects for Class 10
    def normalize_topic_dict(topic_info):
        data = topic_info.model_dump()
        data["subject"] = normalize_subject(data["subject"])
        return data

    return {
        "user_id": user_id,
        "class_level": class_level,
        "total_sessions": total_sessions,
        "total_questions_attempted": total_questions,
        "overall_accuracy": round(overall_accuracy, 1),
        "total_study_time_minutes": total_time // 60,
        "subject_scores": subject_scores,
        "weak_areas": weak_areas[:5],
        "continue_learning": [normalize_topic_dict(t) for t in continue_learning],
        "suggested_topics": [normalize_topic_dict(t) for t in suggested_topics],
    }
