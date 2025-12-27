package com.prepverse.prepverse.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.api.dto.QuestionResponse
import com.prepverse.prepverse.data.repository.OnboardingRepository
import com.prepverse.prepverse.domain.model.Difficulty
import com.prepverse.prepverse.domain.model.OnboardingQuestion
import com.prepverse.prepverse.domain.model.QuestionAttempt
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class OnboardingUiState(
    val step: OnboardingStep = OnboardingStep.WELCOME,
    val selectedClass: Int? = null,
    val questions: List<OnboardingQuestion> = emptyList(),
    val currentQuestionIndex: Int = 0,
    val selectedAnswer: String? = null,
    val answers: List<QuestionAttempt> = emptyList(),
    val timeRemainingSeconds: Int = 600, // 10 minutes
    val isLoading: Boolean = false,
    val error: String? = null,
    val score: Int = 0,
    val scorePercentage: Float = 0f,
    val strengths: List<String> = emptyList(),
    val weaknesses: List<String> = emptyList(),
    val recommendations: String = ""
)

enum class OnboardingStep {
    WELCOME,
    CLASS_SELECTION,
    ASSESSMENT,
    RESULTS
}

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val onboardingRepository: OnboardingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var questionStartTime: Long = 0

    // Store raw API questions for submission
    private var apiQuestions: List<QuestionResponse> = emptyList()

    fun selectClass(studentClass: Int) {
        _uiState.update {
            it.copy(
                selectedClass = studentClass,
                step = OnboardingStep.CLASS_SELECTION
            )
        }
    }

    fun startAssessment() {
        val selectedClass = _uiState.value.selectedClass ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Fetch questions from backend
            onboardingRepository.getOnboardingQuestions()
                .onSuccess { questions ->
                    Timber.d("Fetched ${questions.size} onboarding questions from backend")
                    apiQuestions = questions
                    val domainQuestions = questions.map { it.toDomainModel(selectedClass) }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = OnboardingStep.ASSESSMENT,
                            questions = domainQuestions,
                            currentQuestionIndex = 0,
                            timeRemainingSeconds = 600
                        )
                    }

                    startTimer()
                    questionStartTime = System.currentTimeMillis()
                }
                .onFailure { error ->
                    Timber.e(error, "Failed to fetch questions, using mock data")
                    // Fallback to mock questions
                    val questions = getMockQuestions(selectedClass)

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = OnboardingStep.ASSESSMENT,
                            questions = questions,
                            currentQuestionIndex = 0,
                            timeRemainingSeconds = 600,
                            error = "Using offline questions: ${error.message}"
                        )
                    }

                    startTimer()
                    questionStartTime = System.currentTimeMillis()
                }
        }
    }

    /**
     * Convert API response to domain model
     */
    private fun QuestionResponse.toDomainModel(studentClass: Int): OnboardingQuestion {
        return OnboardingQuestion(
            id = id,
            studentClass = studentClass,
            subject = subject,
            topic = topic,
            subtopic = topic, // API doesn't have subtopic, use topic
            difficulty = when (difficulty.lowercase()) {
                "easy" -> Difficulty.EASY
                "medium" -> Difficulty.MEDIUM
                "hard" -> Difficulty.HARD
                else -> Difficulty.MEDIUM
            },
            question = question,
            options = options,
            correctAnswer = "", // Not provided in response (hidden from client)
            explanation = "", // Not provided in response
            timeEstimateSeconds = timeEstimateSeconds,
            conceptTags = emptyList()
        )
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (_uiState.value.timeRemainingSeconds > 0) {
                delay(1000)
                _uiState.update { it.copy(timeRemainingSeconds = it.timeRemainingSeconds - 1) }
            }
            // Time's up - auto submit
            finishAssessment()
        }
    }

    fun selectAnswer(answer: String) {
        _uiState.update { it.copy(selectedAnswer = answer) }
    }

    fun nextQuestion() {
        val state = _uiState.value
        val currentQuestion = state.questions.getOrNull(state.currentQuestionIndex) ?: return
        val selectedAnswer = state.selectedAnswer ?: return

        val timeTaken = ((System.currentTimeMillis() - questionStartTime) / 1000).toInt()

        // For API questions, we don't have the correct answer locally
        // The backend will evaluate correctness
        val isCorrect = if (apiQuestions.isNotEmpty()) {
            false // Will be evaluated by backend
        } else {
            selectedAnswer == currentQuestion.correctAnswer
        }

        val attempt = QuestionAttempt(
            questionId = currentQuestion.id,
            answer = selectedAnswer,
            isCorrect = isCorrect,
            timeTakenSeconds = timeTaken
        )

        val newAnswers = state.answers + attempt

        if (state.currentQuestionIndex < state.questions.size - 1) {
            // Move to next question
            _uiState.update {
                it.copy(
                    currentQuestionIndex = it.currentQuestionIndex + 1,
                    selectedAnswer = null,
                    answers = newAnswers
                )
            }
            questionStartTime = System.currentTimeMillis()
        } else {
            // Assessment complete
            _uiState.update { it.copy(answers = newAnswers) }
            finishAssessment()
        }
    }

    private fun finishAssessment() {
        timerJob?.cancel()

        val state = _uiState.value

        // If we used API questions, submit to backend
        if (apiQuestions.isNotEmpty()) {
            submitToBackend()
        } else {
            // Local evaluation for mock questions
            evaluateLocally()
        }
    }

    /**
     * Submit answers to backend for evaluation
     */
    private fun submitToBackend() {
        val state = _uiState.value

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Build answers list from attempts
            val answers = state.answers.mapIndexed { index, attempt ->
                val questionId = apiQuestions.getOrNull(index)?.id ?: state.questions.getOrNull(index)?.id ?: ""
                questionId to attempt.answer
            }

            onboardingRepository.submitOnboarding(answers)
                .onSuccess { response ->
                    Timber.d("Onboarding submitted successfully. Score: ${response.scorePercentage}%")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = OnboardingStep.RESULTS,
                            score = response.correctAnswers,
                            scorePercentage = response.scorePercentage,
                            strengths = response.strongTopics,
                            weaknesses = response.weakTopics,
                            recommendations = response.recommendations
                        )
                    }
                }
                .onFailure { error ->
                    Timber.e(error, "Failed to submit to backend, evaluating locally")
                    // Fallback to local evaluation
                    evaluateLocally()
                }
        }
    }

    /**
     * Local evaluation fallback when backend is unavailable
     */
    private fun evaluateLocally() {
        val state = _uiState.value
        val score = state.answers.count { it.isCorrect }
        val scorePercentage = if (state.questions.isNotEmpty()) {
            (score.toFloat() / state.questions.size) * 100
        } else 0f

        // Calculate strengths and weaknesses
        val topicPerformance = mutableMapOf<String, MutableList<Boolean>>()
        state.questions.forEachIndexed { index, question ->
            val attempt = state.answers.getOrNull(index)
            if (attempt != null) {
                val topic = question.topic
                topicPerformance.getOrPut(topic) { mutableListOf() }.add(attempt.isCorrect)
            }
        }

        val topicScores = topicPerformance.mapValues { (_, results) ->
            results.count { it }.toFloat() / results.size
        }

        val strengths = topicScores.filter { it.value >= 0.7f }.keys.toList()
        val weaknesses = topicScores.filter { it.value < 0.5f }.keys.toList()

        _uiState.update {
            it.copy(
                isLoading = false,
                step = OnboardingStep.RESULTS,
                score = score,
                scorePercentage = scorePercentage,
                strengths = strengths,
                weaknesses = weaknesses,
                recommendations = generateLocalRecommendations(weaknesses)
            )
        }
    }

    /**
     * Generate recommendations locally when backend is unavailable
     */
    private fun generateLocalRecommendations(weaknesses: List<String>): String {
        return if (weaknesses.isEmpty()) {
            "Great job! You have a solid foundation. Keep practicing to maintain your skills."
        } else {
            "Focus on improving these topics: ${weaknesses.joinToString(", ")}. Regular practice will help strengthen your understanding."
        }
    }

    private fun getMockQuestions(studentClass: Int): List<OnboardingQuestion> {
        // Mock questions for testing - replace with API call
        return listOf(
            OnboardingQuestion(
                id = "onb_001",
                studentClass = studentClass,
                subject = "mathematics",
                topic = "algebra",
                subtopic = "polynomials",
                difficulty = Difficulty.EASY,
                question = "What is the degree of the polynomial 3x^4 + 2x^2 - 7x + 1?",
                options = listOf("1", "2", "3", "4"),
                correctAnswer = "4",
                explanation = "The degree is the highest power of x, which is 4.",
                timeEstimateSeconds = 30,
                conceptTags = listOf("polynomial", "degree")
            ),
            OnboardingQuestion(
                id = "onb_002",
                studentClass = studentClass,
                subject = "mathematics",
                topic = "algebra",
                subtopic = "quadratic_equations",
                difficulty = Difficulty.EASY,
                question = "The roots of the equation x^2 - 5x + 6 = 0 are:",
                options = listOf("2 and 3", "1 and 6", "-2 and -3", "2 and -3"),
                correctAnswer = "2 and 3",
                explanation = "Factoring: (x-2)(x-3) = 0",
                timeEstimateSeconds = 45,
                conceptTags = listOf("quadratic", "factoring")
            ),
            OnboardingQuestion(
                id = "onb_003",
                studentClass = studentClass,
                subject = "science",
                topic = "physics",
                subtopic = "electricity",
                difficulty = Difficulty.EASY,
                question = "The SI unit of electric current is:",
                options = listOf("Volt", "Ampere", "Ohm", "Watt"),
                correctAnswer = "Ampere",
                explanation = "Electric current is measured in Amperes (A).",
                timeEstimateSeconds = 20,
                conceptTags = listOf("electricity", "units")
            ),
            OnboardingQuestion(
                id = "onb_004",
                studentClass = studentClass,
                subject = "science",
                topic = "chemistry",
                subtopic = "acids_bases",
                difficulty = Difficulty.EASY,
                question = "The pH of a neutral solution is:",
                options = listOf("0", "7", "14", "1"),
                correctAnswer = "7",
                explanation = "pH 7 indicates a neutral solution.",
                timeEstimateSeconds = 20,
                conceptTags = listOf("pH", "neutral")
            ),
            OnboardingQuestion(
                id = "onb_005",
                studentClass = studentClass,
                subject = "mathematics",
                topic = "trigonometry",
                subtopic = "ratios",
                difficulty = Difficulty.EASY,
                question = "The value of sin 30 degrees is:",
                options = listOf("0", "1/2", "1", "sqrt(3)/2"),
                correctAnswer = "1/2",
                explanation = "sin 30° = 1/2 is a standard value.",
                timeEstimateSeconds = 20,
                conceptTags = listOf("trigonometry", "sin")
            ),
            OnboardingQuestion(
                id = "onb_006",
                studentClass = studentClass,
                subject = "science",
                topic = "physics",
                subtopic = "light",
                difficulty = Difficulty.MEDIUM,
                question = "The angle of incidence equals angle of reflection. This is the law of:",
                options = listOf("Refraction", "Reflection", "Diffraction", "Polarization"),
                correctAnswer = "Reflection",
                explanation = "First law of reflection.",
                timeEstimateSeconds = 25,
                conceptTags = listOf("light", "reflection")
            ),
            OnboardingQuestion(
                id = "onb_007",
                studentClass = studentClass,
                subject = "mathematics",
                topic = "geometry",
                subtopic = "coordinate_geometry",
                difficulty = Difficulty.MEDIUM,
                question = "The distance between points (3, 4) and (0, 0) is:",
                options = listOf("3", "4", "5", "7"),
                correctAnswer = "5",
                explanation = "sqrt(9+16) = sqrt(25) = 5",
                timeEstimateSeconds = 40,
                conceptTags = listOf("distance_formula")
            ),
            OnboardingQuestion(
                id = "onb_008",
                studentClass = studentClass,
                subject = "science",
                topic = "chemistry",
                subtopic = "chemical_reactions",
                difficulty = Difficulty.MEDIUM,
                question = "Burning of magnesium is an example of:",
                options = listOf("Decomposition", "Combination", "Displacement", "Double displacement"),
                correctAnswer = "Combination",
                explanation = "2Mg + O2 -> 2MgO is a combination reaction.",
                timeEstimateSeconds = 30,
                conceptTags = listOf("chemical_reactions", "combination")
            ),
            OnboardingQuestion(
                id = "onb_009",
                studentClass = studentClass,
                subject = "science",
                topic = "biology",
                subtopic = "life_processes",
                difficulty = Difficulty.EASY,
                question = "The process of breakdown of glucose to release energy is called:",
                options = listOf("Photosynthesis", "Respiration", "Digestion", "Excretion"),
                correctAnswer = "Respiration",
                explanation = "Respiration breaks down glucose for energy.",
                timeEstimateSeconds = 25,
                conceptTags = listOf("respiration", "energy")
            ),
            OnboardingQuestion(
                id = "onb_010",
                studentClass = studentClass,
                subject = "mathematics",
                topic = "statistics",
                subtopic = "mean",
                difficulty = Difficulty.EASY,
                question = "The mean of 2, 4, 6, 8, 10 is:",
                options = listOf("4", "5", "6", "7"),
                correctAnswer = "6",
                explanation = "Mean = (2+4+6+8+10)/5 = 30/5 = 6",
                timeEstimateSeconds = 30,
                conceptTags = listOf("statistics", "mean")
            )
        )
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
