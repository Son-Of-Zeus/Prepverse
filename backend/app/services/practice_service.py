"""
Practice Mode Service

Handles:
- Session creation and management
- Question selection with adaptive difficulty
- Answer submission and scoring
- Concept score updates
- Session review and history
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from supabase import Client

from app.core.gemini import gemini_client
from app.schemas.practice import (
    DifficultyLevel,
    SessionStatus,
    TopicInfo,
    StartSessionRequest,
    QuestionForSession,
    SessionSummary,
    QuestionReview,
    ConceptMastery,
)


class PracticeService:
    """Service for managing practice sessions and adaptive learning"""

    def __init__(self, db: Client):
        self.db = db

    # =========================================================================
    # Topics & Curriculum
    # =========================================================================

    async def get_topics(
        self, class_level: int, subject: Optional[str] = None
    ) -> List[TopicInfo]:
        """Get available topics for practice"""
        query = self.db.table("curriculum_topics").select("*").eq(
            "class_level", class_level
        ).eq("is_active", True)

        if subject:
            query = query.eq("subject", subject)

        result = query.order("display_order").execute()

        topics = []
        for row in result.data:
            topics.append(
                TopicInfo(
                    id=str(row["id"]),
                    subject=row["subject"],
                    topic=row["topic"],
                    display_name=row["display_name"],
                    description=row.get("description"),
                    subtopics=row.get("subtopics", []),
                    icon=row.get("icon"),
                    question_count=row.get("question_count", 0),
                )
            )

        return topics

    async def get_subjects(self, class_level: int) -> List[str]:
        """Get distinct subjects for a class level"""
        # Use RPC for DISTINCT query (more efficient than fetching all and deduping in Python)
        try:
            result = self.db.rpc(
                "get_distinct_subjects",
                {"p_class_level": class_level}
            ).execute()
            if result.data:
                return sorted([row["subject"] for row in result.data])
        except Exception:
            pass  # Fall back to original approach if RPC doesn't exist

        # Fallback: fetch all and dedupe (less efficient but works without RPC)
        result = (
            self.db.table("curriculum_topics")
            .select("subject")
            .eq("class_level", class_level)
            .eq("is_active", True)
            .execute()
        )

        subjects = list(set(row["subject"] for row in result.data))
        return sorted(subjects)

    # =========================================================================
    # Session Management
    # =========================================================================

    async def start_session(
        self,
        user_id: str,
        class_level: int,
        request: StartSessionRequest,
    ) -> Dict[str, Any]:
        """Start a new practice session"""
        # Create session record
        session_data = {
            "user_id": user_id,
            "subject": request.subject,
            "topic": request.topic,
            "difficulty": request.difficulty.value if request.difficulty else None,
            "class_level": class_level,
            "question_count": request.question_count,
            "time_limit_seconds": request.time_limit_seconds,
            "status": SessionStatus.IN_PROGRESS.value,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        result = self.db.table("practice_sessions").insert(session_data).execute()
        session = result.data[0]
        session_id = session["id"]

        # Select questions for the session
        questions = await self._select_questions_for_session(
            user_id=user_id,
            class_level=class_level,
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
            count=request.question_count,
        )

        # Insert session questions (batch insert for performance)
        session_questions_data = [
            {
                "session_id": session_id,
                "question_id": q["id"],
                "question_order": i + 1,
                "difficulty": q["difficulty"],
            }
            for i, q in enumerate(questions)
        ]
        if session_questions_data:
            self.db.table("practice_session_questions").insert(
                session_questions_data
            ).execute()

        return {
            "session_id": session_id,
            "subject": request.subject,
            "topic": request.topic,
            "difficulty": request.difficulty.value if request.difficulty else None,
            "question_count": request.question_count,
            "time_limit_seconds": request.time_limit_seconds,
            "started_at": session["started_at"],
        }

    async def get_next_question(
        self, session_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get the next unanswered question in the session"""
        # Verify session belongs to user and is in progress
        session = await self._get_session(session_id, user_id)
        if not session or session["status"] != SessionStatus.IN_PROGRESS.value:
            return None

        # Get next unanswered question
        result = (
            self.db.table("practice_session_questions")
            .select("*, questions(*)")
            .eq("session_id", session_id)
            .is_("user_answer", "null")
            .order("question_order")
            .limit(1)
            .execute()
        )

        if not result.data:
            return None

        psq = result.data[0]
        question = psq["questions"]

        # Calculate time remaining
        time_remaining = None
        if session["time_limit_seconds"]:
            started = datetime.fromisoformat(
                session["started_at"].replace("Z", "+00:00")
            )
            elapsed = (datetime.now(timezone.utc) - started).total_seconds()
            time_remaining = max(0, session["time_limit_seconds"] - int(elapsed))

        # Get progress stats
        answered = (
            self.db.table("practice_session_questions")
            .select("id", count="exact")
            .eq("session_id", session_id)
            .not_.is_("user_answer", "null")
            .execute()
        )
        current_number = (answered.count or 0) + 1

        started = datetime.fromisoformat(
            session["started_at"].replace("Z", "+00:00")
        )
        elapsed_seconds = int(
            (datetime.now(timezone.utc) - started).total_seconds()
        )

        return {
            "session_id": session_id,
            "question": QuestionForSession(
                id=psq["id"],
                question_order=psq["question_order"],
                question=question["question"],
                options=question["options"],
                subject=question["subject"],
                topic=question["topic"],
                difficulty=question["difficulty"],
                time_estimate_seconds=question.get("time_estimate_seconds", 60),
            ),
            "current_question_number": current_number,
            "total_questions": session["question_count"],
            "time_remaining_seconds": time_remaining,
            "session_elapsed_seconds": elapsed_seconds,
        }

    async def submit_answer(
        self,
        session_id: str,
        user_id: str,
        answer: str,
        time_taken_seconds: int,
    ) -> Optional[Dict[str, Any]]:
        """Submit an answer for the current question"""
        # Verify session
        session = await self._get_session(session_id, user_id)
        if not session or session["status"] != SessionStatus.IN_PROGRESS.value:
            return None

        # Get current unanswered question
        result = (
            self.db.table("practice_session_questions")
            .select("*, questions(*)")
            .eq("session_id", session_id)
            .is_("user_answer", "null")
            .order("question_order")
            .limit(1)
            .execute()
        )

        if not result.data:
            return None

        psq = result.data[0]
        question = psq["questions"]
        is_correct = answer == question["correct_answer"]

        # Update the question record
        self.db.table("practice_session_questions").update(
            {
                "user_answer": answer,
                "is_correct": is_correct,
                "time_taken_seconds": time_taken_seconds,
                "answered_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", psq["id"]).execute()

        # Update question usage stats
        update_q = {"times_used": question["times_used"] + 1}
        if is_correct:
            update_q["times_correct"] = question["times_correct"] + 1
        self.db.table("questions").update(update_q).eq(
            "id", question["id"]
        ).execute()

        # Update concept scores
        await self._update_concept_score(
            user_id=user_id,
            subject=question["subject"],
            topic=question["topic"],
            subtopic=question.get("subtopic"),
            difficulty=question["difficulty"],
            is_correct=is_correct,
            time_taken=time_taken_seconds,
        )

        # Get current progress
        all_answers = (
            self.db.table("practice_session_questions")
            .select("is_correct")
            .eq("session_id", session_id)
            .not_.is_("user_answer", "null")
            .execute()
        )

        answered_count = len(all_answers.data)
        correct_count = sum(1 for a in all_answers.data if a["is_correct"])
        remaining = session["question_count"] - answered_count
        accuracy = (correct_count / answered_count * 100) if answered_count > 0 else 0

        return {
            "is_correct": is_correct,
            "correct_answer": question["correct_answer"],
            "explanation": question.get("explanation", ""),
            "time_taken_seconds": time_taken_seconds,
            "points_earned": 10 if is_correct else 0,
            "questions_answered": answered_count,
            "questions_remaining": remaining,
            "current_score": correct_count,
            "current_accuracy": round(accuracy, 1),
        }

    async def end_session(
        self, session_id: str, user_id: str, abandoned: bool = False
    ) -> Optional[Dict[str, Any]]:
        """End a session and calculate results"""
        session = await self._get_session(session_id, user_id)
        if not session:
            return None

        # Get all questions with answers
        result = (
            self.db.table("practice_session_questions")
            .select("*, questions(*)")
            .eq("session_id", session_id)
            .order("question_order")
            .execute()
        )

        questions = result.data
        ended_at = datetime.now(timezone.utc)
        started_at = datetime.fromisoformat(
            session["started_at"].replace("Z", "+00:00")
        )
        total_time = int((ended_at - started_at).total_seconds())

        # Calculate stats
        total = len(questions)
        correct = sum(1 for q in questions if q.get("is_correct") is True)
        wrong = sum(1 for q in questions if q.get("is_correct") is False)
        skipped = sum(1 for q in questions if q.get("user_answer") is None)

        # Difficulty breakdown
        easy_total = sum(1 for q in questions if q["difficulty"] == "easy")
        easy_correct = sum(
            1 for q in questions
            if q["difficulty"] == "easy" and q.get("is_correct") is True
        )
        medium_total = sum(1 for q in questions if q["difficulty"] == "medium")
        medium_correct = sum(
            1 for q in questions
            if q["difficulty"] == "medium" and q.get("is_correct") is True
        )
        hard_total = sum(1 for q in questions if q["difficulty"] == "hard")
        hard_correct = sum(
            1 for q in questions
            if q["difficulty"] == "hard" and q.get("is_correct") is True
        )

        # Time stats
        times = [
            q["time_taken_seconds"]
            for q in questions
            if q.get("time_taken_seconds")
        ]
        avg_time = sum(times) / len(times) if times else 0

        # Identify weak/strong topics
        topic_stats: Dict[str, Dict[str, int]] = {}
        for q in questions:
            topic = q["questions"]["topic"]
            if topic not in topic_stats:
                topic_stats[topic] = {"correct": 0, "total": 0}
            topic_stats[topic]["total"] += 1
            if q.get("is_correct"):
                topic_stats[topic]["correct"] += 1

        weak_topics = [
            t
            for t, s in topic_stats.items()
            if s["total"] > 0 and (s["correct"] / s["total"]) < 0.5
        ]
        strong_topics = [
            t
            for t, s in topic_stats.items()
            if s["total"] > 0 and (s["correct"] / s["total"]) >= 0.8
        ]

        # Update session record
        score_pct = (correct / total * 100) if total > 0 else 0
        self.db.table("practice_sessions").update(
            {
                "status": (
                    SessionStatus.ABANDONED.value
                    if abandoned
                    else SessionStatus.COMPLETED.value
                ),
                "ended_at": ended_at.isoformat(),
                "total_questions": total,
                "correct_answers": correct,
                "wrong_answers": wrong,
                "skipped": skipped,
                "total_time_seconds": total_time,
                "avg_time_per_question": avg_time,
                "score_percentage": score_pct,
            }
        ).eq("id", session_id).execute()

        # Build review list
        reviews = []
        for q in questions:
            qdata = q["questions"]
            reviews.append(
                QuestionReview(
                    question_order=q["question_order"],
                    question=qdata["question"],
                    options=qdata["options"],
                    correct_answer=qdata["correct_answer"],
                    user_answer=q.get("user_answer"),
                    is_correct=q.get("is_correct"),
                    explanation=qdata.get("explanation", ""),
                    time_taken_seconds=q.get("time_taken_seconds"),
                    subject=qdata["subject"],
                    topic=qdata["topic"],
                    difficulty=qdata["difficulty"],
                )
            )

        summary = SessionSummary(
            session_id=session_id,
            status=SessionStatus.ABANDONED if abandoned else SessionStatus.COMPLETED,
            subject=session["subject"],
            topic=session.get("topic"),
            total_questions=total,
            correct_answers=correct,
            wrong_answers=wrong,
            skipped=skipped,
            score_percentage=round(score_pct, 1),
            total_time_seconds=total_time,
            avg_time_per_question=round(avg_time, 1),
            time_limit_seconds=session.get("time_limit_seconds"),
            easy_correct=easy_correct,
            easy_total=easy_total,
            medium_correct=medium_correct,
            medium_total=medium_total,
            hard_correct=hard_correct,
            hard_total=hard_total,
            weak_topics=weak_topics,
            strong_topics=strong_topics,
            started_at=started_at,
            ended_at=ended_at,
        )

        return {
            "summary": summary,
            "questions_review": reviews,
        }

    async def get_session_review(
        self, session_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get review for a completed session"""
        session = await self._get_session(session_id, user_id)
        if not session or session["status"] == SessionStatus.IN_PROGRESS.value:
            return None

        # Reuse end_session logic for building review
        return await self.end_session(session_id, user_id, abandoned=False)

    # =========================================================================
    # Question Selection with Adaptive Difficulty
    # =========================================================================

    async def _select_questions_for_session(
        self,
        user_id: str,
        class_level: int,
        subject: str,
        topic: Optional[str],
        difficulty: Optional[DifficultyLevel],
        count: int,
    ) -> List[Dict[str, Any]]:
        """Select questions with adaptive difficulty"""
        questions = []

        # If fixed difficulty, use it; otherwise use adaptive
        if difficulty:
            difficulties = [difficulty.value] * count
        else:
            difficulties = await self._get_adaptive_difficulty_distribution(
                user_id, subject, topic, count
            )

        # Try to get cached questions first
        for diff in difficulties:
            cached = await self._get_cached_question(
                class_level, subject, topic, diff, exclude_ids=[q["id"] for q in questions]
            )
            if cached:
                questions.append(cached)

        # Generate remaining questions with Gemini
        remaining = count - len(questions)
        if remaining > 0:
            # Group by difficulty for efficient generation
            diff_counts: Dict[str, int] = {}
            for diff in difficulties[len(questions):]:
                diff_counts[diff] = diff_counts.get(diff, 0) + 1

            for diff, cnt in diff_counts.items():
                generated = await self._generate_and_cache_questions(
                    class_level=class_level,
                    subject=subject,
                    topic=topic or "mixed",
                    difficulty=diff,
                    count=cnt,
                )
                questions.extend(generated)

        return questions[:count]

    async def _get_adaptive_difficulty_distribution(
        self,
        user_id: str,
        subject: str,
        topic: Optional[str],
        count: int,
    ) -> List[str]:
        """Get difficulty distribution based on user's concept scores"""
        # Get user's mastery for this subject/topic
        query = (
            self.db.table("concept_scores")
            .select("recommended_difficulty, mastery_score")
            .eq("user_id", user_id)
            .eq("subject", subject)
        )
        if topic:
            query = query.eq("topic", topic)

        result = query.execute()

        if not result.data:
            # New user: start with mostly easy
            return ["easy"] * (count // 2) + ["medium"] * (count - count // 2)

        # Calculate average recommended difficulty
        difficulties = [r["recommended_difficulty"] for r in result.data]
        avg_mastery = sum(r["mastery_score"] for r in result.data) / len(result.data)

        # Distribute based on mastery
        if avg_mastery < 40:
            # Low mastery: 60% easy, 40% medium
            easy = int(count * 0.6)
            medium = count - easy
            return ["easy"] * easy + ["medium"] * medium
        elif avg_mastery < 70:
            # Medium mastery: 30% easy, 50% medium, 20% hard
            easy = int(count * 0.3)
            hard = int(count * 0.2)
            medium = count - easy - hard
            return ["easy"] * easy + ["medium"] * medium + ["hard"] * hard
        else:
            # High mastery: 20% easy, 40% medium, 40% hard
            easy = int(count * 0.2)
            hard = int(count * 0.4)
            medium = count - easy - hard
            return ["easy"] * easy + ["medium"] * medium + ["hard"] * hard

    async def _get_cached_question(
        self,
        class_level: int,
        subject: str,
        topic: Optional[str],
        difficulty: str,
        exclude_ids: List[str],
    ) -> Optional[Dict[str, Any]]:
        """Get a cached question from the database"""
        query = (
            self.db.table("questions")
            .select("*")
            .eq("class_level", class_level)
            .eq("subject", subject)
            .eq("difficulty", difficulty)
        )

        if topic:
            query = query.eq("topic", topic)

        if exclude_ids:
            query = query.not_.in_("id", exclude_ids)

        # Order by least used for variety
        result = query.order("times_used").limit(1).execute()

        if result.data:
            return result.data[0]
        return None

    async def _generate_and_cache_questions(
        self,
        class_level: int,
        subject: str,
        topic: str,
        difficulty: str,
        count: int,
    ) -> List[Dict[str, Any]]:
        """Generate questions with Gemini and cache them"""
        generated = await gemini_client.generate_questions(
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            class_level=class_level,
            count=count,
        )

        cached_questions = []
        for q in generated:
            # Create a unique ID based on question content
            content_hash = hashlib.md5(
                f"{q.get('question', '')}{q.get('options', [])}".encode()
            ).hexdigest()[:16]
            external_id = f"gen_{content_hash}"

            # Check if already exists
            existing = (
                self.db.table("questions")
                .select("*")
                .eq("external_id", external_id)
                .execute()
            )

            if existing.data:
                cached_questions.append(existing.data[0])
                continue

            # Insert new question
            question_data = {
                "external_id": external_id,
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "subject": subject,
                "topic": topic,
                "difficulty": difficulty,
                "class_level": class_level,
                "source": "gemini",
                "times_used": 0,
                "times_correct": 0,
            }

            try:
                result = (
                    self.db.table("questions").insert(question_data).execute()
                )
                if result.data:
                    cached_questions.append(result.data[0])
            except Exception as e:
                print(f"Error caching question: {e}")
                # Still use the question even if caching fails
                question_data["id"] = str(uuid.uuid4())
                cached_questions.append(question_data)

        return cached_questions

    # =========================================================================
    # Concept Score Updates
    # =========================================================================

    async def _update_concept_score(
        self,
        user_id: str,
        subject: str,
        topic: str,
        subtopic: Optional[str],
        difficulty: str,
        is_correct: bool,
        time_taken: int,
    ):
        """Update user's concept mastery score"""
        # Get or create concept score record
        query = (
            self.db.table("concept_scores")
            .select("*")
            .eq("user_id", user_id)
            .eq("subject", subject)
            .eq("topic", topic)
        )

        if subtopic:
            query = query.eq("subtopic", subtopic)
        else:
            query = query.is_("subtopic", "null")

        result = query.execute()

        if result.data:
            # Update existing
            score = result.data[0]
            updates = {
                "total_attempts": score["total_attempts"] + 1,
                "last_practiced_at": datetime.now(timezone.utc).isoformat(),
            }

            if is_correct:
                updates["correct_attempts"] = score["correct_attempts"] + 1
                updates["current_streak"] = score["current_streak"] + 1
                if updates["current_streak"] > score["best_streak"]:
                    updates["best_streak"] = updates["current_streak"]
            else:
                updates["current_streak"] = 0

            # Update difficulty-specific counts
            if difficulty == "easy":
                updates["easy_attempts"] = score["easy_attempts"] + 1
                if is_correct:
                    updates["easy_correct"] = score["easy_correct"] + 1
            elif difficulty == "medium":
                updates["medium_attempts"] = score["medium_attempts"] + 1
                if is_correct:
                    updates["medium_correct"] = score["medium_correct"] + 1
            else:  # hard
                updates["hard_attempts"] = score["hard_attempts"] + 1
                if is_correct:
                    updates["hard_correct"] = score["hard_correct"] + 1

            # Update avg time (running average)
            if score["avg_time_seconds"]:
                total_time = (
                    score["avg_time_seconds"] * score["total_attempts"]
                )
                updates["avg_time_seconds"] = (total_time + time_taken) / (
                    score["total_attempts"] + 1
                )
            else:
                updates["avg_time_seconds"] = time_taken

            self.db.table("concept_scores").update(updates).eq(
                "id", score["id"]
            ).execute()
        else:
            # Create new record
            new_score = {
                "user_id": user_id,
                "subject": subject,
                "topic": topic,
                "subtopic": subtopic,
                "total_attempts": 1,
                "correct_attempts": 1 if is_correct else 0,
                "current_streak": 1 if is_correct else 0,
                "best_streak": 1 if is_correct else 0,
                "avg_time_seconds": time_taken,
                "last_practiced_at": datetime.now(timezone.utc).isoformat(),
            }

            # Set difficulty counts
            for diff in ["easy", "medium", "hard"]:
                new_score[f"{diff}_attempts"] = 1 if difficulty == diff else 0
                new_score[f"{diff}_correct"] = (
                    1 if difficulty == diff and is_correct else 0
                )

            self.db.table("concept_scores").insert(new_score).execute()

    # =========================================================================
    # Progress & History
    # =========================================================================

    async def get_concept_mastery(
        self, user_id: str, subject: Optional[str] = None
    ) -> List[ConceptMastery]:
        """Get user's concept mastery scores"""
        query = self.db.table("concept_scores").select("*").eq("user_id", user_id)

        if subject:
            query = query.eq("subject", subject)

        result = query.order("mastery_score", desc=True).execute()

        masteries = []
        for row in result.data:
            accuracy = (
                row["correct_attempts"] / row["total_attempts"] * 100
                if row["total_attempts"] > 0
                else 0
            )
            masteries.append(
                ConceptMastery(
                    subject=row["subject"],
                    topic=row["topic"],
                    subtopic=row.get("subtopic"),
                    display_name=f"{row['topic'].replace('_', ' ').title()}",
                    mastery_score=row["mastery_score"],
                    total_attempts=row["total_attempts"],
                    correct_attempts=row["correct_attempts"],
                    accuracy=round(accuracy, 1),
                    current_streak=row["current_streak"],
                    best_streak=row["best_streak"],
                    recommended_difficulty=DifficultyLevel(
                        row["recommended_difficulty"]
                    ),
                    last_practiced_at=row.get("last_practiced_at"),
                )
            )

        return masteries

    async def get_session_history(
        self, user_id: str, page: int = 1, page_size: int = 10
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get paginated session history"""
        offset = (page - 1) * page_size

        # Get total count
        count_result = (
            self.db.table("practice_sessions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .neq("status", SessionStatus.IN_PROGRESS.value)
            .execute()
        )
        total = count_result.count or 0

        # Get page
        result = (
            self.db.table("practice_sessions")
            .select("*")
            .eq("user_id", user_id)
            .neq("status", SessionStatus.IN_PROGRESS.value)
            .order("started_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        sessions = [
            {
                "session_id": s["id"],
                "subject": s["subject"],
                "topic": s.get("topic"),
                "score_percentage": s.get("score_percentage") or 0,
                "total_questions": s.get("total_questions") or 0,
                "correct_answers": s.get("correct_answers") or 0,
                "total_time_seconds": s.get("total_time_seconds") or 0,
                "started_at": s["started_at"],
                "status": s["status"],
            }
            for s in result.data
        ]

        return sessions, total

    # =========================================================================
    # Helper Methods
    # =========================================================================

    async def _get_session(
        self, session_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get session if it belongs to the user"""
        result = (
            self.db.table("practice_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None


def get_practice_service(db: Client) -> PracticeService:
    """Factory function for practice service"""
    return PracticeService(db)
