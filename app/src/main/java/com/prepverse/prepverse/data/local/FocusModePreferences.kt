package com.prepverse.prepverse.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.prepverse.prepverse.domain.model.FocusModeSettings
import com.prepverse.prepverse.domain.model.FocusSession
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.focusModeDataStore: DataStore<Preferences> by preferencesDataStore(name = "focus_mode_prefs")

/**
 * DataStore-backed preferences for Focus Mode settings
 */
@Singleton
class FocusModePreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val FOCUS_DURATION = intPreferencesKey("focus_duration_minutes")
        val BREAK_DURATION = intPreferencesKey("break_duration_minutes")
        val ENABLE_DND = booleanPreferencesKey("enable_dnd")
        val ENABLE_APP_BLOCKING = booleanPreferencesKey("enable_app_blocking")
        val TOTAL_FOCUS_SESSIONS = intPreferencesKey("total_focus_sessions")
        val TOTAL_FOCUS_MINUTES = intPreferencesKey("total_focus_minutes")
    }

    val settings: Flow<FocusModeSettings> = context.focusModeDataStore.data.map { prefs ->
        FocusModeSettings(
            focusDurationMinutes = prefs[Keys.FOCUS_DURATION] ?: FocusSession.DEFAULT_FOCUS_DURATION,
            breakDurationMinutes = prefs[Keys.BREAK_DURATION] ?: FocusSession.DEFAULT_BREAK_DURATION,
            enableDnd = prefs[Keys.ENABLE_DND] ?: true,
            enableAppBlocking = prefs[Keys.ENABLE_APP_BLOCKING] ?: true
        )
    }

    val totalFocusSessions: Flow<Int> = context.focusModeDataStore.data.map { prefs ->
        prefs[Keys.TOTAL_FOCUS_SESSIONS] ?: 0
    }

    val totalFocusMinutes: Flow<Int> = context.focusModeDataStore.data.map { prefs ->
        prefs[Keys.TOTAL_FOCUS_MINUTES] ?: 0
    }

    suspend fun updateFocusDuration(minutes: Int) {
        val validMinutes = minutes.coerceIn(FocusSession.MIN_FOCUS_DURATION, FocusSession.MAX_FOCUS_DURATION)
        context.focusModeDataStore.edit { prefs ->
            prefs[Keys.FOCUS_DURATION] = validMinutes
        }
    }

    suspend fun updateBreakDuration(minutes: Int) {
        val validMinutes = minutes.coerceIn(FocusSession.MIN_BREAK_DURATION, FocusSession.MAX_BREAK_DURATION)
        context.focusModeDataStore.edit { prefs ->
            prefs[Keys.BREAK_DURATION] = validMinutes
        }
    }

    suspend fun updateDndEnabled(enabled: Boolean) {
        context.focusModeDataStore.edit { prefs ->
            prefs[Keys.ENABLE_DND] = enabled
        }
    }

    suspend fun updateAppBlockingEnabled(enabled: Boolean) {
        context.focusModeDataStore.edit { prefs ->
            prefs[Keys.ENABLE_APP_BLOCKING] = enabled
        }
    }

    suspend fun recordCompletedSession(focusMinutes: Int) {
        context.focusModeDataStore.edit { prefs ->
            val currentSessions = prefs[Keys.TOTAL_FOCUS_SESSIONS] ?: 0
            val currentMinutes = prefs[Keys.TOTAL_FOCUS_MINUTES] ?: 0
            prefs[Keys.TOTAL_FOCUS_SESSIONS] = currentSessions + 1
            prefs[Keys.TOTAL_FOCUS_MINUTES] = currentMinutes + focusMinutes
        }
    }

    suspend fun saveSettings(settings: FocusModeSettings) {
        context.focusModeDataStore.edit { prefs ->
            prefs[Keys.FOCUS_DURATION] = settings.focusDurationMinutes
            prefs[Keys.BREAK_DURATION] = settings.breakDurationMinutes
            prefs[Keys.ENABLE_DND] = settings.enableDnd
            prefs[Keys.ENABLE_APP_BLOCKING] = settings.enableAppBlocking
        }
    }
}
