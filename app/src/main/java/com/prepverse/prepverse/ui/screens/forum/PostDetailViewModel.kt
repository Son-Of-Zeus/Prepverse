package com.prepverse.prepverse.ui.screens.forum

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.repository.ForumRepository
import com.prepverse.prepverse.domain.model.ForumComment
import com.prepverse.prepverse.domain.model.ForumPostDetail
import com.prepverse.prepverse.domain.model.VoteType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PostDetailUiState(
    val post: ForumPostDetail? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isVoting: Boolean = false,
    val isCommenting: Boolean = false,
    val commentText: String = "",
    val replyingToComment: ForumComment? = null,
    val isDeleting: Boolean = false,
    val deleteSuccess: Boolean = false,
    val commentVoteStates: Map<String, VoteType?> = emptyMap(),
    val commentUpvoteCounts: Map<String, Int> = emptyMap()
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    private val forumRepository: ForumRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val postId: String = savedStateHandle.get<String>("postId") ?: ""

    private val _uiState = MutableStateFlow(PostDetailUiState())
    val uiState: StateFlow<PostDetailUiState> = _uiState.asStateFlow()

    init {
        if (postId.isNotEmpty()) {
            loadPost()
        }
    }

    /**
     * Load post details
     */
    fun loadPost() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = forumRepository.getPostDetails(postId)

            result.fold(
                onSuccess = { post ->
                    _uiState.update {
                        it.copy(
                            post = post,
                            isLoading = false
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load post"
                        )
                    }
                }
            )
        }
    }

    /**
     * Vote on the post
     */
    fun voteOnPost(voteType: VoteType) {
        val currentPost = _uiState.value.post ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isVoting = true) }

            val result = forumRepository.voteOnPost(postId, voteType)

            result.fold(
                onSuccess = { voteResult ->
                    _uiState.update {
                        it.copy(
                            post = currentPost.copy(
                                upvotes = voteResult.newUpvoteCount,
                                userVoteStatus = voteResult.userVoteStatus
                            ),
                            isVoting = false
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isVoting = false,
                            error = error.message
                        )
                    }
                }
            )
        }
    }

    /**
     * Vote on a comment
     */
    fun voteOnComment(commentId: String, voteType: VoteType) {
        viewModelScope.launch {
            val result = forumRepository.voteOnComment(commentId, voteType)

            result.fold(
                onSuccess = { voteResult ->
                    _uiState.update { state ->
                        state.copy(
                            commentVoteStates = state.commentVoteStates + (commentId to voteResult.userVoteStatus),
                            commentUpvoteCounts = state.commentUpvoteCounts + (commentId to voteResult.newUpvoteCount)
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(error = error.message)
                    }
                }
            )
        }
    }

    /**
     * Update comment text
     */
    fun updateCommentText(text: String) {
        _uiState.update { it.copy(commentText = text) }
    }

    /**
     * Start replying to a comment
     */
    fun startReplyingTo(comment: ForumComment) {
        _uiState.update { it.copy(replyingToComment = comment) }
    }

    /**
     * Cancel reply
     */
    fun cancelReply() {
        _uiState.update { it.copy(replyingToComment = null) }
    }

    /**
     * Submit a comment
     */
    fun submitComment() {
        val commentText = _uiState.value.commentText.trim()
        if (commentText.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isCommenting = true) }

            val parentId = _uiState.value.replyingToComment?.id
            val result = forumRepository.createComment(
                postId = postId,
                content = commentText,
                parentCommentId = parentId
            )

            result.fold(
                onSuccess = { newComment ->
                    // Reload the post to get updated comments
                    loadPost()
                    _uiState.update {
                        it.copy(
                            isCommenting = false,
                            commentText = "",
                            replyingToComment = null
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isCommenting = false,
                            error = error.message
                        )
                    }
                }
            )
        }
    }

    /**
     * Delete the post
     */
    fun deletePost() {
        viewModelScope.launch {
            _uiState.update { it.copy(isDeleting = true) }

            val result = forumRepository.deletePost(postId)

            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            isDeleting = false,
                            deleteSuccess = true
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isDeleting = false,
                            error = error.message
                        )
                    }
                }
            )
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Get comment upvote count (considering local updates)
     */
    fun getCommentUpvotes(comment: ForumComment): Int {
        return _uiState.value.commentUpvoteCounts[comment.id] ?: comment.upvotes
    }

    /**
     * Get comment vote status (considering local updates)
     */
    fun getCommentVoteStatus(comment: ForumComment): VoteType? {
        return _uiState.value.commentVoteStates[comment.id] ?: comment.userVoteStatus
    }
}
