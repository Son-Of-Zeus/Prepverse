package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// =============================================================================
// Topics
// =============================================================================

@JsonClass(generateAdapter = true)
data class TopicInfo(
    @Json(name = "id")
    val id: String,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "display_name")
    val displayName: String,

    @Json(name = "description")
    val description: String? = null,

    @Json(name = "subtopics")
    val subtopics: List<String> = emptyList(),

    @Json(name = "icon")
    val icon: String? = null,

    @Json(name = "question_count")
    val questionCount: Int = 0
)

@JsonClass(generateAdapter = true)
data class TopicsResponse(
    @Json(name = "class_level")
    val classLevel: Int,

    @Json(name = "subjects")
    val subjects: List<String>,

    @Json(name = "topics")
    val topics: List<TopicInfo>
)

// =============================================================================
// Session Management
// =============================================================================

@JsonClass(generateAdapter = true)
data class StartSessionRequest(
    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String? = null,

    @Json(name = "difficulty")
    val difficulty: String? = null, // "easy", "medium", "hard", or null for adaptive

    @Json(name = "question_count")
    val questionCount: Int = 10,

    @Json(name = "time_limit_seconds")
    val timeLimitSeconds: Int? = null
)

@JsonClass(generateAdapter = true)
data class StartSessionResponse(
    @Json(name = "session_id")
    val sessionId: String,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String? = null,

    @Json(name = "difficulty")
    val difficulty: String? = null,

    @Json(name = "question_count")
    val questionCount: Int,

    @Json(name = "time_limit_seconds")
    val timeLimitSeconds: Int? = null,

    @Json(name = "started_at")
    val startedAt: String
)

// =============================================================================
// Questions
// =============================================================================

@JsonClass(generateAdapter = true)
data class SessionQuestion(
    @Json(name = "id")
    val id: String,

    @Json(name = "question_order")
    val questionOrder: Int,

    @Json(name = "question")
    val question: String,

    @Json(name = "options")
    val options: List<String>,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "difficulty")
    val difficulty: String,

    @Json(name = "time_estimate_seconds")
    val timeEstimateSeconds: Int
)

@JsonClass(generateAdapter = true)
data class NextQuestionResponse(
    @Json(name = "session_id")
    val sessionId: String,

    @Json(name = "question")
    val question: SessionQuestion,

    @Json(name = "current_question_number")
    val currentQuestionNumber: Int,

    @Json(name = "total_questions")
    val totalQuestions: Int,

    @Json(name = "time_remaining_seconds")
    val timeRemainingSeconds: Int? = null,

    @Json(name = "session_elapsed_seconds")
    val sessionElapsedSeconds: Int
)

// =============================================================================
// Answer Submission
// =============================================================================

@JsonClass(generateAdapter = true)
data class SubmitAnswerRequest(
    @Json(name = "answer")
    val answer: String,

    @Json(name = "time_taken_seconds")
    val timeTakenSeconds: Int
)

@JsonClass(generateAdapter = true)
data class SubmitAnswerResponse(
    @Json(name = "is_correct")
    val isCorrect: Boolean,

    @Json(name = "correct_answer")
    val correctAnswer: String,

    @Json(name = "explanation")
    val explanation: String,

    @Json(name = "time_taken_seconds")
    val timeTakenSeconds: Int,

    @Json(name = "points_earned")
    val pointsEarned: Int = 0,

    @Json(name = "questions_answered")
    val questionsAnswered: Int,

    @Json(name = "questions_remaining")
    val questionsRemaining: Int,

    @Json(name = "current_score")
    val currentScore: Int,

    @Json(name = "current_accuracy")
    val currentAccuracy: Float
)

// =============================================================================
// Session End & Review
// =============================================================================

@JsonClass(generateAdapter = true)
data class EndSessionRequest(
    @Json(name = "reason")
    val reason: String? = null
)

@JsonClass(generateAdapter = true)
data class QuestionReview(
    @Json(name = "question_order")
    val questionOrder: Int,

    @Json(name = "question")
    val question: String,

    @Json(name = "options")
    val options: List<String>,

    @Json(name = "correct_answer")
    val correctAnswer: String,

    @Json(name = "user_answer")
    val userAnswer: String? = null,

    @Json(name = "is_correct")
    val isCorrect: Boolean? = null,

    @Json(name = "explanation")
    val explanation: String,

    @Json(name = "time_taken_seconds")
    val timeTakenSeconds: Int? = null,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "difficulty")
    val difficulty: String
)

@JsonClass(generateAdapter = true)
data class SessionSummary(
    @Json(name = "session_id")
    val sessionId: String,

    @Json(name = "status")
    val status: String, // "completed", "abandoned"

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String? = null,

    @Json(name = "total_questions")
    val totalQuestions: Int,

    @Json(name = "correct_answers")
    val correctAnswers: Int,

    @Json(name = "wrong_answers")
    val wrongAnswers: Int,

    @Json(name = "skipped")
    val skipped: Int,

    @Json(name = "score_percentage")
    val scorePercentage: Float,

    @Json(name = "total_time_seconds")
    val totalTimeSeconds: Int,

    @Json(name = "avg_time_per_question")
    val avgTimePerQuestion: Float,

    @Json(name = "time_limit_seconds")
    val timeLimitSeconds: Int? = null,

    @Json(name = "easy_correct")
    val easyCorrect: Int = 0,

    @Json(name = "easy_total")
    val easyTotal: Int = 0,

    @Json(name = "medium_correct")
    val mediumCorrect: Int = 0,

    @Json(name = "medium_total")
    val mediumTotal: Int = 0,

    @Json(name = "hard_correct")
    val hardCorrect: Int = 0,

    @Json(name = "hard_total")
    val hardTotal: Int = 0,

    @Json(name = "weak_topics")
    val weakTopics: List<String> = emptyList(),

    @Json(name = "strong_topics")
    val strongTopics: List<String> = emptyList(),

    @Json(name = "started_at")
    val startedAt: String,

    @Json(name = "ended_at")
    val endedAt: String
)

@JsonClass(generateAdapter = true)
data class EndSessionResponse(
    @Json(name = "summary")
    val summary: SessionSummary,

    @Json(name = "questions_review")
    val questionsReview: List<QuestionReview>
)

// =============================================================================
// Progress
// =============================================================================

@JsonClass(generateAdapter = true)
data class ConceptMastery(
    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "subtopic")
    val subtopic: String? = null,

    @Json(name = "display_name")
    val displayName: String,

    @Json(name = "mastery_score")
    val masteryScore: Float,

    @Json(name = "total_attempts")
    val totalAttempts: Int,

    @Json(name = "correct_attempts")
    val correctAttempts: Int,

    @Json(name = "accuracy")
    val accuracy: Float,

    @Json(name = "current_streak")
    val currentStreak: Int,

    @Json(name = "best_streak")
    val bestStreak: Int,

    @Json(name = "recommended_difficulty")
    val recommendedDifficulty: String,

    @Json(name = "last_practiced_at")
    val lastPracticedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class ConceptProgressResponse(
    @Json(name = "user_id")
    val userId: String,

    @Json(name = "concepts")
    val concepts: List<ConceptMastery>,

    @Json(name = "total_concepts")
    val totalConcepts: Int
)

@JsonClass(generateAdapter = true)
data class ProgressSummaryResponse(
    @Json(name = "user_id")
    val userId: String,

    @Json(name = "class_level")
    val classLevel: Int,

    @Json(name = "total_sessions")
    val totalSessions: Int,

    @Json(name = "total_questions_attempted")
    val totalQuestionsAttempted: Int,

    @Json(name = "overall_accuracy")
    val overallAccuracy: Float,

    @Json(name = "total_study_time_minutes")
    val totalStudyTimeMinutes: Int,

    @Json(name = "subject_scores")
    val subjectScores: Map<String, Float>,

    @Json(name = "weak_areas")
    val weakAreas: List<String>,

    @Json(name = "continue_learning")
    val continueLearning: List<TopicInfo> = emptyList(),

    @Json(name = "suggested_topics")
    val suggestedTopics: List<TopicInfo>
)

// =============================================================================
// History
// =============================================================================

@JsonClass(generateAdapter = true)
data class SessionHistoryItem(
    @Json(name = "session_id")
    val sessionId: String,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String? = null,

    @Json(name = "score_percentage")
    val scorePercentage: Float,

    @Json(name = "total_questions")
    val totalQuestions: Int,

    @Json(name = "correct_answers")
    val correctAnswers: Int,

    @Json(name = "total_time_seconds")
    val totalTimeSeconds: Int,

    @Json(name = "started_at")
    val startedAt: String,

    @Json(name = "status")
    val status: String
)

@JsonClass(generateAdapter = true)
data class SessionHistoryResponse(
    @Json(name = "sessions")
    val sessions: List<SessionHistoryItem>,

    @Json(name = "total_count")
    val totalCount: Int,

    @Json(name = "page")
    val page: Int,

    @Json(name = "page_size")
    val pageSize: Int
)
