package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Dashboard response from /api/v1/dashboard
 */
@JsonClass(generateAdapter = true)
data class DashboardResponse(
    @Json(name = "performance_summary")
    val performanceSummary: PerformanceSummary,
    
    @Json(name = "suggested_topics")
    val suggestedTopics: List<SuggestedTopic>,
    
    @Json(name = "streak_info")
    val streakInfo: StreakInfo,
    
    @Json(name = "daily_xp")
    val dailyXP: Int
)

/**
 * Performance summary with recent scores
 */
@JsonClass(generateAdapter = true)
data class PerformanceSummary(
    @Json(name = "recent_scores")
    val recentScores: List<RecentScore>,
    
    @Json(name = "overall_accuracy")
    val overallAccuracy: Float,
    
    @Json(name = "total_questions")
    val totalQuestions: Int,
    
    @Json(name = "correct_answers")
    val correctAnswers: Int
)

/**
 * Recent score entry
 */
@JsonClass(generateAdapter = true)
data class RecentScore(
    @Json(name = "date")
    val date: String,
    
    @Json(name = "score")
    val score: Float, // percentage
    
    @Json(name = "subject")
    val subject: String?,
    
    @Json(name = "topic")
    val topic: String?,
    
    @Json(name = "attempts")
    val attempts: Int
)

/**
 * Suggested topic based on weaknesses
 */
@JsonClass(generateAdapter = true)
data class SuggestedTopic(
    @Json(name = "subject")
    val subject: String,
    
    @Json(name = "topic")
    val topic: String,
    
    @Json(name = "progress")
    val progress: Float, // 0.0 to 1.0
    
    @Json(name = "mastery_level")
    val masteryLevel: String, // "beginner", "learning", "proficient", "mastered"
    
    @Json(name = "accuracy")
    val accuracy: Float
)

/**
 * Streak information
 */
@JsonClass(generateAdapter = true)
data class StreakInfo(
    @Json(name = "current_streak")
    val currentStreak: Int,
    
    @Json(name = "longest_streak")
    val longestStreak: Int,
    
    @Json(name = "total_xp")
    val totalXP: Int
)

