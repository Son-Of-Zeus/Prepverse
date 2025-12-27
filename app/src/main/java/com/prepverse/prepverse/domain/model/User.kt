package com.prepverse.prepverse.domain.model

data class User(
    val id: String,
    val auth0Id: String,
    val email: String,
    val name: String?,
    val pictureUrl: String?,
    val studentClass: Int?, // 10 or 12
    val onboardingCompleted: Boolean = false
)

data class UserProfile(
    val userId: String,
    val strengths: List<String> = emptyList(),
    val weaknesses: List<String> = emptyList(),
    val preferredSubjects: List<String> = emptyList(),
    val dailyGoalMinutes: Int = 30,
    val notificationEnabled: Boolean = true
)
