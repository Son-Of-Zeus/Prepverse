"""
Dashboard endpoints for user statistics and recommendations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List

from app.core.security import get_current_user_flexible
from app.db.session import get_db
from supabase import Client
from fastapi import Request
from app.schemas.dashboard import (
    DashboardResponse,
    PerformanceSummary,
    RecentScore,
    SuggestedTopic,
    StreakInfo
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    request: Request,
    current_user: dict = Depends(get_current_user_flexible),
    db: Client = Depends(get_db)
):
    """
    Get dashboard data including:
    - Performance summary with recent scores
    - Suggested topics based on weaknesses
    - Streak information and daily XP
    """
    try:
        db_id = current_user.get("db_id")
        user_id = current_user.get("user_id")
        
        # Get user from database
        if db_id:
            user_result = db.table("users").select("*").eq("id", db_id).execute()
        else:
            user_result = db.table("users").select("*").eq("auth0_id", user_id).execute()
        
        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = user_result.data[0]
        db_user_id = user_data["id"]
        
        # Get user attempts for performance summary
        attempts_result = (
            db.table("user_attempts")
            .select("*")
            .eq("user_id", db_user_id)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        
        attempts = attempts_result.data if attempts_result.data else []
        
        # Calculate overall stats
        total_questions = len(attempts)
        correct_answers = sum(1 for a in attempts if a.get("is_correct", False))
        overall_accuracy = (correct_answers / total_questions * 100) if total_questions > 0 else 0.0
        
        # Get recent scores (last 7 days, grouped by day)
        recent_scores = _calculate_recent_scores(attempts)
        
        # Get suggested topics based on weaknesses
        suggested_topics = _get_suggested_topics(db, db_user_id, attempts)
        
        # Get streak and XP info
        streak_info = _calculate_streak_info(db, db_user_id)
        daily_xp = _calculate_daily_xp(attempts)
        
        return DashboardResponse(
            performance_summary=PerformanceSummary(
                recent_scores=recent_scores,
                overall_accuracy=round(overall_accuracy, 2),
                total_questions=total_questions,
                correct_answers=correct_answers
            ),
            suggested_topics=suggested_topics,
            streak_info=streak_info,
            daily_xp=daily_xp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )


def _calculate_recent_scores(attempts: List[dict]) -> List[RecentScore]:
    """Calculate recent scores grouped by date"""
    from collections import defaultdict
    
    if not attempts:
        return []
    
    # Group attempts by date
    scores_by_date = defaultdict(lambda: {"correct": 0, "total": 0, "subjects": set(), "topics": set()})
    
    for attempt in attempts:
        created_at = attempt.get("created_at")
        if not created_at:
            continue
            
        try:
            # Parse date (assuming ISO format)
            if isinstance(created_at, str):
                date_str = created_at.split("T")[0] if "T" in created_at else created_at.split(" ")[0]
            else:
                # If it's already a datetime object, convert to string first
                date_str = str(created_at).split("T")[0] if "T" in str(created_at) else str(created_at).split(" ")[0]
            
            is_correct = attempt.get("is_correct", False)
            subject = attempt.get("subject")
            topic = attempt.get("topic")
            
            scores_by_date[date_str]["total"] += 1
            if is_correct:
                scores_by_date[date_str]["correct"] += 1
            if subject:
                scores_by_date[date_str]["subjects"].add(subject)
            if topic:
                scores_by_date[date_str]["topics"].add(topic)
        except Exception as e:
            print(f"Error parsing date: {e}, created_at: {created_at}")
            continue
    
    # Convert to RecentScore objects (last 7 days)
    recent_scores = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        if date in scores_by_date:
            data = scores_by_date[date]
            score_pct = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
            recent_scores.append(RecentScore(
                date=date,
                score=round(score_pct, 2),
                subject=list(data["subjects"])[0] if data["subjects"] else None,
                topic=list(data["topics"])[0] if data["topics"] else None,
                attempts=data["total"]
            ))
    
    return sorted(recent_scores, key=lambda x: x.date, reverse=True)[:5]


def _get_suggested_topics(db: Client, user_id: str, attempts: List[dict]) -> List[SuggestedTopic]:
    """Get suggested topics based on weaknesses"""
    from collections import defaultdict
    
    # Calculate accuracy per topic
    topic_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    
    for attempt in attempts:
        subject = attempt.get("subject")
        topic = attempt.get("topic")
        if not subject or not topic:
            continue
            
        key = f"{subject}:{topic}"
        topic_stats[key]["total"] += 1
        if attempt.get("is_correct", False):
            topic_stats[key]["correct"] += 1
    
    # Find weak topics (accuracy < 70%)
    weak_topics = []
    for key, stats in topic_stats.items():
        if stats["total"] < 3:  # Need at least 3 attempts
            continue
            
        accuracy = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        if accuracy < 70:
            subject, topic = key.split(":", 1)
            progress = min(stats["total"] / 20.0, 1.0)  # Progress based on attempts
            
            # Determine mastery level
            if accuracy < 40:
                mastery = "beginner"
            elif accuracy < 60:
                mastery = "learning"
            elif accuracy < 80:
                mastery = "proficient"
            else:
                mastery = "mastered"
            
            weak_topics.append(SuggestedTopic(
                subject=subject,
                topic=topic,
                progress=round(progress, 2),
                mastery_level=mastery,
                accuracy=round(accuracy, 2)
            ))
    
    # Sort by accuracy (lowest first - weakest topics)
    weak_topics.sort(key=lambda x: x.accuracy)

    return weak_topics[:5]  # Return top 5 (empty list if no weak topics)


def _calculate_streak_info(db: Client, user_id: str) -> StreakInfo:
    """Calculate user's streak information"""
    # Get study sessions or attempts to determine streak
    # For now, use a simple calculation based on recent activity
    attempts_result = (
        db.table("user_attempts")
        .select("created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )
    
    attempts = attempts_result.data if attempts_result.data else []
    
    # Calculate current streak (consecutive days with activity)
    current_streak = 0
    longest_streak = 0
    dates_with_activity = set()
    
    for attempt in attempts:
        created_at = attempt.get("created_at")
        if created_at:
            try:
                if isinstance(created_at, str):
                    date_str = created_at.split("T")[0] if "T" in created_at else created_at.split(" ")[0]
                else:
                    date_str = str(created_at).split("T")[0] if "T" in str(created_at) else str(created_at).split(" ")[0]
                dates_with_activity.add(date_str)
            except Exception:
                continue
    
    # Calculate current streak (consecutive days from today)
    today = datetime.now().date()
    for i in range(30):
        check_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        if check_date in dates_with_activity:
            current_streak += 1
        else:
            break

    # Calculate longest streak (scan all dates for longest consecutive run)
    if dates_with_activity:
        sorted_dates = sorted(dates_with_activity)
        temp_streak = 1
        for i in range(1, len(sorted_dates)):
            prev_date = datetime.strptime(sorted_dates[i-1], "%Y-%m-%d").date()
            curr_date = datetime.strptime(sorted_dates[i], "%Y-%m-%d").date()
            if (curr_date - prev_date).days == 1:
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak, current_streak)
    
    # Calculate total XP (10 XP per correct answer, 5 per attempt)
    total_xp = sum(
        10 if a.get("is_correct", False) else 5
        for a in attempts
    )
    
    return StreakInfo(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_xp=total_xp
    )


def _calculate_daily_xp(attempts: List[dict]) -> int:
    """Calculate XP earned today"""
    today = datetime.now().date().strftime("%Y-%m-%d")
    
    today_attempts = []
    for a in attempts:
        created_at = a.get("created_at", "")
        if not created_at:
            continue
        try:
            # Parse date
            if isinstance(created_at, str):
                date_str = created_at.split("T")[0] if "T" in created_at else created_at.split(" ")[0]
            else:
                date_str = str(created_at).split("T")[0] if "T" in str(created_at) else str(created_at).split(" ")[0]
            
            if date_str == today:
                today_attempts.append(a)
        except Exception:
            continue
    
    return sum(
        10 if a.get("is_correct", False) else 5
        for a in today_attempts
    )

