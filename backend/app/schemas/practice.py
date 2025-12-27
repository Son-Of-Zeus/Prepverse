"""
Pydantic schemas for Practice Mode
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# ============================================================================
# Curriculum Topics
# ============================================================================

class TopicInfo(BaseModel):
    """Topic information for selection UI"""
    id: str
    subject: str
    topic: str
    display_name: str
    description: Optional[str] = None
    subtopics: List[str] = []
    icon: Optional[str] = None
    question_count: int = 0


class TopicsResponse(BaseModel):
    """Response with available topics"""
    class_level: int
    subjects: List[str]
    topics: List[TopicInfo]


# ============================================================================
# Practice Session
# ============================================================================

class StartSessionRequest(BaseModel):
    """Request to start a new practice session"""
    subject: str
    topic: Optional[str] = None  # None = mixed topics
    difficulty: Optional[DifficultyLevel] = None  # None = adaptive
    question_count: int = Field(default=10, ge=5, le=30)
    time_limit_seconds: Optional[int] = Field(default=None, ge=60)  # None = no limit


class StartSessionResponse(BaseModel):
    """Response after starting a session"""
    session_id: str
    subject: str
    topic: Optional[str]
    difficulty: Optional[str]
    question_count: int
    time_limit_seconds: Optional[int]
    started_at: datetime


# ============================================================================
# Questions
# ============================================================================

class QuestionForSession(BaseModel):
    """Question delivered during a session (no answer revealed)"""
    id: str
    question_order: int
    question: str
    options: List[str]
    subject: str
    topic: str
    difficulty: str
    time_estimate_seconds: int


class NextQuestionResponse(BaseModel):
    """Response with the next question"""
    session_id: str
    question: QuestionForSession
    current_question_number: int
    total_questions: int
    time_remaining_seconds: Optional[int]
    session_elapsed_seconds: int


# ============================================================================
# Answer Submission
# ============================================================================

class SubmitAnswerRequest(BaseModel):
    """Submit answer for current question"""
    answer: str
    time_taken_seconds: int = Field(ge=0)


class SubmitAnswerResponse(BaseModel):
    """Response after submitting an answer"""
    is_correct: bool
    correct_answer: str
    explanation: str
    time_taken_seconds: int
    points_earned: int = 0  # For gamification later

    # Progress
    questions_answered: int
    questions_remaining: int
    current_score: int  # Correct answers so far
    current_accuracy: float


# ============================================================================
# Session End & Review
# ============================================================================

class QuestionReview(BaseModel):
    """Question with user's answer for review"""
    question_order: int
    question: str
    options: List[str]
    correct_answer: str
    user_answer: Optional[str]
    is_correct: Optional[bool]
    explanation: str
    time_taken_seconds: Optional[int]
    subject: str
    topic: str
    difficulty: str


class SessionSummary(BaseModel):
    """Summary of completed session"""
    session_id: str
    status: SessionStatus
    subject: str
    topic: Optional[str]

    # Score
    total_questions: int
    correct_answers: int
    wrong_answers: int
    skipped: int
    score_percentage: float

    # Time
    total_time_seconds: int
    avg_time_per_question: float
    time_limit_seconds: Optional[int]

    # Breakdown by difficulty
    easy_correct: int = 0
    easy_total: int = 0
    medium_correct: int = 0
    medium_total: int = 0
    hard_correct: int = 0
    hard_total: int = 0

    # Weak areas identified
    weak_topics: List[str] = []
    strong_topics: List[str] = []

    started_at: datetime
    ended_at: datetime


class EndSessionRequest(BaseModel):
    """Request to end session (early or normal)"""
    reason: Optional[str] = None  # For abandoned sessions


class EndSessionResponse(BaseModel):
    """Response after ending session"""
    summary: SessionSummary
    questions_review: List[QuestionReview]


# ============================================================================
# Concept Scores / Progress
# ============================================================================

class ConceptMastery(BaseModel):
    """Mastery info for a single concept/topic"""
    subject: str
    topic: str
    subtopic: Optional[str] = None
    display_name: str

    mastery_score: float  # 0-100
    total_attempts: int
    correct_attempts: int
    accuracy: float

    current_streak: int
    best_streak: int

    recommended_difficulty: DifficultyLevel
    last_practiced_at: Optional[datetime]


class UserProgress(BaseModel):
    """User's overall progress across concepts"""
    user_id: str
    class_level: int

    # Overall stats
    total_sessions: int
    total_questions_attempted: int
    overall_accuracy: float
    total_study_time_minutes: int

    # By subject
    subject_scores: dict  # {subject: accuracy}

    # Concept mastery list
    concepts: List[ConceptMastery]

    # Recommendations
    weak_areas: List[str]
    suggested_topics: List[TopicInfo]


# ============================================================================
# Session History
# ============================================================================

class SessionHistoryItem(BaseModel):
    """Summary of a past session for history list"""
    session_id: str
    subject: str
    topic: Optional[str]
    score_percentage: float
    total_questions: int
    correct_answers: int
    total_time_seconds: int
    started_at: datetime
    status: SessionStatus


class SessionHistoryResponse(BaseModel):
    """Paginated session history"""
    sessions: List[SessionHistoryItem]
    total_count: int
    page: int
    page_size: int
