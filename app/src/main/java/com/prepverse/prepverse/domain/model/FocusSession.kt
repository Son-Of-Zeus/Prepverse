package com.prepverse.prepverse.domain.model

import java.util.UUID

/**
 * Represents the current state of a focus session
 */
enum class FocusState {
    IDLE,        // Not started
    FOCUSING,    // Active focus period
    BREAK,       // Break time
    PAUSED,      // Temporarily paused
    COMPLETED,   // Session finished normally
    TERMINATED   // Ended due to violations
}

/**
 * Data model for a focus session
 */
data class FocusSession(
    val id: String = UUID.randomUUID().toString(),
    val focusDurationMinutes: Int = 25,
    val breakDurationMinutes: Int = 5,
    val startTime: Long = 0L,
    val endTime: Long? = null,
    val state: FocusState = FocusState.IDLE,
    val violations: Int = 0,
    val maxViolations: Int = 3,
    val totalFocusTimeSeconds: Long = 0L,
    val isQuizMode: Boolean = false,
    val timeRemainingSeconds: Int = 0
) {
    val isActive: Boolean
        get() = state == FocusState.FOCUSING || state == FocusState.BREAK

    val isTerminated: Boolean
        get() = state == FocusState.TERMINATED

    val hasReachedMaxViolations: Boolean
        get() = violations >= maxViolations

    val remainingViolations: Int
        get() = (maxViolations - violations).coerceAtLeast(0)

    companion object {
        const val DEFAULT_FOCUS_DURATION = 25
        const val DEFAULT_BREAK_DURATION = 5
        const val MIN_FOCUS_DURATION = 5
        const val MAX_FOCUS_DURATION = 120
        const val MIN_BREAK_DURATION = 1
        const val MAX_BREAK_DURATION = 30
        const val DEFAULT_MAX_VIOLATIONS = 3
    }
}

/**
 * Settings for focus mode
 */
data class FocusModeSettings(
    val focusDurationMinutes: Int = FocusSession.DEFAULT_FOCUS_DURATION,
    val breakDurationMinutes: Int = FocusSession.DEFAULT_BREAK_DURATION,
    val enableDnd: Boolean = true,
    val enableAppBlocking: Boolean = true
)
