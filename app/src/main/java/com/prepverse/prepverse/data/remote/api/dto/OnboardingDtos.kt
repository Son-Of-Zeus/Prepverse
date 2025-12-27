package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Single answer for onboarding submission
 */
@JsonClass(generateAdapter = true)
data class OnboardingAnswer(
    @Json(name = "question_id")
    val questionId: String,

    @Json(name = "selected_answer")
    val selectedAnswer: String
)

/**
 * Complete onboarding submission with all 10 answers
 */
@JsonClass(generateAdapter = true)
data class OnboardingSubmission(
    @Json(name = "answers")
    val answers: List<OnboardingAnswer>
)

/**
 * Result for a single question after evaluation
 */
@JsonClass(generateAdapter = true)
data class OnboardingResult(
    @Json(name = "question_id")
    val questionId: String,

    @Json(name = "question")
    val question: String,

    @Json(name = "selected_answer")
    val selectedAnswer: String,

    @Json(name = "correct_answer")
    val correctAnswer: String,

    @Json(name = "is_correct")
    val isCorrect: Boolean,

    @Json(name = "explanation")
    val explanation: String,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String
)

/**
 * Complete onboarding evaluation response
 */
@JsonClass(generateAdapter = true)
data class OnboardingResponse(
    @Json(name = "total_questions")
    val totalQuestions: Int,

    @Json(name = "correct_answers")
    val correctAnswers: Int,

    @Json(name = "score_percentage")
    val scorePercentage: Float,

    @Json(name = "results")
    val results: List<OnboardingResult>,

    @Json(name = "weak_topics")
    val weakTopics: List<String>,

    @Json(name = "strong_topics")
    val strongTopics: List<String>,

    @Json(name = "recommendations")
    val recommendations: String
)

/**
 * User's onboarding status
 */
@JsonClass(generateAdapter = true)
data class OnboardingStatusResponse(
    @Json(name = "completed")
    val completed: Boolean,

    @Json(name = "score")
    val score: Float? = null,

    @Json(name = "completed_at")
    val completedAt: String? = null,

    @Json(name = "weak_topics")
    val weakTopics: List<String> = emptyList(),

    @Json(name = "strong_topics")
    val strongTopics: List<String> = emptyList()
)
