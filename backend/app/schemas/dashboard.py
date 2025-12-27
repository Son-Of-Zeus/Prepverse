"""
Pydantic schemas for Dashboard models
"""
from pydantic import BaseModel
from typing import List, Optional


class RecentScore(BaseModel):
    date: str
    score: float  # percentage
    subject: Optional[str] = None
    topic: Optional[str] = None
    attempts: int


class PerformanceSummary(BaseModel):
    recent_scores: List[RecentScore]
    overall_accuracy: float
    total_questions: int
    correct_answers: int


class SuggestedTopic(BaseModel):
    subject: str
    topic: str
    progress: float  # 0.0 to 1.0
    mastery_level: str  # "beginner", "learning", "proficient", "mastered"
    accuracy: float


class StreakInfo(BaseModel):
    current_streak: int
    longest_streak: int
    total_xp: int


class DashboardResponse(BaseModel):
    performance_summary: PerformanceSummary
    suggested_topics: List[SuggestedTopic]
    streak_info: StreakInfo
    daily_xp: int

