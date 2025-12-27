package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.DashboardResponse
import com.prepverse.prepverse.domain.model.DashboardData
import com.prepverse.prepverse.domain.model.MasteryLevel
import com.prepverse.prepverse.domain.model.PerformanceSummary
import com.prepverse.prepverse.domain.model.RecentScore
import com.prepverse.prepverse.domain.model.StreakInfo
import com.prepverse.prepverse.domain.model.SuggestedTopic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for dashboard-related operations
 */
@Singleton
class DashboardRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Get dashboard data
     * @return Result containing dashboard data or error
     */
    suspend fun getDashboard(): Result<DashboardData> = withContext(Dispatchers.IO) {
        try {
            val response = api.getDashboard()

            if (response.isSuccessful) {
                response.body()?.let { dto ->
                    Timber.d("Successfully fetched dashboard data")
                    Result.success(mapToDomain(dto))
                } ?: run {
                    Timber.e("Empty response body for getDashboard")
                    Result.failure(DashboardException.EmptyResponse("No dashboard data returned"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to get dashboard: ${response.code()} - $errorBody")

                when (response.code()) {
                    401 -> Result.failure(DashboardException.Unauthorized("Session expired. Please login again."))
                    404 -> Result.failure(DashboardException.NotFound("Dashboard data not found"))
                    500 -> Result.failure(DashboardException.ServerError("Server error: ${response.code()}"))
                    else -> Result.failure(DashboardException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error fetching dashboard")
            Result.failure(DashboardException.NetworkError(e.message ?: "Network error occurred"))
        }
    }

    private fun mapToDomain(dto: DashboardResponse): DashboardData {
        return DashboardData(
            performanceSummary = PerformanceSummary(
                recentScores = dto.performanceSummary.recentScores.map {
                    RecentScore(
                        date = it.date,
                        score = it.score,
                        subject = it.subject,
                        topic = it.topic,
                        attempts = it.attempts
                    )
                },
                overallAccuracy = dto.performanceSummary.overallAccuracy,
                totalQuestions = dto.performanceSummary.totalQuestions,
                correctAnswers = dto.performanceSummary.correctAnswers
            ),
            suggestedTopics = dto.suggestedTopics.map {
                SuggestedTopic(
                    subject = it.subject,
                    topic = it.topic,
                    progress = it.progress,
                    masteryLevel = MasteryLevel.fromString(it.masteryLevel),
                    accuracy = it.accuracy
                )
            },
            streakInfo = StreakInfo(
                currentStreak = dto.streakInfo.currentStreak,
                longestStreak = dto.streakInfo.longestStreak,
                totalXP = dto.streakInfo.totalXP
            ),
            dailyXP = dto.dailyXP
        )
    }
}

/**
 * Custom exceptions for dashboard-related errors
 */
sealed class DashboardException(message: String) : Exception(message) {
    class Unauthorized(message: String) : DashboardException(message)
    class NotFound(message: String) : DashboardException(message)
    class EmptyResponse(message: String) : DashboardException(message)
    class ServerError(message: String) : DashboardException(message)
    class NetworkError(message: String) : DashboardException(message)
}

