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

    # =========================================================================
    # Guru Mode (Teach AI) Methods
    # =========================================================================

    async def generate_ground_truth(self, topic: str, subject: str) -> str:
        """
        Generate a concise, accurate definition of the concept.
        This is hidden from the user and used by the AI to validate explanations.
        
        Args:
            topic: The topic being taught
            subject: The subject area
            
        Returns:
            A concise, accurate ground truth definition
        """
        prompt = f"""You are an expert teacher. Provide a concise, accurate definition 
and key facts about the following concept:

Subject: {subject}
Topic: {topic}

Requirements:
1. Be accurate and factual
2. Include the most important 3-5 key points
3. Use clear, simple language
4. Keep it to 100-150 words maximum
5. Focus on what a student MUST understand about this concept

Return ONLY the factual content, no preamble."""

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error generating ground truth: {str(e)}")
            return f"Core concept of {topic} in {subject}."

    async def generate_initial_student_message(
        self, 
        topic: str, 
        subject: str, 
        persona: str
    ) -> str:
        """
        Generate the initial curious message from the AI student.
        
        Args:
            topic: The topic to learn about
            subject: The subject area
            persona: The student persona (e.g., 'peer', '5-year-old', 'skeptic')
            
        Returns:
            Initial greeting/question from the AI student
        """
        persona_traits = {
            "5-year-old": "You are a curious 5-year-old child. Use simple words, be very enthusiastic, and ask 'why' a lot.",
            "peer": "You are a fellow student who missed class. Be friendly and slightly embarrassed about not knowing.",
            "skeptic": "You are a skeptical student who needs convincing. Ask 'but how do you know that?' type questions.",
            "curious_beginner": "You are an eager beginner who is excited to learn. Show genuine curiosity and ask thoughtful questions."
        }
        
        trait = persona_traits.get(persona, persona_traits["peer"])
        
        prompt = f"""You are playing the role of a student who needs to learn about a topic.

Persona: {trait}

Generate a short, friendly opening message (1-2 sentences) asking the user to explain:
Topic: {topic}
Subject: {subject}

Be natural and conversational. Don't be overly formal. 
Just express that you don't understand this topic and need their help to learn it."""

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error generating initial message: {str(e)}")
            return f"Hey! I missed class today and I'm totally lost. Can you explain what {topic} is all about?"

    async def generate_student_response(
        self,
        history: list,
        ground_truth: str,
        topic: str,
        subject: str,
        persona: str
    ) -> dict:
        """
        Generate the AI student's response based on the conversation history.
        The AI acts confused if explanations are unclear and satisfied when they're good.
        
        Args:
            history: List of chat messages [{"role": "user/model", "content": "..."}]
            ground_truth: The hidden correct explanation
            topic: The topic being taught
            subject: The subject area
            persona: The student persona type
            
        Returns:
            Dict with: message, confusion_level (0-100), is_satisfied, hints
        """
        persona_traits = {
            "5-year-old": "You are a curious 5-year-old child. Use simple words, get confused by big words, and ask 'why' and 'what does that mean' a lot. Be easily distracted but genuinely trying to understand.",
            "peer": "You are a fellow student who missed class. Be friendly, ask for clarification when things are unclear, and relate to school/exam context.",
            "skeptic": "You are a skeptical student. Question claims, ask for evidence or examples, and say things like 'but how does that actually work?' or 'prove it'.",
            "curious_beginner": "You are an eager beginner. Ask follow-up questions, request examples, and show excitement when you start to understand something."
        }
        
        trait = persona_traits.get(persona, persona_traits["peer"])
        
        # Build conversation context
        conversation = "\n".join([
            f"{'Teacher' if msg['role'] == 'user' else 'Student'}: {msg['content']}"
            for msg in history[-10:]  # Keep last 10 messages for context
        ])
        
        prompt = f"""You are playing the role of a student learning from a teacher.

YOUR PERSONA: {trait}

TOPIC BEING TAUGHT: {topic} ({subject})

GROUND TRUTH (hidden from teacher - use this to evaluate their explanation):
{ground_truth}

CONVERSATION SO FAR:
{conversation}

YOUR TASK:
1. Evaluate the teacher's latest explanation against the Ground Truth
2. If they use jargon or unclear language, act confused and ask what it means
3. If they are vague, ask for a concrete example
4. If they make an error, gently ask a question that exposes the gap
5. If they explain it simply and accurately, show understanding

IMPORTANT RULES:
- Keep responses SHORT (under 50 words)
- Stay in character
- If the explanation is PERFECT (simple, accurate, complete), start your reply with exactly [SATISFIED]
- Never reveal the ground truth or that you're an AI
- React naturally to what they said

Respond in this JSON format:
{{
    "message": "Your response as the student",
    "confusion_level": 0-100 (100 = totally confused, 0 = fully understand),
    "hints": ["optional hint about what you're confused about"]
}}"""

        response_schema = {
            'type': 'OBJECT',
            'properties': {
                'message': {'type': 'STRING'},
                'confusion_level': {'type': 'INTEGER'},
                'hints': {
                    'type': 'ARRAY',
                    'items': {'type': 'STRING'}
                }
            },
            'required': ['message', 'confusion_level']
        }

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=response_schema
                )
            )
            
            import json
            result = json.loads(response.text)
            
            # Check if satisfied
            is_satisfied = result['message'].startswith('[SATISFIED]')
            if is_satisfied:
                result['message'] = result['message'].replace('[SATISFIED]', '').strip()
            
            result['is_satisfied'] = is_satisfied
            return result
            
        except Exception as e:
            print(f"Error generating student response: {str(e)}")
            return {
                "message": "Hmm, I'm still a bit confused. Can you explain that another way?",
                "confusion_level": 70,
                "is_satisfied": False,
                "hints": ["Try using simpler words"]
            }

    async def grade_teaching_session(
        self,
        history: list,
        topic: str,
        subject: str,
        ground_truth: str
    ) -> dict:
        """
        Evaluate and grade a teaching session using the Feynman Technique criteria.
        
        Args:
            history: Full conversation history
            topic: The topic that was taught
            subject: The subject area
            ground_truth: The correct explanation to compare against
            
        Returns:
            Dict with: accuracy_score, simplicity_score, feedback, strengths, improvements
        """
        conversation = "\n".join([
            f"{'Teacher' if msg['role'] == 'user' else 'Student'}: {msg['content']}"
            for msg in history
        ])
        
        prompt = f"""You are an expert educator evaluating a teaching session using the Feynman Technique.

TOPIC: {topic} ({subject})

GROUND TRUTH (what should have been taught):
{ground_truth}

TEACHING SESSION TRANSCRIPT:
{conversation}

EVALUATION CRITERIA:

1. ACCURACY (0-10): Did the teacher convey correct information? Were there any factual errors?
   - 10: Perfect accuracy, all key concepts correct
   - 7-9: Minor omissions but no errors
   - 4-6: Some errors or significant omissions  
   - 0-3: Major errors or mostly incorrect

2. SIMPLICITY (0-10): Did the teacher use simple language and clear explanations (Feynman Technique)?
   - 10: Could teach a child, perfect analogies and examples
   - 7-9: Clear and accessible, minimal jargon
   - 4-6: Some jargon, could be clearer
   - 0-3: Too complex, lots of unexplained jargon

Provide your evaluation in JSON format:
{{
    "accuracy_score": 0-10,
    "simplicity_score": 0-10,
    "feedback": "2-3 sentences of constructive overall feedback",
    "strengths": ["list of 1-3 things they did well"],
    "improvements": ["list of 1-3 specific ways to improve"]
}}"""

        response_schema = {
            'type': 'OBJECT',
            'properties': {
                'accuracy_score': {'type': 'INTEGER'},
                'simplicity_score': {'type': 'INTEGER'},
                'feedback': {'type': 'STRING'},
                'strengths': {
                    'type': 'ARRAY',
                    'items': {'type': 'STRING'}
                },
                'improvements': {
                    'type': 'ARRAY',
                    'items': {'type': 'STRING'}
                }
            },
            'required': ['accuracy_score', 'simplicity_score', 'feedback']
        }

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=response_schema
                )
            )
            
            import json
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Error grading session: {str(e)}")
            return {
                "accuracy_score": 5,
                "simplicity_score": 5,
                "feedback": "Session evaluation could not be completed. Please try again.",
                "strengths": ["Participated in the session"],
                "improvements": ["Try explaining with more examples"]
            }


# Singleton instance
gemini_client = GeminiClient()
