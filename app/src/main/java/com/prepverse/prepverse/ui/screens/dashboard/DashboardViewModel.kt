package com.prepverse.prepverse.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.ConceptMastery
import com.prepverse.prepverse.data.remote.api.dto.TopicInfo
import com.prepverse.prepverse.data.repository.DashboardRepository
import com.prepverse.prepverse.data.repository.PracticeRepository
import com.prepverse.prepverse.data.repository.PracticeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val currentStreak: Int = 0,
    val totalXP: Int = 0,
    val longestStreak: Int = 0,
    val dailyXP: Int = 0,
    val continueLearning: List<SuggestedTopic> = emptyList(),
    val suggestedTopics: List<SuggestedTopic> = emptyList(),
    val totalSessions: Int = 0,
    val overallAccuracy: Float = 0f,
    val totalStudyTimeMinutes: Int = 0,
    // SWOT Analysis data
    val concepts: List<ConceptMastery> = emptyList(),
    val selectedSubject: String? = null,
    val availableSubjects: List<String> = listOf("Mathematics", "Physics", "Chemistry", "Biology"),
    val isLoadingConcepts: Boolean = false
)

data class SuggestedTopic(
    val subject: String,
    val topic: String,
    val displayName: String,
    val progress: Float // 0.0 to 1.0
)

// SWOT Analysis insight item
data class SWOTInsight(
    val label: String,
    val description: String
)

// SWOT Analysis data
data class SWOTAnalysisData(
    val strengths: List<SWOTInsight>,
    val weaknesses: List<SWOTInsight>,
    val opportunities: List<SWOTInsight>,
    val threats: List<SWOTInsight>
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val practiceRepository: PracticeRepository,
    private val dashboardRepository: DashboardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Fetch from both endpoints in parallel for real data
            val progressDeferred = async { practiceRepository.getProgressSummary() }
            val dashboardDeferred = async { dashboardRepository.getDashboard() }

            val progressResult = progressDeferred.await()
            val dashboardResult = dashboardDeferred.await()

            // Get real streak/XP from dashboard endpoint (fallback to 0 if unavailable)
            val streakInfo = dashboardResult.getOrNull()?.streakInfo
            val currentStreak = streakInfo?.currentStreak ?: 0
            val longestStreak = streakInfo?.longestStreak ?: 0
            val totalXP = streakInfo?.totalXP ?: 0
            val dailyXP = dashboardResult.getOrNull()?.dailyXP ?: 0

            if (dashboardResult.isFailure) {
                Timber.w("Failed to fetch dashboard data for streak/XP, using defaults")
            }

            when (progressResult) {
                is PracticeResult.Success -> {
                    val data = progressResult.data
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = null,
                        currentStreak = currentStreak,
                        totalXP = totalXP,
                        longestStreak = longestStreak,
                        dailyXP = dailyXP,
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
                        error = progressResult.message
                    )
                }
                is PracticeResult.Loading -> {
                    // Already set loading state above
                }
            }
        }
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

    /**
     * Select a subject for SWOT analysis
     */
    fun selectSubject(subject: String?) {
        _uiState.value = _uiState.value.copy(selectedSubject = subject)
        loadConceptProgress(subject)
    }

    /**
     * Load concept mastery data for SWOT analysis
     */
    private fun loadConceptProgress(subject: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingConcepts = true)

            // Send lowercase subject to API (backend expects lowercase)
            val apiSubject = subject?.lowercase()
            Timber.d("Loading concept progress for subject: $apiSubject")

            when (val result = practiceRepository.getConceptProgress(apiSubject)) {
                is PracticeResult.Success -> {
                    Timber.d("Loaded ${result.data.concepts.size} concepts for SWOT analysis")
                    _uiState.value = _uiState.value.copy(
                        concepts = result.data.concepts,
                        isLoadingConcepts = false
                    )
                }
                is PracticeResult.Error -> {
                    Timber.w("Failed to load concept progress: ${result.message}")
                    _uiState.value = _uiState.value.copy(
                        concepts = emptyList(),
                        isLoadingConcepts = false
                    )
                }
                is PracticeResult.Loading -> {
                    // Already set loading state
                }
            }
        }
    }

    /**
     * Generate SWOT analysis from concept mastery data
     */
    fun generateSWOTAnalysis(): SWOTAnalysisData? {
        val concepts = _uiState.value.concepts
        if (concepts.isEmpty()) return null

        val avgAccuracy = concepts.map { it.accuracy }.average().toFloat()
        val strongTopics = concepts.filter { it.accuracy >= 70f }
        val weakTopics = concepts.filter { it.accuracy < 60f }
        val streak = _uiState.value.currentStreak
        val totalAttempts = concepts.sumOf { it.totalAttempts }

        // Strengths - always provide at least one insight
        val strengths = mutableListOf<SWOTInsight>()
        if (avgAccuracy > 75) {
            strengths.add(SWOTInsight("Excellent Mastery", "Performing at top tier (${avgAccuracy.toInt()}%)"))
        } else if (avgAccuracy > 50) {
            strengths.add(SWOTInsight("Solid Foundation", "Good baseline accuracy (${avgAccuracy.toInt()}%)"))
        } else if (avgAccuracy > 30) {
            strengths.add(SWOTInsight("Building Up", "Making progress (${avgAccuracy.toInt()}%)"))
        }
        if (strongTopics.isNotEmpty()) {
            strengths.add(SWOTInsight("Power Topics", "${strongTopics.size} concepts mastered"))
        }
        if (totalAttempts > 0 && strengths.isEmpty()) {
            strengths.add(SWOTInsight("Active Learner", "$totalAttempts questions attempted"))
        }
        if (streak > 0 && strengths.size < 2) {
            strengths.add(SWOTInsight("Consistent", "$streak day streak going"))
        }
        // Fallback if still empty
        if (strengths.isEmpty()) {
            strengths.add(SWOTInsight("Getting Started", "Keep practicing to build strengths"))
        }

        // Weaknesses
        val weaknesses = mutableListOf<SWOTInsight>()
        if (weakTopics.isNotEmpty()) {
            val weakest = weakTopics.minByOrNull { it.accuracy }
            if (weakest != null) {
                weaknesses.add(SWOTInsight(weakest.displayName, "Critical focus needed (${weakest.accuracy.toInt()}%)"))
            }
            if (weakTopics.size > 1) {
                weaknesses.add(SWOTInsight("Growth Areas", "${weakTopics.size} topics need review"))
            }
        } else {
            weaknesses.add(SWOTInsight("No Critical Weaknesses", "Maintaining high standards"))
        }

        // Opportunities
        val opportunities = mutableListOf<SWOTInsight>()
        if (weakTopics.isNotEmpty()) {
            opportunities.add(SWOTInsight("Score Booster", "Reviewing weak topics boosts total score"))
        }
        val unpracticed = concepts.filter { it.totalAttempts == 0 }
        if (unpracticed.isNotEmpty()) {
            opportunities.add(SWOTInsight("Uncharted Territory", "${unpracticed.size} new topics to explore"))
        } else if (opportunities.isEmpty()) {
            opportunities.add(SWOTInsight("Consistency", "Maintain your daily streak"))
        }
        // Fallback
        if (opportunities.isEmpty()) {
            opportunities.add(SWOTInsight("Keep Going", "Practice more to unlock insights"))
        }

        // Threats
        val threats = mutableListOf<SWOTInsight>()
        if (streak < 2) {
            threats.add(SWOTInsight("Momentum Loss", "Try to practice daily"))
        }
        val critical = concepts.filter { it.accuracy < 40f && it.totalAttempts > 5 }
        if (critical.isNotEmpty()) {
            threats.add(SWOTInsight("Concept Gaps", "${critical.size} topics showing struggle"))
        }
        if (threats.isEmpty()) {
            threats.add(SWOTInsight("All Clear", "No immediate risks detected"))
        }

        return SWOTAnalysisData(
            strengths = strengths.take(2),
            weaknesses = weaknesses.take(2),
            opportunities = opportunities.take(2),
            threats = threats.take(2)
        )
    }
}
