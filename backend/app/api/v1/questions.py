"""
Question generation and management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.security import get_current_user
from app.core.gemini import gemini_client
from app.schemas.question import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    QuestionBase
)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate", response_model=GenerateQuestionsResponse)
async def generate_questions(
    request: GenerateQuestionsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate questions dynamically using Google Gemini AI

    Requires authentication. Generates questions based on:
    - Subject (mathematics, science, etc.)
    - Topic within the subject
    - Difficulty level (easy, medium, hard)
    - Class level (10 or 12)
    - Number of questions (1-20)
    """
    try:
        # Validate class level
        if request.class_level not in [10, 12]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class level must be 10 or 12"
            )

        # Validate difficulty
        valid_difficulties = ["easy", "medium", "hard"]
        if request.difficulty.lower() not in valid_difficulties:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Difficulty must be one of: {', '.join(valid_difficulties)}"
            )

        # Generate questions using Gemini
        questions_data = await gemini_client.generate_questions(
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
            class_level=request.class_level,
            count=request.count
        )

        if not questions_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate questions. Please try again."
            )

        # Convert to QuestionBase objects
        questions = []
        for q_data in questions_data:
            try:
                question = QuestionBase(
                    question=q_data.get("question", ""),
                    options=q_data.get("options", []),
                    correct_answer=q_data.get("correct_answer", ""),
                    explanation=q_data.get("explanation", ""),
                    subject=q_data.get("subject", request.subject),
                    topic=q_data.get("topic", request.topic),
                    difficulty=q_data.get("difficulty", request.difficulty),
                    class_level=request.class_level,
                    question_type="mcq"
                )
                questions.append(question)
            except Exception as e:
                # Skip invalid questions
                print(f"Error parsing question: {str(e)}")
                continue

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse generated questions. Please try again."
            )

        return GenerateQuestionsResponse(
            questions=questions,
            count=len(questions),
            source="gemini"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating questions: {str(e)}"
        )


@router.post("/generate/study-plan")
async def generate_study_plan(
    class_level: int,
    weak_topics: List[str],
    target_exam: str,
    days_available: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a personalized study plan using Gemini AI

    Args:
        class_level: CBSE class (10 or 12)
        weak_topics: List of topics to focus on
        target_exam: Target exam (Board Exams, JEE, NEET, etc.)
        days_available: Number of days until exam
    """
    try:
        if class_level not in [10, 12]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class level must be 10 or 12"
            )

        if days_available < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days available must be at least 1"
            )

        # Generate study plan using Gemini
        study_plan = await gemini_client.generate_study_plan(
            class_level=class_level,
            weak_topics=weak_topics,
            target_exam=target_exam,
            days_available=days_available
        )

        return study_plan

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating study plan: {str(e)}"
        )
