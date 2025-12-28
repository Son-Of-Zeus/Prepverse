package com.prepverse.prepverse.ui.screens.forum

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.repository.ForumRepository
import com.prepverse.prepverse.domain.model.ForumCategory
import com.prepverse.prepverse.domain.model.ForumPost
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForumListUiState(
    val posts: List<ForumPost> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
    val selectedCategory: ForumCategory? = null,
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
    val categories: List<ForumCategory> = ForumCategory.all()
)

@HiltViewModel
class ForumListViewModel @Inject constructor(
    private val forumRepository: ForumRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ForumListUiState())
    val uiState: StateFlow<ForumListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadPosts()
    }

    /**
     * Load initial posts
     */
    fun loadPosts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, currentPage = 1) }

            val result = forumRepository.getPosts(
                category = _uiState.value.selectedCategory?.apiName,
                search = _uiState.value.searchQuery.takeIf { it.isNotBlank() },
                page = 1
            )

            result.fold(
                onSuccess = { listResult ->
                    _uiState.update {
                        it.copy(
                            posts = listResult.posts,
                            isLoading = false,
                            hasMore = listResult.hasMore,
                            currentPage = 1
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load posts"
                        )
                    }
                }
            )
        }
    }

    /**
     * Load more posts (pagination)
     */
    fun loadMorePosts() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMore) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }

            val nextPage = _uiState.value.currentPage + 1
            val result = forumRepository.getPosts(
                category = _uiState.value.selectedCategory?.apiName,
                search = _uiState.value.searchQuery.takeIf { it.isNotBlank() },
                page = nextPage
            )

            result.fold(
                onSuccess = { listResult ->
                    _uiState.update {
                        it.copy(
                            posts = it.posts + listResult.posts,
                            isLoadingMore = false,
                            hasMore = listResult.hasMore,
                            currentPage = nextPage
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingMore = false,
                            error = error.message
                        )
                    }
                }
            )
        }
    }

    /**
     * Select a category filter
     */
    fun selectCategory(category: ForumCategory?) {
        if (_uiState.value.selectedCategory == category) {
            // Toggle off if same category selected
            _uiState.update { it.copy(selectedCategory = null) }
        } else {
            _uiState.update { it.copy(selectedCategory = category) }
        }
        loadPosts()
    }

    /**
     * Update search query with debounce
     */
    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }

        // Cancel previous search job
        searchJob?.cancel()

        // Debounce search by 300ms
        searchJob = viewModelScope.launch {
            delay(300)
            loadPosts()
        }
    }

    /**
     * Clear search
     */
    fun clearSearch() {
        _uiState.update { it.copy(searchQuery = "") }
        loadPosts()
    }

    /**
     * Refresh posts
     */
    fun refresh() {
        loadPosts()
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
