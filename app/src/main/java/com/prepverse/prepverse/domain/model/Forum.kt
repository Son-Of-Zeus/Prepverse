package com.prepverse.prepverse.domain.model

/**
 * Domain models for Discussion Forum
 */

/**
 * Vote type enum
 */
enum class VoteType(val value: Int) {
    UP(1),
    DOWN(-1);

    companion object {
        fun fromValue(value: Int): VoteType? = entries.find { it.value == value }
    }
}

/**
 * Forum post categories
 */
enum class ForumCategory(val displayName: String, val apiName: String) {
    GENERAL("General", "general"),
    MATH("Mathematics", "math"),
    PHYSICS("Physics", "physics"),
    CHEMISTRY("Chemistry", "chemistry"),
    BIOLOGY("Biology", "biology"),
    EXAM_TIPS("Exam Tips", "exam-tips"),
    STUDY_GROUPS("Study Groups", "study-groups"),
    RESOURCES("Resources", "resources");

    companion object {
        fun fromApiName(name: String): ForumCategory {
            return entries.find { it.apiName == name } ?: GENERAL
        }

        fun all(): List<ForumCategory> = entries.toList()
    }
}

/**
 * Forum post model
 */
data class ForumPost(
    val id: String,
    val userId: String,
    val authorName: String,
    val title: String,
    val content: String,
    val category: String,
    val tags: List<String>,
    val upvotes: Int,
    val viewCount: Int,
    val isPinned: Boolean,
    val createdAt: Long,
    val commentCount: Int
) {
    /**
     * Get formatted time ago string
     */
    fun getTimeAgo(): String {
        val now = System.currentTimeMillis()
        val diff = now - createdAt
        val seconds = diff / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24

        return when {
            days > 0 -> "${days}d ago"
            hours > 0 -> "${hours}h ago"
            minutes > 0 -> "${minutes}m ago"
            else -> "Just now"
        }
    }

    /**
     * Get the category display name
     */
    fun getCategoryDisplay(): String {
        return ForumCategory.fromApiName(category).displayName
    }
}

/**
 * Forum post with full details including comments
 */
data class ForumPostDetail(
    val id: String,
    val userId: String,
    val authorName: String,
    val title: String,
    val content: String,
    val category: String,
    val tags: List<String>,
    val upvotes: Int,
    val viewCount: Int,
    val isPinned: Boolean,
    val createdAt: Long,
    val commentCount: Int,
    val comments: List<ForumComment>,
    val userVoteStatus: VoteType?
) {
    /**
     * Get formatted time ago string
     */
    fun getTimeAgo(): String {
        val now = System.currentTimeMillis()
        val diff = now - createdAt
        val seconds = diff / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24

        return when {
            days > 0 -> "${days}d ago"
            hours > 0 -> "${hours}h ago"
            minutes > 0 -> "${minutes}m ago"
            else -> "Just now"
        }
    }

    /**
     * Get the category display name
     */
    fun getCategoryDisplay(): String {
        return ForumCategory.fromApiName(category).displayName
    }

    /**
     * Get top-level comments (no parent)
     */
    fun getTopLevelComments(): List<ForumComment> {
        return comments.filter { it.parentCommentId == null }
    }

    /**
     * Get replies to a specific comment
     */
    fun getReplies(commentId: String): List<ForumComment> {
        return comments.filter { it.parentCommentId == commentId }
    }
}

/**
 * Forum comment model
 */
data class ForumComment(
    val id: String,
    val postId: String,
    val userId: String,
    val content: String,
    val parentCommentId: String?,
    val authorName: String,
    val upvotes: Int,
    val createdAt: Long,
    val userVoteStatus: VoteType? = null
) {
    /**
     * Get formatted time ago string
     */
    fun getTimeAgo(): String {
        val now = System.currentTimeMillis()
        val diff = now - createdAt
        val seconds = diff / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24

        return when {
            days > 0 -> "${days}d ago"
            hours > 0 -> "${hours}h ago"
            minutes > 0 -> "${minutes}m ago"
            else -> "Just now"
        }
    }

    /**
     * Check if this is a reply to another comment
     */
    fun isReply(): Boolean = parentCommentId != null
}

/**
 * Vote result
 */
data class VoteResult(
    val success: Boolean,
    val newUpvoteCount: Int,
    val userVoteStatus: VoteType?
)
