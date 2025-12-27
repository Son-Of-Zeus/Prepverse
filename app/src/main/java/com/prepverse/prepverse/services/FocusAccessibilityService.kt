package com.prepverse.prepverse.services

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import timber.log.Timber

/**
 * Accessibility service that monitors app switches during focus mode.
 * Detects when the user leaves the PrepVerse app and broadcasts a violation event.
 */
class FocusAccessibilityService : AccessibilityService() {

    companion object {
        const val ACTION_FOCUS_VIOLATION = "com.prepverse.prepverse.FOCUS_VIOLATION"
        const val EXTRA_VIOLATION_REASON = "violation_reason"
        const val EXTRA_PACKAGE_NAME = "package_name"

        private const val PREPVERSE_PACKAGE = "com.prepverse.prepverse"

        @Volatile
        var isFocusModeActive: Boolean = false
            private set

        @Volatile
        var isQuizModeActive: Boolean = false
            private set

        fun setFocusModeActive(active: Boolean) {
            isFocusModeActive = active
            Timber.d("Focus mode active: $active")
        }

        fun setQuizModeActive(active: Boolean) {
            isQuizModeActive = active
            Timber.d("Quiz mode active: $active")
        }

        @Volatile
        var instance: FocusAccessibilityService? = null
            private set

        fun isServiceEnabled(): Boolean = instance != null
    }

    private var lastPackageName: String = PREPVERSE_PACKAGE
    private var violationInProgress = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Timber.d("FocusAccessibilityService connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Only process window state changes
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        // Only check when focus or quiz mode is active
        if (!isFocusModeActive && !isQuizModeActive) return

        val packageName = event.packageName?.toString() ?: return

        // Skip system UI and launcher (some system packages)
        if (isSystemPackage(packageName)) return

        // Check if user switched away from PrepVerse
        if (packageName != PREPVERSE_PACKAGE && lastPackageName == PREPVERSE_PACKAGE) {
            if (!violationInProgress) {
                violationInProgress = true
                onViolationDetected(packageName)
            }
        } else if (packageName == PREPVERSE_PACKAGE) {
            // User returned to PrepVerse
            violationInProgress = false
        }

        lastPackageName = packageName
    }

    private fun isSystemPackage(packageName: String): Boolean {
        return packageName.startsWith("com.android.systemui") ||
                packageName.startsWith("com.google.android.inputmethod") ||
                packageName.startsWith("com.samsung.android.inputmethod") ||
                packageName == "android" ||
                packageName.contains("launcher") ||
                packageName.contains("keyboard")
    }

    private fun onViolationDetected(packageName: String) {
        Timber.w("Focus violation detected! User switched to: $packageName")

        // Broadcast violation to FocusModeService
        val intent = Intent(ACTION_FOCUS_VIOLATION).apply {
            setPackage(PREPVERSE_PACKAGE)
            putExtra(EXTRA_VIOLATION_REASON, "Switched to another app: $packageName")
            putExtra(EXTRA_PACKAGE_NAME, packageName)
        }
        sendBroadcast(intent)

        // Bring PrepVerse back to foreground
        bringPrepVerseToForeground()
    }

    private fun bringPrepVerseToForeground() {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(PREPVERSE_PACKAGE)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(launchIntent)
        } catch (e: Exception) {
            Timber.e(e, "Failed to bring PrepVerse to foreground")
        }
    }

    override fun onInterrupt() {
        Timber.d("FocusAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isFocusModeActive = false
        isQuizModeActive = false
        Timber.d("FocusAccessibilityService destroyed")
    }
}
