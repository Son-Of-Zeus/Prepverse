package com.prepverse.prepverse.data.remote.api

import com.prepverse.prepverse.data.remote.api.dto.ConceptProgressResponse
import com.prepverse.prepverse.data.remote.api.dto.CreateCommentRequest
import com.prepverse.prepverse.data.remote.api.dto.CreatePostRequest
import com.prepverse.prepverse.data.remote.api.dto.ForumCommentResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostDetailResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostListResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostResponse
import com.prepverse.prepverse.data.remote.api.dto.VoteRequest
import com.prepverse.prepverse.data.remote.api.dto.VoteResultResponse
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
import com.prepverse.prepverse.data.remote.api.dto.SchoolDetailsResponse
import com.prepverse.prepverse.data.remote.api.dto.SchoolResult
import com.prepverse.prepverse.data.remote.api.dto.SchoolSearchResponse
import com.prepverse.prepverse.data.remote.api.dto.SessionHistoryResponse
import com.prepverse.prepverse.data.remote.api.dto.SetSchoolRequest
import com.prepverse.prepverse.data.remote.api.dto.SetSchoolResponse
import com.prepverse.prepverse.data.remote.api.dto.StartSessionRequest
import com.prepverse.prepverse.data.remote.api.dto.StartSessionResponse
import com.prepverse.prepverse.data.remote.api.dto.StateListResponse
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
    // Schools Endpoints
    // ================================

    /**
     * Search for schools by name or affiliation code
     * @param query Search query (min 2 chars)
     * @param state Optional state filter
     * @param limit Max results (default 20)
     */
    @GET("api/v1/schools/search")
    suspend fun searchSchools(
        @Query("q") query: String,
        @Query("state") state: String? = null,
        @Query("limit") limit: Int = 20
    ): Response<SchoolSearchResponse>

    /**
     * Get list of all states with school counts
     */
    @GET("api/v1/schools/states")
    suspend fun getStates(): Response<StateListResponse>

    /**
     * Get details for a specific school
     */
    @GET("api/v1/schools/{schoolId}")
    suspend fun getSchool(
        @Path("schoolId") schoolId: String
    ): Response<SchoolDetailsResponse>

    /**
     * Set the current user's school
     */
    @POST("api/v1/schools/set")
    suspend fun setUserSchool(
        @Body request: SetSchoolRequest
    ): Response<SetSchoolResponse>

    /**
     * Get the current user's school
     */
    @GET("api/v1/schools/user/current")
    suspend fun getUserSchool(): Response<SchoolResult?>

    // ================================
    // Focus Endpoints
    // ================================

    // TODO: Add focus session endpoints when backend implements them

    // ================================
    // Peer Endpoints
    // ================================

    // ================================
    // Peer Endpoints
    // ================================

    // Encryption Keys
    @POST("api/v1/peer/keys/register")
    suspend fun registerEncryptionKeys(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.RegisterKeysRequest
    ): Response<Unit>

    @GET("api/v1/peer/keys/{userId}")
    suspend fun getUserKeys(
        @Path("userId") userId: String
    ): Response<com.prepverse.prepverse.data.remote.api.dto.KeyBundleResponse>

    // Sessions
    @POST("api/v1/peer/sessions")
    suspend fun createPeerSession(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.CreateSessionRequest
    ): Response<com.prepverse.prepverse.data.remote.api.dto.SessionResponse>

    @GET("api/v1/peer/sessions")
    suspend fun listPeerSessions(
        @Query("topic") topic: String? = null,
        @Query("subject") subject: String? = null
    ): Response<List<com.prepverse.prepverse.data.remote.api.dto.SessionResponse>>

    @POST("api/v1/peer/sessions/{sessionId}/join")
    suspend fun joinPeerSession(
        @Path("sessionId") sessionId: String
    ): Response<Unit>

    @POST("api/v1/peer/sessions/{sessionId}/leave")
    suspend fun leavePeerSession(
        @Path("sessionId") sessionId: String
    ): Response<Unit>

    @GET("api/v1/peer/sessions/{sessionId}/participants")
    suspend fun getSessionParticipants(
        @Path("sessionId") sessionId: String
    ): Response<List<com.prepverse.prepverse.data.remote.api.dto.ParticipantResponse>>

    // Messaging
    @POST("api/v1/peer/messages")
    suspend fun sendPeerMessage(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.SendMessageRequest
    ): Response<Unit>

    @GET("api/v1/peer/messages/{sessionId}")
    suspend fun getPeerMessages(
        @Path("sessionId") sessionId: String,
        @Query("since") since: String? = null
    ): Response<List<com.prepverse.prepverse.data.remote.api.dto.MessageResponse>>

    // Availability
    @POST("api/v1/peer/availability")
    suspend fun setAvailability(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.SetAvailabilityRequest
    ): Response<Unit>

    @GET("api/v1/peer/available")
    suspend fun getAvailablePeers(): Response<List<com.prepverse.prepverse.data.remote.api.dto.AvailablePeerResponse>>

    @POST("api/v1/peer/find-by-topic")
    suspend fun findPeersByTopic(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.FindByTopicRequest
    ): Response<List<com.prepverse.prepverse.data.remote.api.dto.AvailablePeerResponse>>

    // Block & Report
    @POST("api/v1/peer/block")
    suspend fun blockUser(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.BlockUserRequest
    ): Response<Unit>

    @retrofit2.http.DELETE("api/v1/peer/block/{userId}")
    suspend fun unblockUser(
        @Path("userId") userId: String
    ): Response<Unit>

    @GET("api/v1/peer/blocked")
    suspend fun getBlockedUsers(): Response<List<String>>

    @POST("api/v1/peer/report")
    suspend fun reportUser(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.ReportUserRequest
    ): Response<Unit>

    // Whiteboard
    @POST("api/v1/peer/whiteboard/sync")
    suspend fun syncWhiteboard(
        @Body request: com.prepverse.prepverse.data.remote.api.dto.WhiteboardSyncRequest
    ): Response<Unit>

    @GET("api/v1/peer/whiteboard/{sessionId}")
    suspend fun getWhiteboardState(
        @Path("sessionId") sessionId: String
    ): Response<com.prepverse.prepverse.data.remote.api.dto.WhiteboardStateResponse>

    // ================================
    // Forum Endpoints
    // ================================

    /**
     * Get paginated list of forum posts
     * @param category Filter by category (optional)
     * @param search Search in title/content (optional)
     * @param page Page number (default 1)
     * @param limit Items per page (default 20)
     */
    @GET("api/v1/forum/")
    suspend fun getForumPosts(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ForumPostListResponse>

    /**
     * Create a new forum post
     */
    @POST("api/v1/forum/")
    suspend fun createForumPost(
        @Body request: CreatePostRequest
    ): Response<ForumPostResponse>

    /**
     * Get post details including all comments
     */
    @GET("api/v1/forum/{postId}")
    suspend fun getForumPostDetails(
        @Path("postId") postId: String
    ): Response<ForumPostDetailResponse>

    /**
     * Delete a forum post (owner only)
     */
    @retrofit2.http.DELETE("api/v1/forum/{postId}")
    suspend fun deleteForumPost(
        @Path("postId") postId: String
    ): Response<Unit>

    /**
     * Add a comment to a post
     */
    @POST("api/v1/forum/{postId}/comments")
    suspend fun createForumComment(
        @Path("postId") postId: String,
        @Body request: CreateCommentRequest
    ): Response<ForumCommentResponse>

    /**
     * Vote on a post
     */
    @POST("api/v1/forum/{postId}/vote")
    suspend fun voteOnPost(
        @Path("postId") postId: String,
        @Body request: VoteRequest
    ): Response<VoteResultResponse>

    /**
     * Vote on a comment
     */
    @POST("api/v1/forum/comments/{commentId}/vote")
    suspend fun voteOnComment(
        @Path("commentId") commentId: String,
        @Body request: VoteRequest
    ): Response<VoteResultResponse>
}
