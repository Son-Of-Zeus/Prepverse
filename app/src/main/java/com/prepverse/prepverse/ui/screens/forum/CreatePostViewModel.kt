package com.prepverse.prepverse.ui.screens.forum

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.repository.ForumRepository
import com.prepverse.prepverse.domain.model.ForumCategory
import com.prepverse.prepverse.domain.model.ForumPost
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreatePostUiState(
    val title: String = "",
    val content: String = "",
    val selectedCategory: ForumCategory = ForumCategory.GENERAL,
    val tags: List<String> = emptyList(),
    val tagInput: String = "",
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val createdPost: ForumPost? = null,
    val categories: List<ForumCategory> = ForumCategory.all()
) {
    val isValid: Boolean
        get() = title.isNotBlank() && content.isNotBlank()
}

@HiltViewModel
class CreatePostViewModel @Inject constructor(
    private val forumRepository: ForumRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreatePostUiState())
    val uiState: StateFlow<CreatePostUiState> = _uiState.asStateFlow()

    /**
     * Update title
     */
    fun updateTitle(title: String) {
        _uiState.update { it.copy(title = title) }
    }

    /**
     * Update content
     */
    fun updateContent(content: String) {
        _uiState.update { it.copy(content = content) }
    }

    /**
     * Select category
     */
    fun selectCategory(category: ForumCategory) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    /**
     * Update tag input
     */
    fun updateTagInput(input: String) {
        _uiState.update { it.copy(tagInput = input) }
    }

    /**
     * Add a tag
     */
    fun addTag() {
        val tag = _uiState.value.tagInput.trim().lowercase()
        if (tag.isNotEmpty() && tag !in _uiState.value.tags && _uiState.value.tags.size < 5) {
            _uiState.update {
                it.copy(
                    tags = it.tags + tag,
                    tagInput = ""
                )
            }
        }
    }

    /**
     * Remove a tag
     */
    fun removeTag(tag: String) {
        _uiState.update {
            it.copy(tags = it.tags.filter { t -> t != tag })
        }
    }

    /**
     * Submit the post
     */
    fun submitPost() {
        if (!_uiState.value.isValid) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val result = forumRepository.createPost(
                title = _uiState.value.title.trim(),
                content = _uiState.value.content.trim(),
                category = _uiState.value.selectedCategory.apiName,
                tags = _uiState.value.tags.takeIf { it.isNotEmpty() }
            )

            result.fold(
                onSuccess = { post ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            createdPost = post
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = error.message ?: "Failed to create post"
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
}
