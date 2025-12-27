package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.ConceptProgressResponse
import com.prepverse.prepverse.data.remote.api.dto.EndSessionRequest
import com.prepverse.prepverse.data.remote.api.dto.EndSessionResponse
import com.prepverse.prepverse.data.remote.api.dto.NextQuestionResponse
import com.prepverse.prepverse.data.remote.api.dto.ProgressSummaryResponse
import com.prepverse.prepverse.data.remote.api.dto.SessionHistoryResponse
import com.prepverse.prepverse.data.remote.api.dto.StartSessionRequest
import com.prepverse.prepverse.data.remote.api.dto.StartSessionResponse
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerRequest
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerResponse
import com.prepverse.prepverse.data.remote.api.dto.TopicsResponse
import javax.inject.Inject
import javax.inject.Singleton

sealed class PracticeResult<out T> {
    data class Success<T>(val data: T) : PracticeResult<T>()
    data class Error(val message: String, val code: Int? = null) : PracticeResult<Nothing>()
    data object Loading : PracticeResult<Nothing>()
}

@Singleton
class PracticeRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Get available topics for practice
     */
    suspend fun getTopics(subject: String? = null): PracticeResult<TopicsResponse> {
        return try {
            val response = api.getTopics(subject)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to fetch topics",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Start a new practice session
     */
    suspend fun startSession(
        subject: String,
        topic: String? = null,
        difficulty: String? = null,
        questionCount: Int = 10,
        timeLimitSeconds: Int? = null
    ): PracticeResult<StartSessionResponse> {
        return try {
            val request = StartSessionRequest(
                subject = subject,
                topic = topic,
                difficulty = difficulty,
                questionCount = questionCount,
                timeLimitSeconds = timeLimitSeconds
            )
            val response = api.startPracticeSession(request)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to start session",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Get the next question in the session
     */
    suspend fun getNextQuestion(sessionId: String): PracticeResult<NextQuestionResponse> {
        return try {
            val response = api.getNextQuestion(sessionId)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                // 404 means no more questions
                if (response.code() == 404) {
                    PracticeResult.Error(message = "No more questions", code = 404)
                } else {
                    PracticeResult.Error(
                        message = response.errorBody()?.string() ?: "Failed to get question",
                        code = response.code()
                    )
                }
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Submit an answer for the current question
     */
    suspend fun submitAnswer(
        sessionId: String,
        answer: String,
        timeTakenSeconds: Int
    ): PracticeResult<SubmitAnswerResponse> {
        return try {
            val request = SubmitAnswerRequest(
                answer = answer,
                timeTakenSeconds = timeTakenSeconds
            )
            val response = api.submitAnswer(sessionId, request)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to submit answer",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * End a practice session
     */
    suspend fun endSession(
        sessionId: String,
        reason: String? = null
    ): PracticeResult<EndSessionResponse> {
        return try {
            // Always send a request body to avoid issues with null body serialization
            val request = EndSessionRequest(reason)
            val response = api.endPracticeSession(sessionId, request)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to end session",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Get review for a completed session
     */
    suspend fun getSessionReview(sessionId: String): PracticeResult<EndSessionResponse> {
        return try {
            val response = api.getSessionReview(sessionId)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to get review",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Get session history
     */
    suspend fun getSessionHistory(
        page: Int = 1,
        pageSize: Int = 10
    ): PracticeResult<SessionHistoryResponse> {
        return try {
            val response = api.getSessionHistory(page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to get history",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Get overall progress summary
     */
    suspend fun getProgressSummary(): PracticeResult<ProgressSummaryResponse> {
        return try {
            val response = api.getProgressSummary()
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to get progress",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }

    /**
     * Get concept mastery data for SWOT analysis
     */
    suspend fun getConceptProgress(subject: String? = null): PracticeResult<ConceptProgressResponse> {
        return try {
            val response = api.getConceptProgress(subject)
            if (response.isSuccessful && response.body() != null) {
                PracticeResult.Success(response.body()!!)
            } else {
                PracticeResult.Error(
                    message = response.errorBody()?.string() ?: "Failed to get concept progress",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            PracticeResult.Error(message = e.message ?: "Network error")
        }
    }
}
