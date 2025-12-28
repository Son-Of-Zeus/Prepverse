"""
Guru Mode API Endpoints

Provides the "Teach AI" feature where students teach concepts to an AI persona
to demonstrate mastery using the Feynman Technique.

Endpoints:
- POST /start: Start a new teaching session
- POST /chat: Send a message in an active session
- POST /end: End session and get report card
- POST /abandon: Abandon session without grading
- GET /history: Get past Guru sessions
- GET /session/{session_id}: Get details of a specific session
- GET /active: Check for active session
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.services.guru_service import get_guru_service
from app.schemas.guru import (
    GuruSessionCreate,
    GuruSessionResponse,
    GuruChatRequest,
    GuruChatResponse,
    GuruEndSessionRequest,
    GuruEndSessionResponse,
    GuruHistoryResponse,
    GuruSessionDetailResponse,
)

router = APIRouter(prefix="/guru", tags=["guru"])


# =============================================================================
# Session Management
# =============================================================================


@router.post("/start", response_model=GuruSessionResponse)
async def start_session(
    request: GuruSessionCreate,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Start a new Guru Mode teaching session.
    
    The AI will act as a confused student who needs the user to teach them
    about the specified topic. The user must explain the concept clearly
    using the Feynman Technique.
    
    Args:
        request: Contains topic, subject, and optional persona
        
    Returns:
        Session ID and initial message from AI student
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    # Check for existing active session
    active_session = await service.get_active_session(user_id)
    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "You already have an active Guru session",
                "session_id": str(active_session["id"]),
                "topic": active_session["topic"]
            }
        )
    
    try:
        result = await service.start_session(user_id, request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )


@router.post("/chat", response_model=GuruChatResponse)
async def send_message(
    request: GuruChatRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Send a teaching message in an active Guru session.
    
    The AI will respond as a confused student, asking clarifying questions
    if the explanation is unclear or contains jargon.
    
    Args:
        request: Contains session_id and message
        
    Returns:
        AI response with confusion_level and is_satisfied flag
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    try:
        result = await service.process_chat(
            session_id=request.session_id,
            user_id=user_id,
            user_message=request.message
        )
        return result
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or not active"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.post("/end", response_model=GuruEndSessionResponse)
async def end_session(
    request: GuruEndSessionRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    End a Guru session and get the final report card.
    
    The AI will evaluate the teaching session on:
    - Accuracy: Was the information correct?
    - Simplicity: Was it explained clearly (Feynman Technique)?
    
    XP is calculated as: 50 base + (accuracy + simplicity) * 2
    
    Args:
        request: Contains session_id
        
    Returns:
        Report card with scores, feedback, and XP earned
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    try:
        result = await service.end_session(
            session_id=request.session_id,
            user_id=user_id
        )
        return result
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )


@router.post("/abandon")
async def abandon_session(
    request: GuruEndSessionRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Abandon a Guru session without grading.
    
    Use this when the user wants to quit early without receiving XP.
    
    Args:
        request: Contains session_id
        
    Returns:
        Success message
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    success = await service.abandon_session(
        session_id=request.session_id,
        user_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already ended"
        )
    
    return {"message": "Session abandoned successfully"}


# =============================================================================
# History & Details
# =============================================================================


@router.get("/history", response_model=GuruHistoryResponse)
async def get_history(
    limit: int = Query(20, ge=1, le=100, description="Max sessions to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get user's Guru session history.
    
    Returns a list of past teaching sessions with scores and stats.
    
    Args:
        limit: Maximum number of sessions to return
        offset: Pagination offset
        
    Returns:
        List of session summaries and aggregate stats
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    result = await service.get_session_history(
        user_id=user_id,
        limit=limit,
        offset=offset
    )
    
    return result


@router.get("/session/{session_id}", response_model=GuruSessionDetailResponse)
async def get_session_detail(
    session_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get detailed view of a specific Guru session.
    
    Returns full chat history and report card (if completed).
    
    Args:
        session_id: UUID of the session
        
    Returns:
        Full session details including messages
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    try:
        result = await service.get_session_detail(
            session_id=session_id,
            user_id=user_id
        )
        return result
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(e)}"
        )


@router.get("/active")
async def get_active_session(
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Check if user has an active Guru session.
    
    Useful for resuming an interrupted session.
    
    Returns:
        Active session info or null
    """
    service = get_guru_service(db)
    user_id = await get_db_user_id(current_user, db)
    
    session = await service.get_active_session(user_id)
    
    if session:
        return {
            "has_active": True,
            "session_id": str(session["id"]),
            "topic": session["topic"],
            "subject": session["subject"],
            "persona": session["target_persona"],
            "created_at": session["created_at"]
        }
    
    return {"has_active": False}
