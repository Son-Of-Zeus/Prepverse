package com.prepverse.prepverse.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val strengths: List<String> = emptyList(),
    val weaknesses: List<String> = emptyList()
)

enum class OnboardingStep {
    WELCOME,
    CLASS_SELECTION,
    ASSESSMENT,
    RESULTS
}

@HiltViewModel
class OnboardingViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var questionStartTime: Long = 0

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
            _uiState.update { it.copy(isLoading = true) }

            // TODO: Fetch questions from backend
            // For now, use mock questions
            val questions = getMockQuestions(selectedClass)

            _uiState.update {
                it.copy(
                    isLoading = false,
                    step = OnboardingStep.ASSESSMENT,
                    questions = questions,
                    currentQuestionIndex = 0,
                    timeRemainingSeconds = 600
                )
            }

            startTimer()
            questionStartTime = System.currentTimeMillis()
        }
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
        val isCorrect = selectedAnswer == currentQuestion.correctAnswer

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
        val score = state.answers.count { it.isCorrect }

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
                step = OnboardingStep.RESULTS,
                score = score,
                strengths = strengths,
                weaknesses = weaknesses
            )
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
