package com.prepverse.prepverse.ui.screens.practice

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.QuestionReview
import com.prepverse.prepverse.data.remote.api.dto.SessionSummary
import com.prepverse.prepverse.data.repository.PracticeRepository
import com.prepverse.prepverse.data.repository.PracticeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ResultsUiState(
    val sessionId: String = "",
    val isLoading: Boolean = true,
    val error: String? = null,
    val summary: SessionSummary? = null,
    val questionsReview: List<QuestionReview> = emptyList(),
    val selectedTab: ResultsTab = ResultsTab.SUMMARY,
    val expandedQuestionIndex: Int? = null
)

enum class ResultsTab {
    SUMMARY, REVIEW
}

@HiltViewModel
class ResultsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val practiceRepository: PracticeRepository
) : ViewModel() {

    private val sessionId: String = savedStateHandle.get<String>("sessionId") ?: ""

    private val _uiState = MutableStateFlow(ResultsUiState(sessionId = sessionId))
    val uiState: StateFlow<ResultsUiState> = _uiState.asStateFlow()

    init {
        if (sessionId.isNotEmpty()) {
            loadResults()
        }
    }

    fun loadResults() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = practiceRepository.getSessionReview(sessionId)) {
                is PracticeResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            summary = data.summary,
                            questionsReview = data.questionsReview
                        )
                    }
                }

                is PracticeResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }

                PracticeResult.Loading -> {}
            }
        }
    }

    fun selectTab(tab: ResultsTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun toggleQuestionExpanded(index: Int) {
        _uiState.update {
            it.copy(
                expandedQuestionIndex = if (it.expandedQuestionIndex == index) null else index
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
