"""
Pydantic schemas for Question models
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class QuestionBase(BaseModel):
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str
    explanation: str
    subject: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: str  # easy, medium, hard
    class_level: int  # 10 or 12
    question_type: str = "mcq"
    time_estimate_seconds: int = 60
    concept_tags: List[str] = []


class OnboardingQuestion(BaseModel):
    """
    Onboarding question from curriculum JSON
    """
    id: str
    class_level: int = Field(..., alias="class")
    subject: str
    topic: str
    subtopic: str
    difficulty: str
    question_type: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    time_estimate_seconds: int
    concept_tags: List[str]

    class Config:
        populate_by_name = True


class QuestionResponse(BaseModel):
    """
    Question response without correct answer (for frontend)
    """
    id: str
    question: str
    options: List[str]
    subject: str
    topic: str
    difficulty: str
    time_estimate_seconds: int


class QuestionWithAnswer(QuestionResponse):
    """
    Question response with correct answer and explanation
    """
    correct_answer: str
    explanation: str
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None


class GenerateQuestionsRequest(BaseModel):
    """
    Request schema for generating questions with Gemini
    """
    subject: str
    topic: str
    difficulty: str = "medium"
    class_level: int
    count: int = Field(default=5, ge=1, le=50)


class GenerateQuestionsResponse(BaseModel):
    """
    Response schema for generated questions
    """
    questions: List[QuestionBase]
    count: int
    source: str = "gemini"
