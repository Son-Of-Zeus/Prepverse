package com.prepverse.prepverse.data.remote.api

import com.prepverse.prepverse.data.remote.api.dto.ConceptProgressResponse
import com.prepverse.prepverse.data.remote.api.dto.DashboardResponse
import com.prepverse.prepverse.data.remote.api.dto.EndSessionRequest
import com.prepverse.prepverse.data.remote.api.dto.EndSessionResponse
import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsRequest
import com.prepverse.prepverse.data.remote.api.dto.GenerateQuestionsResponse
import com.prepverse.prepverse.data.remote.api.dto.NextQuestionResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingStatusResponse
import com.prepverse.prepverse.data.remote.api.dto.OnboardingSubmission
import com.prepverse.prepverse.data.remote.api.dto.ProgressSummaryResponse
import com.prepverse.prepverse.data.remote.api.dto.QuestionResponse
import com.prepverse.prepverse.data.remote.api.dto.SessionHistoryResponse
import com.prepverse.prepverse.data.remote.api.dto.StartSessionRequest
import com.prepverse.prepverse.data.remote.api.dto.StartSessionResponse
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerRequest
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerResponse
import com.prepverse.prepverse.data.remote.api.dto.TopicsResponse
import com.prepverse.prepverse.data.remote.api.dto.UserProfileResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

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
        @Query("class_level") classLevel: Int
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
    // Practice Endpoints
    // ================================

    /**
     * Get available topics for practice
     */
    @GET("api/v1/practice/topics")
    suspend fun getTopics(
        @Query("subject") subject: String? = null
    ): Response<TopicsResponse>

    /**
     * Start a new practice session
     */
    @POST("api/v1/practice/session/start")
    suspend fun startPracticeSession(
        @Body request: StartSessionRequest
    ): Response<StartSessionResponse>

    /**
     * Get the next question in the session
     */
    @GET("api/v1/practice/session/{sessionId}/next")
    suspend fun getNextQuestion(
        @Path("sessionId") sessionId: String
    ): Response<NextQuestionResponse>

    /**
     * Submit an answer for the current question
     */
    @POST("api/v1/practice/session/{sessionId}/submit")
    suspend fun submitAnswer(
        @Path("sessionId") sessionId: String,
        @Body request: SubmitAnswerRequest
    ): Response<SubmitAnswerResponse>

    /**
     * End a practice session
     */
    @POST("api/v1/practice/session/{sessionId}/end")
    suspend fun endPracticeSession(
        @Path("sessionId") sessionId: String,
        @Body request: EndSessionRequest
    ): Response<EndSessionResponse>

    /**
     * Get review for a completed session
     */
    @GET("api/v1/practice/session/{sessionId}/review")
    suspend fun getSessionReview(
        @Path("sessionId") sessionId: String
    ): Response<EndSessionResponse>

    /**
     * Get session history
     */
    @GET("api/v1/practice/history")
    suspend fun getSessionHistory(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 10
    ): Response<SessionHistoryResponse>

    // ================================
    // Progress Endpoints
    // ================================

    /**
     * Get concept mastery scores
     */
    @GET("api/v1/practice/progress/concepts")
    suspend fun getConceptProgress(
        @Query("subject") subject: String? = null
    ): Response<ConceptProgressResponse>

    /**
     * Get overall progress summary
     */
    @GET("api/v1/practice/progress/summary")
    suspend fun getProgressSummary(): Response<ProgressSummaryResponse>

    // ================================
    // Dashboard Endpoints
    // ================================

    /**
     * Get dashboard data including performance summary, suggested topics, and streak info
     */
    @GET("api/v1/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    // ================================
    // Focus Endpoints
    // ================================

    // TODO: Add focus session endpoints when backend implements them

    // ================================
    // Peer Endpoints
    // ================================

    // TODO: Add peer session endpoints when backend implements them
}
