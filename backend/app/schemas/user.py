"""
Pydantic schemas for User models
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    class_level: int  # 10 or 12


class UserCreate(UserBase):
    auth0_id: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    class_level: Optional[int] = None
    onboarding_completed: Optional[bool] = None


class User(UserBase):
    id: str
    auth0_id: str
    onboarding_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """
    User profile response for /me endpoint
    """
    id: str
    email: str
    full_name: Optional[str]
    class_level: int
    school_id: Optional[str] = None
    onboarding_completed: bool
    total_questions_attempted: int = 0
    correct_answers: int = 0
    accuracy: float = 0.0
    created_at: datetime
