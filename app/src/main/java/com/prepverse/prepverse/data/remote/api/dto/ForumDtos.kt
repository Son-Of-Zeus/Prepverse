package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * DTOs for Discussion Forum API
 */

// =============================================================================
// Request DTOs
// =============================================================================

@JsonClass(generateAdapter = true)
data class CreatePostRequest(
    @Json(name = "title") val title: String,
    @Json(name = "content") val content: String,
    @Json(name = "category") val category: String = "general",
    @Json(name = "tags") val tags: List<String>? = null
)

@JsonClass(generateAdapter = true)
data class CreateCommentRequest(
    @Json(name = "content") val content: String,
    @Json(name = "parent_comment_id") val parentCommentId: String? = null
)

@JsonClass(generateAdapter = true)
data class VoteRequest(
    @Json(name = "vote_type") val voteType: Int // 1 for upvote, -1 for downvote
)

// =============================================================================
// Response DTOs
// =============================================================================

@JsonClass(generateAdapter = true)
data class ForumPostResponse(
    @Json(name = "id") val id: String,
    @Json(name = "user_id") val userId: String,
    @Json(name = "author_name") val authorName: String,
    @Json(name = "title") val title: String,
    @Json(name = "content") val content: String,
    @Json(name = "category") val category: String,
    @Json(name = "tags") val tags: List<String>?,
    @Json(name = "upvotes") val upvotes: Int,
    @Json(name = "view_count") val viewCount: Int,
    @Json(name = "is_pinned") val isPinned: Boolean,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String?,
    @Json(name = "comment_count") val commentCount: Int
)

@JsonClass(generateAdapter = true)
data class ForumCommentResponse(
    @Json(name = "id") val id: String,
    @Json(name = "post_id") val postId: String,
    @Json(name = "user_id") val userId: String,
    @Json(name = "content") val content: String,
    @Json(name = "parent_comment_id") val parentCommentId: String?,
    @Json(name = "author_name") val authorName: String,
    @Json(name = "upvotes") val upvotes: Int,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String?
)

@JsonClass(generateAdapter = true)
data class ForumPostDetailResponse(
    @Json(name = "id") val id: String,
    @Json(name = "user_id") val userId: String,
    @Json(name = "author_name") val authorName: String,
    @Json(name = "title") val title: String,
    @Json(name = "content") val content: String,
    @Json(name = "category") val category: String,
    @Json(name = "tags") val tags: List<String>?,
    @Json(name = "upvotes") val upvotes: Int,
    @Json(name = "view_count") val viewCount: Int,
    @Json(name = "is_pinned") val isPinned: Boolean,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String?,
    @Json(name = "comment_count") val commentCount: Int,
    @Json(name = "comments") val comments: List<ForumCommentResponse>,
    @Json(name = "user_vote_status") val userVoteStatus: Int? // 1, -1, or null
)

@JsonClass(generateAdapter = true)
data class ForumPostListResponse(
    @Json(name = "posts") val posts: List<ForumPostResponse>,
    @Json(name = "total") val total: Int,
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "has_more") val hasMore: Boolean
)

@JsonClass(generateAdapter = true)
data class VoteResultResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "new_upvote_count") val newUpvoteCount: Int,
    @Json(name = "user_vote_status") val userVoteStatus: Int? // 1, -1, or null if removed
)
