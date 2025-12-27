package com.prepverse.prepverse.ui.screens.practice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.TopicInfo
import com.prepverse.prepverse.data.repository.PracticeRepository
import com.prepverse.prepverse.data.repository.PracticeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PracticeUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val subjects: List<String> = emptyList(),
    val topics: List<TopicInfo> = emptyList(),
    val selectedSubject: String? = null,
    val filteredTopics: List<TopicInfo> = emptyList(),

    // Session configuration
    val selectedTopic: TopicInfo? = null,
    val selectedDifficulty: String? = null, // null = adaptive
    val questionCount: Int = 10,
    val timeLimitMinutes: Int? = null, // null = no time limit

    // Session state
    val isStartingSession: Boolean = false,
    val sessionId: String? = null
)

@HiltViewModel
class PracticeViewModel @Inject constructor(
    private val practiceRepository: PracticeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PracticeUiState())
    val uiState: StateFlow<PracticeUiState> = _uiState.asStateFlow()

    init {
        loadTopics()
    }

    fun loadTopics() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = practiceRepository.getTopics()) {
                is PracticeResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            subjects = data.subjects,
                            topics = data.topics,
                            filteredTopics = data.topics,
                            // Select first subject by default
                            selectedSubject = data.subjects.firstOrNull()
                        )
                    }
                    // Filter by first subject if available
                    data.subjects.firstOrNull()?.let { selectSubject(it) }
                }

                is PracticeResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }

                PracticeResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    fun selectSubject(subject: String) {
        _uiState.update { state ->
            state.copy(
                selectedSubject = subject,
                filteredTopics = state.topics.filter { it.subject == subject },
                selectedTopic = null // Reset topic selection when subject changes
            )
        }
    }

    fun selectTopic(topic: TopicInfo) {
        _uiState.update { it.copy(selectedTopic = topic) }
    }

    fun clearTopicSelection() {
        _uiState.update { it.copy(selectedTopic = null) }
    }

    fun selectDifficulty(difficulty: String?) {
        _uiState.update { it.copy(selectedDifficulty = difficulty) }
    }

    fun setQuestionCount(count: Int) {
        _uiState.update { it.copy(questionCount = count.coerceIn(5, 30)) }
    }

    fun setTimeLimit(minutes: Int?) {
        _uiState.update { it.copy(timeLimitMinutes = minutes) }
    }

    fun startSession(onSessionStarted: (String) -> Unit) {
        val state = _uiState.value
        val subject = state.selectedSubject ?: return
        val topic = state.selectedTopic?.topic

        viewModelScope.launch {
            _uiState.update { it.copy(isStartingSession = true, error = null) }

            val result = practiceRepository.startSession(
                subject = subject,
                topic = topic,
                difficulty = state.selectedDifficulty,
                questionCount = state.questionCount,
                timeLimitSeconds = state.timeLimitMinutes?.let { it * 60 }
            )

            when (result) {
                is PracticeResult.Success -> {
                    val sessionId = result.data.sessionId
                    _uiState.update {
                        it.copy(
                            isStartingSession = false,
                            sessionId = sessionId
                        )
                    }
                    onSessionStarted(sessionId)
                }

                is PracticeResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isStartingSession = false,
                            error = result.message
                        )
                    }
                }

                PracticeResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
