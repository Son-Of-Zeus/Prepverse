"""
Main API v1 router - aggregates all route modules
"""
from fastapi import APIRouter

from app.api.v1 import auth, onboarding, questions

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(questions.router)
