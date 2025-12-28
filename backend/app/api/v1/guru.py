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
- POST /stt: Speech-to-text transcription using Groq Whisper
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import Optional
import os
import tempfile
import shutil
import logging

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.services.guru_service import get_guru_service
from app.config import get_settings
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
# Speech-to-Text (Groq Whisper)
# =============================================================================


@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_flexible),
):
    """
    Convert audio file to text using Groq Whisper API.
    
    Accepts audio files (webm, ogg, mp3, wav, m4a) and returns transcribed text.
    This endpoint is designed to work as a proxy for browser-based STT,
    avoiding CORS issues and browser incompatibility.
    
    Args:
        file: Audio file upload (supports webm, ogg, mp3, wav, m4a)
        
    Returns:
        JSON with transcribed text: { "text": "transcription..." }
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Get API key from settings
    settings = get_settings()
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY not configured"
        )
    
    # Validate file type
    allowed_extensions = ['.webm', '.ogg', '.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.mpga']
    filename = file.filename or "recording.webm"
    file_ext = os.path.splitext(filename)[1].lower()
    
    logger.info(f"STT request received: filename={filename}, content_type={file.content_type}")
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    temp_file_path = None
    try:
        # Import Groq client
        from groq import Groq
        client = Groq(api_key=api_key)
        
        # Read file content first
        file_content = await file.read()
        logger.info(f"File size: {len(file_content)} bytes")
        
        if len(file_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file received"
            )
        
        # Create temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(file_content)
        
        logger.info(f"Temp file created: {temp_file_path}")
        
        # Transcribe using Groq Whisper
        with open(temp_file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(filename, audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="text",
            )
        
        logger.info(f"Transcription successful: {transcription[:50] if transcription else 'empty'}...")
        
        # Return transcribed text
        return {"text": transcription.strip() if isinstance(transcription, str) else transcription}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"STT error: {error_msg}", exc_info=True)
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GROQ API key"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {error_msg}"
        )
    finally:
        # Clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass


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
