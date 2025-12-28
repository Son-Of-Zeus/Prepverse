"""
Pydantic schemas for Guru Mode (Teach AI)

Handles request/response validation for the teaching session feature
where students teach concepts to an AI persona using the Feynman Technique.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from uuid import UUID


class GuruPersona(str, Enum):
    """Available AI student personas"""
    FIVE_YEAR_OLD = "5-year-old"
    PEER = "peer"
    SKEPTIC = "skeptic"
    CURIOUS_BEGINNER = "curious_beginner"


class GuruSessionStatus(str, Enum):
    """Session status options"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# ============================================================================
# Session Management
# ============================================================================

class GuruSessionCreate(BaseModel):
    """Request to start a new Guru Mode teaching session"""
    topic: str = Field(..., min_length=1, max_length=100, description="Topic to teach")
    subject: str = Field(..., min_length=1, max_length=50, description="Subject area")
    persona: Optional[GuruPersona] = Field(
        default=GuruPersona.PEER,
        description="AI student persona type"
    )


class GuruSessionResponse(BaseModel):
    """Response after starting a Guru session"""
    session_id: str
    topic: str
    subject: str
    persona: str
    initial_message: str
    created_at: datetime


# ============================================================================
# Chat Messages
# ============================================================================

class ChatMessage(BaseModel):
    """Single chat message in a session"""
    role: str = Field(..., description="'user' or 'model'")
    content: str


class GuruChatRequest(BaseModel):
    """Request to send a message in a Guru session"""
    session_id: str = Field(..., description="UUID of the active session")
    message: str = Field(..., min_length=1, max_length=2000, description="User's teaching message")


class GuruChatResponse(BaseModel):
    """Response from the AI student"""
    message: str = Field(..., description="AI's response message")
    confusion_level: int = Field(
        ..., 
        ge=0, 
        le=100, 
        description="AI's confusion level (100 = very confused, 0 = fully understood)"
    )
    is_satisfied: bool = Field(
        default=False, 
        description="Whether the AI is satisfied with the explanation"
    )
    hints: Optional[List[str]] = Field(
        default=None,
        description="Optional hints for what the AI is confused about"
    )


# ============================================================================
# Session Ending & Report Card
# ============================================================================

class GuruEndSessionRequest(BaseModel):
    """Request to end a Guru session and get the report card"""
    session_id: str = Field(..., description="UUID of the session to end")


class GuruReportCard(BaseModel):
    """Final evaluation report card for a teaching session"""
    accuracy_score: int = Field(..., ge=0, le=10, description="Accuracy of the explanation (0-10)")
    simplicity_score: int = Field(..., ge=0, le=10, description="Simplicity/clarity of the explanation (0-10)")
    feedback: str = Field(..., description="Constructive feedback on the teaching")
    xp_earned: int = Field(..., ge=0, description="XP points earned from this session")
    strengths: Optional[List[str]] = Field(default=None, description="What the student did well")
    improvements: Optional[List[str]] = Field(default=None, description="Areas for improvement")


class GuruEndSessionResponse(BaseModel):
    """Response after ending a Guru session"""
    session_id: str
    status: str
    report_card: GuruReportCard
    total_messages: int
    session_duration_seconds: int


# ============================================================================
# Session History
# ============================================================================

class GuruSessionSummary(BaseModel):
    """Summary of a past Guru session for history listing"""
    session_id: str
    subject: str
    topic: str
    persona: str
    status: str
    accuracy_score: Optional[int] = None
    simplicity_score: Optional[int] = None
    xp_earned: int = 0
    created_at: datetime
    message_count: int = 0


class GuruHistoryResponse(BaseModel):
    """Response with user's Guru session history"""
    sessions: List[GuruSessionSummary]
    total_sessions: int
    total_xp_earned: int
    average_accuracy: Optional[float] = None
    average_simplicity: Optional[float] = None


class GuruSessionDetailResponse(BaseModel):
    """Detailed view of a single Guru session"""
    session_id: str
    subject: str
    topic: str
    persona: str
    status: str
    messages: List[ChatMessage]
    report_card: Optional[GuruReportCard] = None
    xp_earned: int = 0
    created_at: datetime
    updated_at: datetime
