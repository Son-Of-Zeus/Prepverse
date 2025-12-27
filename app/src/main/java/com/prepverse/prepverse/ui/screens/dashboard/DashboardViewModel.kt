package com.prepverse.prepverse.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.ProgressSummaryResponse
import com.prepverse.prepverse.data.remote.api.dto.TopicInfo
import com.prepverse.prepverse.data.repository.PracticeRepository
import com.prepverse.prepverse.data.repository.PracticeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val currentStreak: Int = 0,
    val totalXP: Int = 0,
    val continueLearning: List<SuggestedTopic> = emptyList(),
    val suggestedTopics: List<SuggestedTopic> = emptyList(),
    val totalSessions: Int = 0,
    val overallAccuracy: Float = 0f,
    val totalStudyTimeMinutes: Int = 0
)

data class SuggestedTopic(
    val subject: String,
    val topic: String,
    val displayName: String,
    val progress: Float // 0.0 to 1.0
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val practiceRepository: PracticeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            when (val result = practiceRepository.getProgressSummary()) {
                is PracticeResult.Success -> {
                    val data = result.data
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = null,
                        currentStreak = calculateStreak(data),
                        totalXP = calculateXP(data),
                        continueLearning = mapTopics(data.continueLearning, data.subjectScores),
                        suggestedTopics = mapTopics(data.suggestedTopics, data.subjectScores),
                        totalSessions = data.totalSessions,
                        overallAccuracy = data.overallAccuracy,
                        totalStudyTimeMinutes = data.totalStudyTimeMinutes
                    )
                }
                is PracticeResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is PracticeResult.Loading -> {
                    // Already set loading state above
                }
            }
        }
    }

    private fun calculateStreak(data: ProgressSummaryResponse): Int {
        // Use total sessions as a simple activity metric
        // In a full implementation, this would track consecutive daily activity
        return data.totalSessions.coerceAtMost(30) // Cap at 30 for display
    }

    private fun calculateXP(data: ProgressSummaryResponse): Int {
        // XP calculation:
        // - Base: 10 XP per correct answer
        // - Bonus: 5 XP per session completed
        val totalCorrect = (data.totalQuestionsAttempted * data.overallAccuracy / 100).toInt()
        val baseXP = totalCorrect * 10
        val sessionBonus = data.totalSessions * 5
        return baseXP + sessionBonus
    }

    private fun mapTopics(
        topics: List<TopicInfo>,
        subjectScores: Map<String, Float>
    ): List<SuggestedTopic> {
        return topics.map { topic ->
            // Use subject score as a proxy for progress
            // If we have subject data, use it; otherwise default to 0
            val subjectProgress = subjectScores[topic.subject]?.let { score ->
                // Convert accuracy percentage to progress (0-1)
                score / 100f
            } ?: 0f

            SuggestedTopic(
                subject = topic.subject,
                topic = topic.topic,
                displayName = topic.displayName,
                progress = subjectProgress.coerceIn(0f, 1f)
            )
        }
    }

    fun refresh() {
        loadDashboardData()
    }
}
