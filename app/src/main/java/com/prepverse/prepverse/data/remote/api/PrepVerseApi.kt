package com.prepverse.prepverse.data.remote.api

import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsRequest
import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingStatusResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingSubmission
import com.prepverse.prepverse.data.remote.api.dto.QuestionResponse
import com.prepverse.prepverse.data.remote.api.dto.UserProfileResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * PrepVerse Backend API Interface
 * Base URL configured in NetworkModule from BuildConfig.API_BASE_URL
 */
interface PrepVerseApi {

    // ================================
    // Auth Endpoints
    // ================================

    /**
     * Get current authenticated user's profile
     * Requires Bearer token in Authorization header
     */
    @GET("api/v1/auth/me")
    suspend fun getCurrentUser(): Response<UserProfileResponse>

    // ================================
    // Onboarding Endpoints
    // ================================

    /**
     * Get 10 random onboarding questions based on class level
     * @param classLevel The student's class (10 or 12)
     */
    @GET("api/v1/onboarding/questions")
    suspend fun getOnboardingQuestions(
        @retrofit2.http.Query("class_level") classLevel: Int
    ): Response<List<QuestionResponse>>

    /**
     * Submit onboarding answers and get evaluation results
     */
    @POST("api/v1/onboarding/submit")
    suspend fun submitOnboarding(
        @Body submission: OnboardingSubmission
    ): Response<OnboardingResponse>

    /**
     * Get user's onboarding completion status
     */
    @GET("api/v1/onboarding/status")
    suspend fun getOnboardingStatus(): Response<OnboardingStatusResponse>

    // ================================
    // Questions Endpoints
    // ================================

    /**
     * Generate questions using Gemini AI
     */
    @POST("api/v1/questions/generate")
    suspend fun generateQuestions(
        @Body request: GenerateQuestionsRequest
    ): Response<GenerateQuestionsResponse>

    // ================================
    // Progress Endpoints
    // ================================

    // TODO: Add progress endpoints when backend implements them
    // @GET("api/v1/progress/dashboard")
    // suspend fun getDashboard(): Response<DashboardResponse>

    // ================================
    // Focus Endpoints
    // ================================

    // TODO: Add focus session endpoints when backend implements them

    // ================================
    // Peer Endpoints
    // ================================

    // TODO: Add peer session endpoints when backend implements them
}
