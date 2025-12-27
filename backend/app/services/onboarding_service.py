"""
Onboarding service to handle question selection and evaluation
"""
import json
import random
from typing import List, Dict, Any
from pathlib import Path
from app.schemas.question import OnboardingQuestion
from app.schemas.onboarding import (
    OnboardingAnswer,
    OnboardingResult,
    OnboardingResponse
)


class OnboardingService:
    """
    Service to manage onboarding assessment logic
    """

    def __init__(self):
        self.questions_data = self._load_questions()

    def _load_questions(self) -> Dict[str, Any]:
        """
        Load onboarding questions from JSON file
        """
        curriculum_path = Path(__file__).parent.parent / "curriculum" / "onboarding_questions.json"

        with open(curriculum_path, 'r') as f:
            data = json.load(f)

        return data

    def get_random_questions(self, class_level: int, count: int = 10) -> List[OnboardingQuestion]:
        """
        Get random questions for the specified class level

        Args:
            class_level: CBSE class (10 or 12)
            count: Number of questions to return (default 10)

        Returns:
            List of random OnboardingQuestion objects
        """
        all_questions = self.questions_data["questions"]

        # Filter questions by class level
        class_questions = [
            q for q in all_questions
            if q.get("class") == class_level
        ]

        if len(class_questions) < count:
            raise ValueError(f"Not enough questions for class {class_level}")

        # Randomly select questions
        selected = random.sample(class_questions, count)

        # Convert to OnboardingQuestion objects
        return [OnboardingQuestion(**q) for q in selected]

    def evaluate_answers(
        self,
        questions: List[OnboardingQuestion],
        answers: List[OnboardingAnswer]
    ) -> OnboardingResponse:
        """
        Evaluate user answers and generate assessment report

        Args:
            questions: List of questions that were asked
            answers: List of user's answers

        Returns:
            OnboardingResponse with evaluation results
        """
        # Create lookup dict for answers
        answer_dict = {ans.question_id: ans.selected_answer for ans in answers}

        results = []
        correct_count = 0
        topic_performance: Dict[str, Dict[str, int]] = {}

        for question in questions:
            user_answer = answer_dict.get(question.id, "")
            is_correct = user_answer == question.correct_answer

            if is_correct:
                correct_count += 1

            # Track topic performance
            topic = question.topic
            if topic not in topic_performance:
                topic_performance[topic] = {"correct": 0, "total": 0}

            topic_performance[topic]["total"] += 1
            if is_correct:
                topic_performance[topic]["correct"] += 1

            # Create result for this question
            result = OnboardingResult(
                question_id=question.id,
                question=question.question,
                selected_answer=user_answer,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                explanation=question.explanation,
                subject=question.subject,
                topic=question.topic
            )
            results.append(result)

        # Calculate score
        total = len(questions)
        score_percentage = (correct_count / total) * 100 if total > 0 else 0

        # Identify weak and strong topics
        weak_topics = []
        strong_topics = []

        for topic, perf in topic_performance.items():
            accuracy = (perf["correct"] / perf["total"]) * 100 if perf["total"] > 0 else 0

            if accuracy < 50:
                weak_topics.append(topic)
            elif accuracy >= 75:
                strong_topics.append(topic)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            score_percentage,
            weak_topics,
            strong_topics
        )

        return OnboardingResponse(
            total_questions=total,
            correct_answers=correct_count,
            score_percentage=round(score_percentage, 2),
            results=results,
            weak_topics=weak_topics,
            strong_topics=strong_topics,
            recommendations=recommendations
        )

    def _generate_recommendations(
        self,
        score: float,
        weak_topics: List[str],
        strong_topics: List[str]
    ) -> str:
        """
        Generate personalized recommendations based on performance
        """
        recommendations = []

        if score >= 80:
            recommendations.append("Excellent performance! You have a strong foundation.")
        elif score >= 60:
            recommendations.append("Good performance! Focus on improving weak areas.")
        else:
            recommendations.append("You need to strengthen your fundamentals.")

        if weak_topics:
            weak_list = ", ".join(weak_topics)
            recommendations.append(f"Focus on these topics: {weak_list}")
            recommendations.append("Practice more questions in these areas daily.")

        if strong_topics:
            strong_list = ", ".join(strong_topics)
            recommendations.append(f"You're strong in: {strong_list}. Keep it up!")

        return " ".join(recommendations)


# Singleton instance
onboarding_service = OnboardingService()
