"""
Google Gemini Flash 3 client for question generation
"""
import google.generativeai as genai
from typing import List, Dict, Any
from app.config import get_settings

settings = get_settings()

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiClient:
    """
    Client for interacting with Google Gemini API
    """

    def __init__(self):
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

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
1. Each question should have 4 options
2. Include the correct answer
3. Provide a brief explanation
4. Make questions relevant to CBSE curriculum
5. Ensure questions test conceptual understanding

Return the response in the following JSON format:
[
  {{
    "question": "Question text here?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_answer": "The correct option text",
    "explanation": "Brief explanation of why this is correct",
    "difficulty": "{difficulty}",
    "subject": "{subject}",
    "topic": "{topic}"
  }}
]

Generate {count} questions following this exact format."""

        try:
            response = self.model.generate_content(prompt)

            # Extract and parse JSON from response
            import json
            import re

            # Try to extract JSON from the response
            text = response.text

            # Find JSON array in the response
            json_match = re.search(r'\[[\s\S]*\]', text)
            if json_match:
                questions_data = json.loads(json_match.group())
                return questions_data
            else:
                # If no JSON found, return empty list
                return []

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

Return the response in JSON format with daily breakdown."""

        try:
            response = self.model.generate_content(prompt)
            return {"plan": response.text}
        except Exception as e:
            print(f"Error generating study plan: {str(e)}")
            return {"plan": "Unable to generate study plan. Please try again."}


# Singleton instance
gemini_client = GeminiClient()
