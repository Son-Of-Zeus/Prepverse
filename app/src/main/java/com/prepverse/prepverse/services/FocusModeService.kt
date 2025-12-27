package com.prepverse.prepverse.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.prepverse.prepverse.MainActivity
import com.prepverse.prepverse.R
import com.prepverse.prepverse.domain.model.FocusSession
import com.prepverse.prepverse.domain.model.FocusState
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import timber.log.Timber

/**
 * Foreground service that manages focus mode sessions.
 * Handles timer countdown, DND mode, and session state.
 */
class FocusModeService : Service() {

    companion object {
        const val ACTION_START_FOCUS = "com.prepverse.prepverse.START_FOCUS"
        const val ACTION_PAUSE_FOCUS = "com.prepverse.prepverse.PAUSE_FOCUS"
        const val ACTION_RESUME_FOCUS = "com.prepverse.prepverse.RESUME_FOCUS"
        const val ACTION_END_FOCUS = "com.prepverse.prepverse.END_FOCUS"
        const val ACTION_SKIP_BREAK = "com.prepverse.prepverse.SKIP_BREAK"

        const val EXTRA_FOCUS_DURATION = "focus_duration"
        const val EXTRA_BREAK_DURATION = "break_duration"
        const val EXTRA_IS_QUIZ_MODE = "is_quiz_mode"

        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "focus_mode_channel"

        @Volatile
        var instance: FocusModeService? = null
            private set
    }

    private val binder = FocusBinder()
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var timerJob: Job? = null

    private val _sessionState = MutableStateFlow(FocusSession())
    val sessionState: StateFlow<FocusSession> = _sessionState.asStateFlow()

    private val _showViolationDialog = MutableStateFlow(false)
    val showViolationDialog: StateFlow<Boolean> = _showViolationDialog.asStateFlow()

    private var notificationManager: NotificationManager? = null

    private val violationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == FocusAccessibilityService.ACTION_FOCUS_VIOLATION) {
                val reason = intent.getStringExtra(FocusAccessibilityService.EXTRA_VIOLATION_REASON)
                    ?: "Left the app"
                onViolationDetected(reason)
            }
        }
    }

    inner class FocusBinder : Binder() {
        fun getService(): FocusModeService = this@FocusModeService
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        registerViolationReceiver()
        Timber.d("FocusModeService created")
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_FOCUS -> {
                val focusDuration = intent.getIntExtra(EXTRA_FOCUS_DURATION, FocusSession.DEFAULT_FOCUS_DURATION)
                val breakDuration = intent.getIntExtra(EXTRA_BREAK_DURATION, FocusSession.DEFAULT_BREAK_DURATION)
                val isQuizMode = intent.getBooleanExtra(EXTRA_IS_QUIZ_MODE, false)
                startFocusSession(focusDuration, breakDuration, isQuizMode)
            }
            ACTION_PAUSE_FOCUS -> pauseSession()
            ACTION_RESUME_FOCUS -> resumeSession()
            ACTION_END_FOCUS -> endSession()
            ACTION_SKIP_BREAK -> skipBreak()
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.focus_notification_channel),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Focus mode timer notifications"
            setShowBadge(false)
        }
        notificationManager?.createNotificationChannel(channel)
    }

    private fun registerViolationReceiver() {
        val filter = IntentFilter(FocusAccessibilityService.ACTION_FOCUS_VIOLATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(violationReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(violationReceiver, filter)
        }
    }

    fun startFocusSession(
        focusDurationMinutes: Int,
        breakDurationMinutes: Int,
        isQuizMode: Boolean = false
    ) {
        val session = FocusSession(
            focusDurationMinutes = focusDurationMinutes,
            breakDurationMinutes = breakDurationMinutes,
            startTime = System.currentTimeMillis(),
            state = FocusState.FOCUSING,
            timeRemainingSeconds = focusDurationMinutes * 60,
            isQuizMode = isQuizMode
        )

        _sessionState.value = session

        // Enable focus mode in accessibility service
        FocusAccessibilityService.setFocusModeActive(true)
        if (isQuizMode) {
            FocusAccessibilityService.setQuizModeActive(true)
        }

        // Enable DND
        enableDndMode()

        // Start foreground service
        startForeground(NOTIFICATION_ID, createNotification())

        // Start timer
        startTimer()

        Timber.d("Focus session started: $focusDurationMinutes min focus, $breakDurationMinutes min break")
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = serviceScope.launch {
            while (_sessionState.value.timeRemainingSeconds > 0 &&
                   _sessionState.value.state in listOf(FocusState.FOCUSING, FocusState.BREAK)) {

                delay(1000L)

                if (_sessionState.value.state == FocusState.PAUSED) continue

                _sessionState.update { session ->
                    val newTime = (session.timeRemainingSeconds - 1).coerceAtLeast(0)
                    val newTotalFocus = if (session.state == FocusState.FOCUSING) {
                        session.totalFocusTimeSeconds + 1
                    } else {
                        session.totalFocusTimeSeconds
                    }

                    session.copy(
                        timeRemainingSeconds = newTime,
                        totalFocusTimeSeconds = newTotalFocus
                    )
                }

                // Update notification every 30 seconds or when timer changes significantly
                if (_sessionState.value.timeRemainingSeconds % 30 == 0) {
                    updateNotification()
                }
            }

            // Timer completed
            onTimerCompleted()
        }
    }

    private fun onTimerCompleted() {
        val currentSession = _sessionState.value

        when (currentSession.state) {
            FocusState.FOCUSING -> {
                // Switch to break
                _sessionState.update { session ->
                    session.copy(
                        state = FocusState.BREAK,
                        timeRemainingSeconds = session.breakDurationMinutes * 60
                    )
                }
                updateNotification()
                startTimer()
                Timber.d("Focus period complete, starting break")
            }
            FocusState.BREAK -> {
                // Session complete
                completeSession()
            }
            else -> { /* No action needed */ }
        }
    }

    fun pauseSession() {
        if (_sessionState.value.state == FocusState.FOCUSING) {
            _sessionState.update { it.copy(state = FocusState.PAUSED) }
            updateNotification()
            Timber.d("Focus session paused")
        }
    }

    fun resumeSession() {
        if (_sessionState.value.state == FocusState.PAUSED) {
            _sessionState.update { it.copy(state = FocusState.FOCUSING) }
            updateNotification()
            Timber.d("Focus session resumed")
        }
    }

    fun skipBreak() {
        if (_sessionState.value.state == FocusState.BREAK) {
            completeSession()
        }
    }

    fun endSession() {
        timerJob?.cancel()
        _sessionState.update { it.copy(state = FocusState.COMPLETED, endTime = System.currentTimeMillis()) }
        cleanup()
        Timber.d("Focus session ended by user")
    }

    private fun completeSession() {
        timerJob?.cancel()
        _sessionState.update { it.copy(state = FocusState.COMPLETED, endTime = System.currentTimeMillis()) }
        cleanup()
        Timber.d("Focus session completed")
    }

    private fun terminateSession() {
        timerJob?.cancel()
        _sessionState.update { it.copy(state = FocusState.TERMINATED, endTime = System.currentTimeMillis()) }
        cleanup()
        Timber.w("Focus session terminated due to violations")
    }

    private fun cleanup() {
        FocusAccessibilityService.setFocusModeActive(false)
        FocusAccessibilityService.setQuizModeActive(false)
        disableDndMode()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun onViolationDetected(reason: String) {
        Timber.w("Violation detected: $reason")

        val currentSession = _sessionState.value

        // Only track violations and show dialog in quiz mode
        // Regular focus mode just hard enforces without penalty
        if (currentSession.isQuizMode) {
            _sessionState.update { session ->
                val newViolations = session.violations + 1
                if (newViolations >= session.maxViolations) {
                    session.copy(violations = newViolations, state = FocusState.TERMINATED)
                } else {
                    session.copy(violations = newViolations)
                }
            }

            _showViolationDialog.value = true

            if (_sessionState.value.hasReachedMaxViolations) {
                serviceScope.launch {
                    delay(3500L) // Give time for the dialog to show
                    terminateSession()
                }
            }
        }
        // In regular focus mode, the accessibility service will just bring user back
        // No violation tracking or penalty
    }

    fun dismissViolationDialog() {
        _showViolationDialog.value = false
    }

    private fun enableDndMode() {
        try {
            if (notificationManager?.isNotificationPolicyAccessGranted == true) {
                notificationManager?.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                Timber.d("DND mode enabled")
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to enable DND mode")
        }
    }

    private fun disableDndMode() {
        try {
            if (notificationManager?.isNotificationPolicyAccessGranted == true) {
                notificationManager?.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
                Timber.d("DND mode disabled")
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to disable DND mode")
        }
    }

    private fun createNotification(): Notification {
        val session = _sessionState.value
        val minutes = session.timeRemainingSeconds / 60
        val seconds = session.timeRemainingSeconds % 60
        val timeText = String.format("%02d:%02d", minutes, seconds)

        val (title, text) = when (session.state) {
            FocusState.FOCUSING -> Pair(
                getString(R.string.focus_notification_title),
                getString(R.string.focus_notification_text, timeText)
            )
            FocusState.BREAK -> Pair(
                getString(R.string.break_notification_title),
                getString(R.string.break_notification_text, timeText)
            )
            else -> Pair(
                getString(R.string.focus_notification_title),
                getString(R.string.focus_notification_text, timeText)
            )
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification() {
        notificationManager?.notify(NOTIFICATION_ID, createNotification())
    }

    override fun onDestroy() {
        super.onDestroy()
        timerJob?.cancel()
        serviceScope.cancel()
        try {
            unregisterReceiver(violationReceiver)
        } catch (e: Exception) {
            Timber.e(e, "Error unregistering receiver")
        }
        instance = null
        Timber.d("FocusModeService destroyed")
    }
}
