package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Question response without correct answer (for assessments)
 */
@JsonClass(generateAdapter = true)
data class QuestionResponse(
    @Json(name = "id")
    val id: String,

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

/**
 * Question with answer and explanation (after submission)
 */
@JsonClass(generateAdapter = true)
data class QuestionWithAnswer(
    @Json(name = "id")
    val id: String,

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
    val timeEstimateSeconds: Int,

    @Json(name = "correct_answer")
    val correctAnswer: String,

    @Json(name = "explanation")
    val explanation: String,

    @Json(name = "user_answer")
    val userAnswer: String? = null,

    @Json(name = "is_correct")
    val isCorrect: Boolean? = null
)

/**
 * Request to generate questions with Gemini AI
 */
@JsonClass(generateAdapter = true)
data class GenerateQuestionsRequest(
    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "difficulty")
    val difficulty: String = "medium",

    @Json(name = "class_level")
    val classLevel: Int,

    @Json(name = "count")
    val count: Int = 5
)

/**
 * Response from question generation
 */
@JsonClass(generateAdapter = true)
data class GenerateQuestionsResponse(
    @Json(name = "questions")
    val questions: List<GeneratedQuestion>,

    @Json(name = "count")
    val count: Int,

    @Json(name = "source")
    val source: String = "gemini"
)

/**
 * Generated question from AI
 */
@JsonClass(generateAdapter = true)
data class GeneratedQuestion(
    @Json(name = "question")
    val question: String,

    @Json(name = "options")
    val options: List<String>,

    @Json(name = "correct_answer")
    val correctAnswer: String,

    @Json(name = "explanation")
    val explanation: String,

    @Json(name = "subject")
    val subject: String,

    @Json(name = "topic")
    val topic: String,

    @Json(name = "subtopic")
    val subtopic: String? = null,

    @Json(name = "difficulty")
    val difficulty: String,

    @Json(name = "class_level")
    val classLevel: Int,

    @Json(name = "question_type")
    val questionType: String = "mcq",

    @Json(name = "time_estimate_seconds")
    val timeEstimateSeconds: Int = 60,

    @Json(name = "concept_tags")
    val conceptTags: List<String> = emptyList()
)
