"""
Google Gemini Flash client for question generation
Uses the new google-genai SDK (replaces deprecated google-generativeai)
"""
from google import genai
from google.genai import types
from typing import List, Dict, Any
from pydantic import BaseModel
from app.config import get_settings

settings = get_settings()

# Create Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)


class GeneratedQuestion(BaseModel):
    """Schema for a generated question"""
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: str
    subject: str
    topic: str


class GeminiClient:
    """
    Client for interacting with Google Gemini API
    Uses the new google-genai SDK with async support
    """

    def __init__(self):
        self.model = settings.GEMINI_MODEL
        self.client = client

    async def generate_questions(
        self,
        subject: str,
        topic: str,
        difficulty: str,
        class_level: int,
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate questions using Gemini API

        Args:
            subject: Subject name (mathematics, science, etc.)
            topic: Topic within the subject
            difficulty: easy, medium, or hard
            class_level: CBSE class (10 or 12)
            count: Number of questions to generate

        Returns:
            List of generated questions with MCQ format
        """
        prompt = f"""Generate {count} multiple choice questions for CBSE Class {class_level} students.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}

Requirements:
1. Each question should have exactly 4 options
2. Include the correct answer (must match one of the options exactly)
3. Provide a brief explanation
4. Make questions relevant to CBSE curriculum
5. Ensure questions test conceptual understanding

Generate exactly {count} questions."""

        # Define the JSON schema for structured output
        questions_schema = {
            'type': 'ARRAY',
            'items': {
                'type': 'OBJECT',
                'properties': {
                    'question': {'type': 'STRING'},
                    'options': {
                        'type': 'ARRAY',
                        'items': {'type': 'STRING'}
                    },
                    'correct_answer': {'type': 'STRING'},
                    'explanation': {'type': 'STRING'},
                    'difficulty': {'type': 'STRING'},
                    'subject': {'type': 'STRING'},
                    'topic': {'type': 'STRING'}
                },
                'required': ['question', 'options', 'correct_answer', 'explanation', 'difficulty', 'subject', 'topic']
            }
        }

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=questions_schema
                )
            )

            # Parse the JSON response
            import json
            questions_data = json.loads(response.text)

            # Ensure subject, topic, and difficulty are set correctly
            for q in questions_data:
                q['subject'] = subject
                q['topic'] = topic
                q['difficulty'] = difficulty

            return questions_data

        except Exception as e:
            print(f"Error generating questions with Gemini: {str(e)}")
            return []

    async def generate_study_plan(
        self,
        class_level: int,
        weak_topics: List[str],
        target_exam: str,
        days_available: int
    ) -> Dict[str, Any]:
        """
        Generate a personalized study plan based on weak areas

        Args:
            class_level: CBSE class (10 or 12)
            weak_topics: List of topics where student is weak
            target_exam: Target exam (e.g., Board Exams, JEE, NEET)
            days_available: Number of days until exam

        Returns:
            Structured study plan with daily recommendations
        """
        weak_topics_str = ", ".join(weak_topics)

        prompt = f"""Create a personalized study plan for a CBSE Class {class_level} student.

Target Exam: {target_exam}
Days Available: {days_available}
Weak Topics: {weak_topics_str}

Create a day-by-day study plan that:
1. Prioritizes weak topics
2. Includes revision time
3. Suggests practice question counts
4. Allocates time realistically (2-4 hours per day)
5. Includes breaks and revision cycles

Return a structured study plan."""

        # Define schema for study plan
        study_plan_schema = {
            'type': 'OBJECT',
            'properties': {
                'overview': {'type': 'STRING'},
                'total_days': {'type': 'INTEGER'},
                'daily_hours': {'type': 'INTEGER'},
                'daily_plan': {
                    'type': 'ARRAY',
                    'items': {
                        'type': 'OBJECT',
                        'properties': {
                            'day': {'type': 'INTEGER'},
                            'topics': {
                                'type': 'ARRAY',
                                'items': {'type': 'STRING'}
                            },
                            'activities': {
                                'type': 'ARRAY',
                                'items': {'type': 'STRING'}
                            },
                            'practice_questions': {'type': 'INTEGER'},
                            'notes': {'type': 'STRING'}
                        },
                        'required': ['day', 'topics', 'activities']
                    }
                },
                'tips': {
                    'type': 'ARRAY',
                    'items': {'type': 'STRING'}
                }
            },
            'required': ['overview', 'daily_plan']
        }

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=study_plan_schema
                )
            )

            import json
            return json.loads(response.text)

        except Exception as e:
            print(f"Error generating study plan: {str(e)}")
            return {"plan": "Unable to generate study plan. Please try again.", "error": str(e)}


# Singleton instance
gemini_client = GeminiClient()
