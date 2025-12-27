package com.prepverse.prepverse.domain.model

data class User(
    val id: String,
    val auth0Id: String,
    val email: String,
    val name: String?,
    val pictureUrl: String?,
    val studentClass: Int?, // 10 or 12
    val onboardingCompleted: Boolean = false,
    val schoolId: String? = null
)

data class UserProfile(
    val userId: String,
    val strengths: List<String> = emptyList(),
    val weaknesses: List<String> = emptyList(),
    val preferredSubjects: List<String> = emptyList(),
    val dailyGoalMinutes: Int = 30,
    val notificationEnabled: Boolean = true
)

/**
 * School model for CBSE affiliated schools
 * Data source: https://github.com/deedy/cbse_schools_data
 */
data class School(
    val id: String,
    val affiliationCode: String,
    val name: String,
    val state: String?,
    val district: String?,
    val displayName: String? = null
) {
    /**
     * Get formatted display name for UI
     */
    fun getFormattedName(): String {
        return displayName ?: buildString {
            append(name)
            val locationParts = listOfNotNull(district, state).filter { it.isNotBlank() }
            if (locationParts.isNotEmpty()) {
                append(" (")
                append(locationParts.joinToString(", "))
                append(")")
            }
        }
    }
}
