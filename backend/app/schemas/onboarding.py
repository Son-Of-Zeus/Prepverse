"""
Pydantic schemas for Onboarding flow
"""
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime


class OnboardingAnswer(BaseModel):
    """
    Single answer in onboarding submission
    """
    question_id: str
    selected_answer: str


class OnboardingSubmission(BaseModel):
    """
    Complete onboarding submission with all answers
    """
    answers: List[OnboardingAnswer] = Field(..., min_length=10, max_length=10)


class OnboardingResult(BaseModel):
    """
    Result for a single question after evaluation
    """
    question_id: str
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    subject: str
    topic: str


class OnboardingResponse(BaseModel):
    """
    Complete onboarding evaluation response
    """
    total_questions: int
    correct_answers: int
    score_percentage: float
    results: List[OnboardingResult]
    weak_topics: List[str]
    strong_topics: List[str]
    recommendations: str


class OnboardingStatus(BaseModel):
    """
    User's onboarding status
    """
    completed: bool
    score: Optional[float] = None
    completed_at: Optional[datetime] = None
    weak_topics: List[str] = []
    strong_topics: List[str] = []
