package com.prepverse.prepverse.ui.screens.focus

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.provider.Settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.local.FocusModePreferences
import com.prepverse.prepverse.domain.model.FocusModeSettings
import com.prepverse.prepverse.domain.model.FocusSession
import com.prepverse.prepverse.domain.model.FocusState
import com.prepverse.prepverse.services.FocusAccessibilityService
import com.prepverse.prepverse.services.FocusModeService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class FocusModeUiState(
    val settings: FocusModeSettings = FocusModeSettings(),
    val session: FocusSession = FocusSession(),
    val showWarningDialog: Boolean = false,
    val showSettingsDialog: Boolean = false,
    val showViolationDialog: Boolean = false,
    val showBreakDialog: Boolean = false,
    val showCompletionDialog: Boolean = false,
    val isAccessibilityEnabled: Boolean = false,
    val isDndAccessGranted: Boolean = false,
    val totalSessions: Int = 0,
    val totalMinutes: Int = 0
)

@HiltViewModel
class FocusModeViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val preferences: FocusModePreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(FocusModeUiState())
    val uiState: StateFlow<FocusModeUiState> = _uiState.asStateFlow()

    private var focusService: FocusModeService? = null
    private var serviceBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as? FocusModeService.FocusBinder
            focusService = binder?.getService()
            serviceBound = true

            // Collect session state from service
            focusService?.let { svc ->
                viewModelScope.launch {
                    svc.sessionState.collect { session ->
                        _uiState.update { state ->
                            state.copy(
                                session = session,
                                showBreakDialog = session.state == FocusState.BREAK,
                                showCompletionDialog = session.state in listOf(FocusState.COMPLETED, FocusState.TERMINATED)
                            )
                        }
                    }
                }

                viewModelScope.launch {
                    svc.showViolationDialog.collect { show ->
                        _uiState.update { it.copy(showViolationDialog = show) }
                    }
                }
            }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            focusService = null
            serviceBound = false
        }
    }

    init {
        loadSettings()
        checkPermissions()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            preferences.settings.collect { settings ->
                _uiState.update { it.copy(settings = settings) }
            }
        }

        viewModelScope.launch {
            preferences.totalFocusSessions.collect { sessions ->
                _uiState.update { it.copy(totalSessions = sessions) }
            }
        }

        viewModelScope.launch {
            preferences.totalFocusMinutes.collect { minutes ->
                _uiState.update { it.copy(totalMinutes = minutes) }
            }
        }
    }

    fun checkPermissions() {
        val isAccessibilityEnabled = FocusAccessibilityService.isServiceEnabled()
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val isDndGranted = notificationManager.isNotificationPolicyAccessGranted

        _uiState.update { state ->
            state.copy(
                isAccessibilityEnabled = isAccessibilityEnabled,
                isDndAccessGranted = isDndGranted
            )
        }
    }

    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    fun openDndSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    fun showWarningDialog() {
        _uiState.update { it.copy(showWarningDialog = true) }
    }

    fun dismissWarningDialog() {
        _uiState.update { it.copy(showWarningDialog = false) }
    }

    fun showSettingsDialog() {
        _uiState.update { it.copy(showSettingsDialog = true) }
    }

    fun dismissSettingsDialog() {
        _uiState.update { it.copy(showSettingsDialog = false) }
    }

    fun updateFocusDuration(minutes: Int) {
        viewModelScope.launch {
            preferences.updateFocusDuration(minutes)
        }
    }

    fun updateBreakDuration(minutes: Int) {
        viewModelScope.launch {
            preferences.updateBreakDuration(minutes)
        }
    }

    fun updateDndEnabled(enabled: Boolean) {
        viewModelScope.launch {
            preferences.updateDndEnabled(enabled)
        }
    }

    fun startFocusSession() {
        dismissWarningDialog()

        val settings = _uiState.value.settings
        val intent = Intent(context, FocusModeService::class.java).apply {
            action = FocusModeService.ACTION_START_FOCUS
            putExtra(FocusModeService.EXTRA_FOCUS_DURATION, settings.focusDurationMinutes)
            putExtra(FocusModeService.EXTRA_BREAK_DURATION, settings.breakDurationMinutes)
            putExtra(FocusModeService.EXTRA_IS_QUIZ_MODE, false)
        }

        context.startForegroundService(intent)
        bindToService()

        Timber.d("Starting focus session with ${settings.focusDurationMinutes} min focus, ${settings.breakDurationMinutes} min break")
    }

    private fun bindToService() {
        if (!serviceBound) {
            val intent = Intent(context, FocusModeService::class.java)
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        }
    }

    fun pauseSession() {
        focusService?.pauseSession() ?: run {
            val intent = Intent(context, FocusModeService::class.java).apply {
                action = FocusModeService.ACTION_PAUSE_FOCUS
            }
            context.startService(intent)
        }
    }

    fun resumeSession() {
        focusService?.resumeSession() ?: run {
            val intent = Intent(context, FocusModeService::class.java).apply {
                action = FocusModeService.ACTION_RESUME_FOCUS
            }
            context.startService(intent)
        }
    }

    fun endSession() {
        val session = _uiState.value.session
        if (session.state == FocusState.COMPLETED || session.state == FocusState.TERMINATED) {
            // Record completed session
            viewModelScope.launch {
                preferences.recordCompletedSession((session.totalFocusTimeSeconds / 60).toInt())
            }
        }

        focusService?.endSession() ?: run {
            val intent = Intent(context, FocusModeService::class.java).apply {
                action = FocusModeService.ACTION_END_FOCUS
            }
            context.startService(intent)
        }

        _uiState.update { state ->
            state.copy(
                session = FocusSession(),
                showCompletionDialog = false,
                showBreakDialog = false
            )
        }
    }

    fun skipBreak() {
        focusService?.skipBreak() ?: run {
            val intent = Intent(context, FocusModeService::class.java).apply {
                action = FocusModeService.ACTION_SKIP_BREAK
            }
            context.startService(intent)
        }
    }

    fun dismissViolationDialog() {
        focusService?.dismissViolationDialog()
        _uiState.update { it.copy(showViolationDialog = false) }
    }

    fun dismissCompletionDialog() {
        _uiState.update { it.copy(showCompletionDialog = false) }
        endSession()
    }

    override fun onCleared() {
        super.onCleared()
        if (serviceBound) {
            try {
                context.unbindService(serviceConnection)
            } catch (e: Exception) {
                Timber.e(e, "Error unbinding service")
            }
            serviceBound = false
        }
    }
}
