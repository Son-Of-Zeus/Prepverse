"""
Main API v1 router - aggregates all route modules
"""
from fastapi import APIRouter

from app.api.v1 import auth, onboarding, questions, practice, schools, forum, peer

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(questions.router)
api_router.include_router(practice.router)
api_router.include_router(schools.router)

api_router.include_router(peer.router)
api_router.include_router(forum.router)
