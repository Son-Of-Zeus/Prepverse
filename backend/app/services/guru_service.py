"""
Guru Mode Service

Handles the business logic for "Teach AI" feature:
- Session creation and management
- Chat processing with AI student
- Session grading and XP calculation
- Session history retrieval
"""
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
from supabase import Client

from app.core.gemini import gemini_client
from app.schemas.guru import (
    GuruSessionCreate,
    GuruSessionResponse,
    GuruChatResponse,
    GuruReportCard,
    GuruEndSessionResponse,
    GuruSessionSummary,
    GuruHistoryResponse,
    GuruSessionDetailResponse,
    ChatMessage,
)


class GuruService:
    """Service for managing Guru Mode teaching sessions"""

    def __init__(self, db: Client):
        self.db = db
        # Base XP for completing a session
        self.BASE_XP = 50
        # XP multiplier per score point
        self.XP_PER_POINT = 2

    # =========================================================================
    # Session Management
    # =========================================================================

    async def start_session(
        self,
        user_id: str,
        request: GuruSessionCreate
    ) -> GuruSessionResponse:
        """
        Start a new Guru Mode teaching session.
        
        1. Generate ground truth from Gemini (hidden from user)
        2. Create session in database
        3. Generate initial AI student message
        
        Args:
            user_id: The user's database ID
            request: Session creation request with topic, subject, persona
            
        Returns:
            GuruSessionResponse with session details and initial message
        """
        # 1. Generate ground truth (hidden context for AI)
        ground_truth = await gemini_client.generate_ground_truth(
            topic=request.topic,
            subject=request.subject
        )
        
        # 2. Generate initial curious message from AI student
        initial_message = await gemini_client.generate_initial_student_message(
            topic=request.topic,
            subject=request.subject,
            persona=request.persona.value if request.persona else "peer"
        )
        
        # 3. Prepare initial messages array
        initial_messages = [
            {"role": "model", "content": initial_message}
        ]
        
        # 4. Create session in database
        session_data = {
            "user_id": user_id,
            "subject": request.subject,
            "topic": request.topic,
            "target_persona": request.persona.value if request.persona else "peer",
            "status": "active",
            "messages": json.dumps(initial_messages),
            "ground_truth": ground_truth,
        }
        
        result = self.db.table("guru_sessions").insert(session_data).execute()
        
        if not result.data:
            raise Exception("Failed to create Guru session")
        
        session = result.data[0]
        
        return GuruSessionResponse(
            session_id=str(session["id"]),
            topic=session["topic"],
            subject=session["subject"],
            persona=session["target_persona"],
            initial_message=initial_message,
            created_at=session["created_at"]
        )

    async def process_chat(
        self,
        session_id: str,
        user_id: str,
        user_message: str
    ) -> GuruChatResponse:
        """
        Process a chat message from the user (teacher).
        
        1. Fetch session and validate ownership
        2. Append user message to history
        3. Generate AI student response
        4. Update session with new messages
        
        Args:
            session_id: UUID of the session
            user_id: User's database ID (for validation)
            user_message: The user's teaching message
            
        Returns:
            GuruChatResponse with AI response and confusion level
        """
        # 1. Fetch session
        result = self.db.table("guru_sessions").select("*").eq(
            "id", session_id
        ).eq("user_id", user_id).eq("status", "active").execute()
        
        if not result.data:
            raise Exception("Session not found or not active")
        
        session = result.data[0]
        
        # 2. Parse current messages
        messages = json.loads(session["messages"]) if isinstance(session["messages"], str) else session["messages"]
        
        # 3. Append user message
        messages.append({"role": "user", "content": user_message})
        
        # 4. Generate AI response
        ai_response = await gemini_client.generate_student_response(
            history=messages,
            ground_truth=session["ground_truth"],
            topic=session["topic"],
            subject=session["subject"],
            persona=session["target_persona"]
        )
        
        # 5. Append AI response
        messages.append({"role": "model", "content": ai_response["message"]})
        
        # 6. Update session
        self.db.table("guru_sessions").update({
            "messages": json.dumps(messages),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        
        # 7. If satisfied, auto-trigger session end
        if ai_response.get("is_satisfied", False):
            # Don't await here - let the frontend handle the end call
            pass
        
        return GuruChatResponse(
            message=ai_response["message"],
            confusion_level=ai_response.get("confusion_level", 50),
            is_satisfied=ai_response.get("is_satisfied", False),
            hints=ai_response.get("hints")
        )

    async def end_session(
        self,
        session_id: str,
        user_id: str
    ) -> GuruEndSessionResponse:
        """
        End a Guru session and generate the report card.
        
        1. Fetch session
        2. Grade the teaching session
        3. Calculate XP
        4. Update user XP
        5. Mark session as completed
        
        Args:
            session_id: UUID of the session
            user_id: User's database ID
            
        Returns:
            GuruEndSessionResponse with report card and XP
        """
        # 1. Fetch session
        result = self.db.table("guru_sessions").select("*").eq(
            "id", session_id
        ).eq("user_id", user_id).execute()
        
        if not result.data:
            raise Exception("Session not found")
        
        session = result.data[0]
        
        # If already completed, return existing report
        if session["status"] == "completed" and session.get("score_report"):
            report = json.loads(session["score_report"]) if isinstance(session["score_report"], str) else session["score_report"]
            messages = json.loads(session["messages"]) if isinstance(session["messages"], str) else session["messages"]
            
            created_at = datetime.fromisoformat(session["created_at"].replace('Z', '+00:00'))
            updated_at = datetime.fromisoformat(session["updated_at"].replace('Z', '+00:00'))
            duration = int((updated_at - created_at).total_seconds())
            
            return GuruEndSessionResponse(
                session_id=str(session["id"]),
                status="completed",
                report_card=GuruReportCard(**report, xp_earned=session.get("xp_earned", 0)),
                total_messages=len(messages),
                session_duration_seconds=duration
            )
        
        # 2. Parse messages
        messages = json.loads(session["messages"]) if isinstance(session["messages"], str) else session["messages"]
        
        # 3. Grade the session
        grading_result = await gemini_client.grade_teaching_session(
            history=messages,
            topic=session["topic"],
            subject=session["subject"],
            ground_truth=session["ground_truth"]
        )
        
        # 4. Calculate XP
        accuracy = grading_result.get("accuracy_score", 5)
        simplicity = grading_result.get("simplicity_score", 5)
        xp_earned = self.BASE_XP + (accuracy + simplicity) * self.XP_PER_POINT
        
        # 5. Update user XP
        try:
            user_result = self.db.table("users").select("xp").eq("id", user_id).execute()
            if user_result.data:
                current_xp = user_result.data[0].get("xp", 0) or 0
                self.db.table("users").update({
                    "xp": current_xp + xp_earned
                }).eq("id", user_id).execute()
        except Exception as e:
            print(f"Warning: Could not update user XP: {e}")
        
        # 6. Build score report
        score_report = {
            "accuracy_score": accuracy,
            "simplicity_score": simplicity,
            "feedback": grading_result.get("feedback", ""),
            "strengths": grading_result.get("strengths", []),
            "improvements": grading_result.get("improvements", [])
        }
        
        # 7. Update session
        self.db.table("guru_sessions").update({
            "status": "completed",
            "score_report": json.dumps(score_report),
            "xp_earned": xp_earned,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        
        # Calculate duration
        created_at = datetime.fromisoformat(session["created_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        duration = int((now - created_at).total_seconds())
        
        return GuruEndSessionResponse(
            session_id=str(session["id"]),
            status="completed",
            report_card=GuruReportCard(
                **score_report,
                xp_earned=xp_earned
            ),
            total_messages=len(messages),
            session_duration_seconds=duration
        )

    async def abandon_session(
        self,
        session_id: str,
        user_id: str
    ) -> bool:
        """
        Abandon a session without grading.
        
        Args:
            session_id: UUID of the session
            user_id: User's database ID
            
        Returns:
            True if successful
        """
        result = self.db.table("guru_sessions").update({
            "status": "abandoned",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).eq("user_id", user_id).eq("status", "active").execute()
        
        return bool(result.data)

    # =========================================================================
    # History & Stats
    # =========================================================================

    async def get_session_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> GuruHistoryResponse:
        """
        Get user's Guru session history.
        
        Args:
            user_id: User's database ID
            limit: Max sessions to return
            offset: Pagination offset
            
        Returns:
            GuruHistoryResponse with session list and stats
        """
        # Fetch sessions
        result = self.db.table("guru_sessions").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        sessions = []
        total_xp = 0
        accuracy_scores = []
        simplicity_scores = []
        
        for row in result.data:
            messages = json.loads(row["messages"]) if isinstance(row["messages"], str) else row["messages"]
            
            accuracy = None
            simplicity = None
            if row.get("score_report"):
                report = json.loads(row["score_report"]) if isinstance(row["score_report"], str) else row["score_report"]
                accuracy = report.get("accuracy_score")
                simplicity = report.get("simplicity_score")
                if accuracy is not None:
                    accuracy_scores.append(accuracy)
                if simplicity is not None:
                    simplicity_scores.append(simplicity)
            
            xp = row.get("xp_earned", 0) or 0
            total_xp += xp
            
            sessions.append(GuruSessionSummary(
                session_id=str(row["id"]),
                subject=row["subject"],
                topic=row["topic"],
                persona=row["target_persona"],
                status=row["status"],
                accuracy_score=accuracy,
                simplicity_score=simplicity,
                xp_earned=xp,
                created_at=row["created_at"],
                message_count=len(messages)
            ))
        
        # Get total count
        count_result = self.db.table("guru_sessions").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()
        total_count = count_result.count if count_result.count else len(sessions)
        
        return GuruHistoryResponse(
            sessions=sessions,
            total_sessions=total_count,
            total_xp_earned=total_xp,
            average_accuracy=sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else None,
            average_simplicity=sum(simplicity_scores) / len(simplicity_scores) if simplicity_scores else None
        )

    async def get_session_detail(
        self,
        session_id: str,
        user_id: str
    ) -> GuruSessionDetailResponse:
        """
        Get detailed view of a single session.
        
        Args:
            session_id: UUID of the session
            user_id: User's database ID
            
        Returns:
            GuruSessionDetailResponse with full messages and report
        """
        result = self.db.table("guru_sessions").select("*").eq(
            "id", session_id
        ).eq("user_id", user_id).execute()
        
        if not result.data:
            raise Exception("Session not found")
        
        session = result.data[0]
        
        messages = json.loads(session["messages"]) if isinstance(session["messages"], str) else session["messages"]
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        
        report_card = None
        if session.get("score_report"):
            report = json.loads(session["score_report"]) if isinstance(session["score_report"], str) else session["score_report"]
            report_card = GuruReportCard(
                **report,
                xp_earned=session.get("xp_earned", 0)
            )
        
        return GuruSessionDetailResponse(
            session_id=str(session["id"]),
            subject=session["subject"],
            topic=session["topic"],
            persona=session["target_persona"],
            status=session["status"],
            messages=chat_messages,
            report_card=report_card,
            xp_earned=session.get("xp_earned", 0),
            created_at=session["created_at"],
            updated_at=session["updated_at"]
        )

    async def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Check if user has an active Guru session.
        
        Args:
            user_id: User's database ID
            
        Returns:
            Active session data or None
        """
        result = self.db.table("guru_sessions").select("*").eq(
            "user_id", user_id
        ).eq("status", "active").execute()
        
        if result.data:
            return result.data[0]
        return None


# Factory function for dependency injection
def get_guru_service(db: Client) -> GuruService:
    """Create GuruService instance with database client"""
    return GuruService(db)
