package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsRequest
import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for question-related operations
 */
@Singleton
class QuestionRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Generate questions using Gemini AI
     * @param subject Subject for questions (e.g., "Mathematics", "Physics")
     * @param topic Topic within the subject (e.g., "Quadratic Equations")
     * @param difficulty Difficulty level: "easy", "medium", "hard"
     * @param classLevel Class level: 10 or 12
     * @param count Number of questions to generate (1-20)
     * @return Result containing generated questions or error
     */
    suspend fun generateQuestions(
        subject: String,
        topic: String,
        difficulty: String = "medium",
        classLevel: Int,
        count: Int = 5
    ): Result<GenerateQuestionsResponse> = withContext(Dispatchers.IO) {
        try {
            val request = GenerateQuestionsRequest(
                subject = subject,
                topic = topic,
                difficulty = difficulty,
                classLevel = classLevel,
                count = count
            )

            val response = api.generateQuestions(request)

            if (response.isSuccessful) {
                response.body()?.let { result ->
                    Timber.d("Successfully generated ${result.count} questions for $subject - $topic")
                    Result.success(result)
                } ?: run {
                    Timber.e("Empty response body for generateQuestions")
                    Result.failure(QuestionException.EmptyResponse("No questions returned"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to generate questions: ${response.code()} - $errorBody")

                when (response.code()) {
                    400 -> Result.failure(QuestionException.InvalidRequest("Invalid request parameters"))
                    401 -> Result.failure(QuestionException.Unauthorized("Session expired. Please login again."))
                    429 -> Result.failure(QuestionException.RateLimited("Too many requests. Please try again later."))
                    500 -> Result.failure(QuestionException.AIError("AI service error. Please try again."))
                    else -> Result.failure(QuestionException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error generating questions")
            Result.failure(QuestionException.NetworkError(e.message ?: "Network error occurred"))
        }
    }
}

/**
 * Custom exceptions for question-related errors
 */
sealed class QuestionException(message: String) : Exception(message) {
    class Unauthorized(message: String) : QuestionException(message)
    class InvalidRequest(message: String) : QuestionException(message)
    class EmptyResponse(message: String) : QuestionException(message)
    class RateLimited(message: String) : QuestionException(message)
    class AIError(message: String) : QuestionException(message)
    class ServerError(message: String) : QuestionException(message)
    class NetworkError(message: String) : QuestionException(message)
}
