package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.OnboardingAnswer
import com.prepverse.prepverse.data.remote.api.dto.OnboardingResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingStatusResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingSubmission
import com.prepverse.prepverse.data.remote.api.dto.QuestionResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for onboarding-related operations
 */
@Singleton
class OnboardingRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Get 10 random onboarding questions based on class level
     * @param classLevel The student's class (10 or 12)
     * @return Result containing list of questions or error
     */
    suspend fun getOnboardingQuestions(classLevel: Int): Result<List<QuestionResponse>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getOnboardingQuestions(classLevel)

            if (response.isSuccessful) {
                response.body()?.let { questions ->
                    Timber.d("Successfully fetched ${questions.size} onboarding questions")
                    Result.success(questions)
                } ?: run {
                    Timber.e("Empty response body for getOnboardingQuestions")
                    Result.failure(OnboardingException.EmptyResponse("No questions returned"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to fetch onboarding questions: ${response.code()} - $errorBody")

                when (response.code()) {
                    401 -> Result.failure(OnboardingException.Unauthorized("Session expired. Please login again."))
                    404 -> Result.failure(OnboardingException.NotFound("User not found"))
                    else -> Result.failure(OnboardingException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error fetching onboarding questions")
            Result.failure(OnboardingException.NetworkError(e.message ?: "Network error occurred"))
        }
    }

    /**
     * Submit onboarding answers for evaluation
     * @param answers List of question IDs and selected answers
     * @return Result containing evaluation response or error
     */
    suspend fun submitOnboarding(
        answers: List<Pair<String, String>>
    ): Result<OnboardingResponse> = withContext(Dispatchers.IO) {
        try {
            val submission = OnboardingSubmission(
                answers = answers.map { (questionId, selectedAnswer) ->
                    OnboardingAnswer(
                        questionId = questionId,
                        selectedAnswer = selectedAnswer
                    )
                }
            )

            val response = api.submitOnboarding(submission)

            if (response.isSuccessful) {
                response.body()?.let { result ->
                    Timber.d("Onboarding submitted successfully. Score: ${result.scorePercentage}%")
                    Result.success(result)
                } ?: run {
                    Timber.e("Empty response body for submitOnboarding")
                    Result.failure(OnboardingException.EmptyResponse("No result returned"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to submit onboarding: ${response.code()} - $errorBody")

                when (response.code()) {
                    400 -> Result.failure(OnboardingException.InvalidSubmission("Invalid answers submitted"))
                    401 -> Result.failure(OnboardingException.Unauthorized("Session expired. Please login again."))
                    else -> Result.failure(OnboardingException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error submitting onboarding")
            Result.failure(OnboardingException.NetworkError(e.message ?: "Network error occurred"))
        }
    }

    /**
     * Get user's onboarding completion status
     * @return Result containing status or error
     */
    suspend fun getOnboardingStatus(): Result<OnboardingStatusResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getOnboardingStatus()

            if (response.isSuccessful) {
                response.body()?.let { status ->
                    Timber.d("Onboarding status: completed=${status.completed}")
                    Result.success(status)
                } ?: run {
                    Timber.e("Empty response body for getOnboardingStatus")
                    Result.failure(OnboardingException.EmptyResponse("No status returned"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to fetch onboarding status: ${response.code()} - $errorBody")

                when (response.code()) {
                    401 -> Result.failure(OnboardingException.Unauthorized("Session expired. Please login again."))
                    404 -> Result.failure(OnboardingException.NotFound("User not found"))
                    else -> Result.failure(OnboardingException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error fetching onboarding status")
            Result.failure(OnboardingException.NetworkError(e.message ?: "Network error occurred"))
        }
    }
}

/**
 * Custom exceptions for onboarding-related errors
 */
sealed class OnboardingException(message: String) : Exception(message) {
    class Unauthorized(message: String) : OnboardingException(message)
    class NotFound(message: String) : OnboardingException(message)
    class InvalidSubmission(message: String) : OnboardingException(message)
    class EmptyResponse(message: String) : OnboardingException(message)
    class ServerError(message: String) : OnboardingException(message)
    class NetworkError(message: String) : OnboardingException(message)
}
