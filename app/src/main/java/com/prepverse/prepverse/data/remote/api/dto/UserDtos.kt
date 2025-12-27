package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * User profile response from /api/v1/auth/me
 */
@JsonClass(generateAdapter = true)
data class UserProfileResponse(
    @Json(name = "id")
    val id: String,

    @Json(name = "email")
    val email: String,

    @Json(name = "full_name")
    val fullName: String?,

    @Json(name = "class_level")
    val classLevel: Int,

    @Json(name = "onboarding_completed")
    val onboardingCompleted: Boolean,

    @Json(name = "total_questions_attempted")
    val totalQuestionsAttempted: Int = 0,

    @Json(name = "correct_answers")
    val correctAnswers: Int = 0,

    @Json(name = "accuracy")
    val accuracy: Float = 0f,

    @Json(name = "created_at")
    val createdAt: String
)
