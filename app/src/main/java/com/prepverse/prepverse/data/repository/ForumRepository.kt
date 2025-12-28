package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.CreateCommentRequest
import com.prepverse.prepverse.data.remote.api.dto.CreatePostRequest
import com.prepverse.prepverse.data.remote.api.dto.ForumCommentResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostDetailResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostListResponse
import com.prepverse.prepverse.data.remote.api.dto.ForumPostResponse
import com.prepverse.prepverse.data.remote.api.dto.VoteRequest
import com.prepverse.prepverse.data.remote.api.dto.VoteResultResponse
import com.prepverse.prepverse.domain.model.ForumComment
import com.prepverse.prepverse.domain.model.ForumPost
import com.prepverse.prepverse.domain.model.ForumPostDetail
import com.prepverse.prepverse.domain.model.VoteResult
import com.prepverse.prepverse.domain.model.VoteType
import java.time.Instant
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for Discussion Forum API calls
 */
@Singleton
class ForumRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Get paginated list of forum posts
     */
    suspend fun getPosts(
        category: String? = null,
        search: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<ForumPostListResult> {
        return try {
            val response = api.getForumPosts(
                category = category,
                search = search,
                page = page,
                limit = limit
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.success(
                    ForumPostListResult(
                        posts = body.posts.map { it.toDomain() },
                        total = body.total,
                        page = body.page,
                        limit = body.limit,
                        hasMore = body.hasMore
                    )
                )
            } else {
                Result.failure(Exception("Failed to load posts: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create a new forum post
     */
    suspend fun createPost(
        title: String,
        content: String,
        category: String = "general",
        tags: List<String>? = null
    ): Result<ForumPost> {
        return try {
            val response = api.createForumPost(
                CreatePostRequest(
                    title = title,
                    content = content,
                    category = category,
                    tags = tags
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to create post: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get post details with comments
     */
    suspend fun getPostDetails(postId: String): Result<ForumPostDetail> {
        return try {
            val response = api.getForumPostDetails(postId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to load post: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Delete a forum post
     */
    suspend fun deletePost(postId: String): Result<Unit> {
        return try {
            val response = api.deleteForumPost(postId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete post: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create a comment on a post
     */
    suspend fun createComment(
        postId: String,
        content: String,
        parentCommentId: String? = null
    ): Result<ForumComment> {
        return try {
            val response = api.createForumComment(
                postId = postId,
                request = CreateCommentRequest(
                    content = content,
                    parentCommentId = parentCommentId
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to create comment: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Vote on a post
     */
    suspend fun voteOnPost(postId: String, voteType: VoteType): Result<VoteResult> {
        return try {
            val response = api.voteOnPost(
                postId = postId,
                request = VoteRequest(voteType = voteType.value)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to vote: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Vote on a comment
     */
    suspend fun voteOnComment(commentId: String, voteType: VoteType): Result<VoteResult> {
        return try {
            val response = api.voteOnComment(
                commentId = commentId,
                request = VoteRequest(voteType = voteType.value)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to vote: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * Result wrapper for paginated posts
 */
data class ForumPostListResult(
    val posts: List<ForumPost>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val hasMore: Boolean
)

// =============================================================================
// Extension functions to convert DTOs to domain models
// =============================================================================

private fun ForumPostResponse.toDomain(): ForumPost {
    return ForumPost(
        id = id,
        userId = userId,
        authorName = authorName,
        title = title,
        content = content,
        category = category,
        tags = tags ?: emptyList(),
        upvotes = upvotes,
        viewCount = viewCount,
        isPinned = isPinned,
        createdAt = parseDateTime(createdAt),
        commentCount = commentCount
    )
}

private fun ForumPostDetailResponse.toDomain(): ForumPostDetail {
    return ForumPostDetail(
        id = id,
        userId = userId,
        authorName = authorName,
        title = title,
        content = content,
        category = category,
        tags = tags ?: emptyList(),
        upvotes = upvotes,
        viewCount = viewCount,
        isPinned = isPinned,
        createdAt = parseDateTime(createdAt),
        commentCount = commentCount,
        comments = comments.map { it.toDomain() },
        userVoteStatus = userVoteStatus?.let { VoteType.fromValue(it) }
    )
}

private fun ForumCommentResponse.toDomain(): ForumComment {
    return ForumComment(
        id = id,
        postId = postId,
        userId = userId,
        content = content,
        parentCommentId = parentCommentId,
        authorName = authorName,
        upvotes = upvotes,
        createdAt = parseDateTime(createdAt)
    )
}

private fun VoteResultResponse.toDomain(): VoteResult {
    return VoteResult(
        success = success,
        newUpvoteCount = newUpvoteCount,
        userVoteStatus = userVoteStatus?.let { VoteType.fromValue(it) }
    )
}

private fun parseDateTime(dateTimeString: String): Long {
    return try {
        Instant.parse(dateTimeString).toEpochMilli()
    } catch (e: Exception) {
        try {
            // Try ISO format without Z
            val formatter = DateTimeFormatter.ISO_DATE_TIME
            Instant.from(formatter.parse(dateTimeString)).toEpochMilli()
        } catch (e2: Exception) {
            System.currentTimeMillis()
        }
    }
}
