package com.prepverse.prepverse.domain.model

/**
 * Domain models for Dashboard
 */
data class DashboardData(
    val performanceSummary: PerformanceSummary,
    val suggestedTopics: List<SuggestedTopic>,
    val streakInfo: StreakInfo,
    val dailyXP: Int
)

data class PerformanceSummary(
    val recentScores: List<RecentScore>,
    val overallAccuracy: Float,
    val totalQuestions: Int,
    val correctAnswers: Int
)

data class RecentScore(
    val date: String,
    val score: Float, // percentage
    val subject: String?,
    val topic: String?,
    val attempts: Int
)

data class SuggestedTopic(
    val subject: String,
    val topic: String,
    val progress: Float, // 0.0 to 1.0
    val masteryLevel: MasteryLevel,
    val accuracy: Float
)

enum class MasteryLevel {
    BEGINNER,
    LEARNING,
    PROFICIENT,
    MASTERED;
    
    companion object {
        fun fromString(value: String): MasteryLevel {
            return when (value.lowercase()) {
                "beginner" -> BEGINNER
                "learning" -> LEARNING
                "proficient" -> PROFICIENT
                "mastered" -> MASTERED
                else -> BEGINNER
            }
        }
    }
}

data class StreakInfo(
    val currentStreak: Int,
    val longestStreak: Int,
    val totalXP: Int
)

