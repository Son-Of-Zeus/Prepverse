package com.prepverse.prepverse.domain.model

data class OnboardingQuestion(
    val id: String,
    val studentClass: Int,
    val subject: String,
    val topic: String,
    val subtopic: String?,
    val difficulty: Difficulty,
    val questionType: String = "mcq",
    val question: String,
    val options: List<String>,
    val correctAnswer: String,
    val explanation: String,
    val timeEstimateSeconds: Int,
    val conceptTags: List<String>
)

data class Question(
    val id: String,
    val externalId: String?,
    val studentClass: Int,
    val subject: String,
    val topic: String,
    val subtopic: String?,
    val difficulty: Difficulty,
    val questionType: String = "mcq",
    val questionText: String,
    val options: List<String>,
    val correctAnswer: String,
    val explanation: String?,
    val conceptTags: List<String>,
    val source: String = "generated"
)

enum class Difficulty {
    EASY, MEDIUM, HARD;

    companion object {
        fun fromString(value: String): Difficulty {
            return when (value.lowercase()) {
                "easy" -> EASY
                "medium" -> MEDIUM
                "hard" -> HARD
                else -> MEDIUM
            }
        }
    }
}

data class QuestionAttempt(
    val questionId: String,
    val answer: String,
    val isCorrect: Boolean,
    val timeTakenSeconds: Int
)

enum class Subject(val displayName: String, val colorHex: String) {
    MATHEMATICS("Mathematics", "#536DFE"),
    PHYSICS("Physics", "#00BCD4"),
    CHEMISTRY("Chemistry", "#FF7043"),
    BIOLOGY("Biology", "#66BB6A");

    companion object {
        fun fromString(value: String): Subject? {
            return entries.find {
                it.name.equals(value, ignoreCase = true) ||
                it.displayName.equals(value, ignoreCase = true)
            }
        }
    }
}
