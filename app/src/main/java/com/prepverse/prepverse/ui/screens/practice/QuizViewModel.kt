package com.prepverse.prepverse.ui.screens.practice

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.SessionQuestion
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerResponse
import com.prepverse.prepverse.data.repository.PracticeRepository
import com.prepverse.prepverse.data.repository.PracticeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuizUiState(
    // Session info
    val sessionId: String = "",
    val isLoading: Boolean = true,
    val error: String? = null,

    // Current question
    val currentQuestion: SessionQuestion? = null,
    val currentQuestionNumber: Int = 0,
    val totalQuestions: Int = 0,
    val selectedAnswer: String? = null,

    // Timer
    val questionTimeSeconds: Int = 0,
    val sessionTimeSeconds: Int = 0,
    val timeRemainingSeconds: Int? = null, // null = no time limit

    // Answer feedback
    val showAnswerFeedback: Boolean = false,
    val lastAnswerResult: SubmitAnswerResponse? = null,

    // Progress
    val correctAnswers: Int = 0,
    val wrongAnswers: Int = 0,

    // Session status
    val isSubmitting: Boolean = false,
    val isSessionComplete: Boolean = false
)

@HiltViewModel
class QuizViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val practiceRepository: PracticeRepository
) : ViewModel() {

    private val sessionId: String = savedStateHandle.get<String>("sessionId") ?: ""

    private val _uiState = MutableStateFlow(QuizUiState(sessionId = sessionId))
    val uiState: StateFlow<QuizUiState> = _uiState.asStateFlow()

    private var questionTimerJob: Job? = null
    private var sessionTimerJob: Job? = null

    init {
        if (sessionId.isNotEmpty()) {
            loadNextQuestion()
            startSessionTimer()
        }
    }

    private fun startSessionTimer() {
        sessionTimerJob?.cancel()
        sessionTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { state ->
                    val newTimeRemaining = state.timeRemainingSeconds?.let { it - 1 }

                    // Check if time ran out
                    if (newTimeRemaining != null && newTimeRemaining <= 0) {
                        // Time's up! End the session
                        endSession(abandoned = false)
                    }

                    state.copy(
                        sessionTimeSeconds = state.sessionTimeSeconds + 1,
                        timeRemainingSeconds = newTimeRemaining?.coerceAtLeast(0)
                    )
                }
            }
        }
    }

    private fun startQuestionTimer() {
        questionTimerJob?.cancel()
        _uiState.update { it.copy(questionTimeSeconds = 0) }

        questionTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { it.copy(questionTimeSeconds = it.questionTimeSeconds + 1) }
            }
        }
    }

    fun loadNextQuestion() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    error = null,
                    showAnswerFeedback = false,
                    selectedAnswer = null
                )
            }

            when (val result = practiceRepository.getNextQuestion(sessionId)) {
                is PracticeResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentQuestion = data.question,
                            currentQuestionNumber = data.currentQuestionNumber,
                            totalQuestions = data.totalQuestions,
                            timeRemainingSeconds = data.timeRemainingSeconds,
                            sessionTimeSeconds = data.sessionElapsedSeconds
                        )
                    }
                    startQuestionTimer()
                }

                is PracticeResult.Error -> {
                    if (result.code == 404) {
                        // No more questions - session complete, end on backend
                        _uiState.update { it.copy(isLoading = false) }
                        endSession(abandoned = false)
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = result.message
                            )
                        }
                    }
                }

                PracticeResult.Loading -> {}
            }
        }
    }

    fun selectAnswer(answer: String) {
        if (_uiState.value.showAnswerFeedback || _uiState.value.isSubmitting) return
        _uiState.update { it.copy(selectedAnswer = answer) }
    }

    fun submitAnswer() {
        val state = _uiState.value
        val answer = state.selectedAnswer ?: return
        if (state.isSubmitting) return

        questionTimerJob?.cancel()

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val result = practiceRepository.submitAnswer(
                sessionId = sessionId,
                answer = answer,
                timeTakenSeconds = state.questionTimeSeconds
            )

            when (result) {
                is PracticeResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            showAnswerFeedback = true,
                            lastAnswerResult = data,
                            correctAnswers = data.currentScore,
                            wrongAnswers = data.questionsAnswered - data.currentScore
                        )
                    }
                }

                is PracticeResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = result.message
                        )
                    }
                    // Resume timer on error
                    startQuestionTimer()
                }

                PracticeResult.Loading -> {}
            }
        }
    }

    fun proceedToNext() {
        val state = _uiState.value
        if (state.lastAnswerResult?.questionsRemaining == 0) {
            // Session complete - end session on backend first
            endSession(abandoned = false)
        } else {
            loadNextQuestion()
        }
    }

    fun skipQuestion() {
        // Submit empty/skip answer
        questionTimerJob?.cancel()

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }

            // We'll submit with the current selected answer or skip
            val state = _uiState.value
            val answer = state.selectedAnswer ?: ""

            val result = practiceRepository.submitAnswer(
                sessionId = sessionId,
                answer = answer,
                timeTakenSeconds = state.questionTimeSeconds
            )

            when (result) {
                is PracticeResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            correctAnswers = result.data.currentScore,
                            wrongAnswers = result.data.questionsAnswered - result.data.currentScore
                        )
                    }

                    if (result.data.questionsRemaining == 0) {
                        // Session complete - end session on backend
                        endSession(abandoned = false)
                    } else {
                        loadNextQuestion()
                    }
                }

                is PracticeResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = result.message
                        )
                    }
                }

                PracticeResult.Loading -> {}
            }
        }
    }

    fun endSession(abandoned: Boolean = true) {
        stopTimers()

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val reason = if (abandoned) "User quit" else null
            val result = practiceRepository.endSession(sessionId, reason)

            when (result) {
                is PracticeResult.Success -> {
                    // Session ended successfully, now navigate to results
                    _uiState.update { it.copy(isSubmitting = false, isSessionComplete = true) }
                }
                is PracticeResult.Error -> {
                    // Show error and let user retry - don't navigate until session is properly ended
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = "Failed to complete session. Please try again."
                        )
                    }
                }
                PracticeResult.Loading -> {}
            }
        }
    }

    private fun stopTimers() {
        questionTimerJob?.cancel()
        sessionTimerJob?.cancel()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    override fun onCleared() {
        super.onCleared()
        stopTimers()
    }
}
