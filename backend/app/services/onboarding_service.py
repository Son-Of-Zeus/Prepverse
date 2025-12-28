"""
Onboarding service to handle question selection and evaluation
"""
import random
from typing import List, Dict, Any, Optional
from supabase import Client
from app.schemas.question import OnboardingQuestion
from app.schemas.onboarding import (
    OnboardingAnswer,
    OnboardingResult,
    OnboardingResponse
)


class OnboardingService:
    """
    Service to manage onboarding assessment logic.
    Fetches questions from Supabase database.
    """

    def __init__(self, db: Optional[Client] = None):
        self.db = db

    def get_random_questions(self, class_level: int, count: int = 10) -> List[OnboardingQuestion]:
        """
        Get random questions for the specified class level from the database.
        Questions are distributed equally among subjects, with randomization within each subject.

        Args:
            class_level: CBSE class (10 or 12)
            count: Number of questions to return (default 10)

        Returns:
            List of random OnboardingQuestion objects
        """
        if self.db is None:
            raise RuntimeError("Database client not initialized")

        # Query onboarding questions from the database
        result = (
            self.db.table("questions")
            .select("*")
            .eq("source", "onboarding")
            .eq("class_level", class_level)
            .execute()
        )

        class_questions = result.data

        if len(class_questions) < count:
            raise ValueError(f"Not enough questions for class {class_level}. Found {len(class_questions)}, need {count}")

        # Group questions by subject
        # Class 10: mathematics, science (as single subjects)
        # Class 12: mathematics, physics, chemistry, biology (separate subjects)
        questions_by_subject: Dict[str, List[Dict[str, Any]]] = {}

        for q in class_questions:
            subject = q["subject"]

            if subject not in questions_by_subject:
                questions_by_subject[subject] = []
            questions_by_subject[subject].append(q)

        subjects = list(questions_by_subject.keys())
        num_subjects = len(subjects)

        if num_subjects == 0:
            raise ValueError(f"No subjects found for class {class_level}")

        # Calculate equal distribution: base count per subject + distribute remainder
        base_per_subject = count // num_subjects
        remainder = count % num_subjects

        selected: List[Dict[str, Any]] = []

        # Shuffle subjects so remainder distribution is random each time
        random.shuffle(subjects)

        for i, subject in enumerate(subjects):
            subject_questions = questions_by_subject[subject]

            # First 'remainder' subjects get one extra question
            questions_needed = base_per_subject + (1 if i < remainder else 0)

            # Make sure we have enough questions in this subject
            available = len(subject_questions)
            questions_to_pick = min(questions_needed, available)

            # Randomly select from this subject
            selected.extend(random.sample(subject_questions, questions_to_pick))

        # Shuffle the final selection so subjects aren't grouped together
        random.shuffle(selected)

        # Convert database rows to OnboardingQuestion objects
        return [self._db_row_to_question(q) for q in selected]

    def _db_row_to_question(self, row: Dict[str, Any]) -> OnboardingQuestion:
        """
        Convert a database row to an OnboardingQuestion object.
        """
        return OnboardingQuestion(
            id=row["external_id"],
            class_level=row["class_level"],
            subject=row["subject"],
            topic=row["topic"],
            subtopic=row.get("subtopic", ""),
            difficulty=row["difficulty"],
            question_type=row.get("question_type", "mcq"),
            question=row["question"],
            options=row["options"],
            correct_answer=row["correct_answer"],
            explanation=row.get("explanation", ""),
            time_estimate_seconds=row.get("time_estimate_seconds", 60),
            concept_tags=row.get("concept_tags", [])
        )

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
            elif accuracy >= 70:  # 70% threshold to match Android app
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


def get_onboarding_service(db: Client) -> OnboardingService:
    """Factory function for onboarding service"""
    return OnboardingService(db)
