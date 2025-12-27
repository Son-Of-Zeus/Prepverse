package com.prepverse.prepverse.data.remote

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.prepverse.prepverse.BuildConfig
import com.prepverse.prepverse.data.local.TokenStorage
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages authentication using server-side OAuth flow.
 * Opens backend login URL in Chrome Custom Tabs, receives token via deep link.
 */
@Singleton
class AuthManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenStorage: TokenStorage
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unknown)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _needsOnboarding = MutableStateFlow(false)
    val needsOnboarding: StateFlow<Boolean> = _needsOnboarding.asStateFlow()

    val isAuthenticated: Boolean
        get() = tokenStorage.hasToken()

    init {
        // Check for existing token on startup
        checkAuthState()
    }

    private fun checkAuthState() {
        _authState.value = if (tokenStorage.hasToken()) {
            Timber.d("Existing session token found")
            AuthState.Authenticated
        } else {
            Timber.d("No session token found")
            AuthState.Unauthenticated
        }
    }

    /**
     * Initiates login by opening the backend OAuth URL in Chrome Custom Tabs.
     * The backend will redirect to Auth0 Universal Login, then back to our deep link.
     */
    fun loginWithGoogle(activityContext: Context) {
        _authState.value = AuthState.Loading

        // Build the backend login URL with platform=android
        val loginUrl = "${BuildConfig.API_BASE_URL}/api/v1/auth/login?platform=android"

        Timber.d("Opening login URL: $loginUrl")

        // Open Chrome Custom Tabs
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        try {
            customTabsIntent.launchUrl(activityContext, Uri.parse(loginUrl))
        } catch (e: Exception) {
            Timber.e(e, "Failed to launch Chrome Custom Tabs")
            _authState.value = AuthState.Error("Failed to open login page: ${e.message}")
        }
    }

    /**
     * Called when deep link callback is received with token.
     * This is invoked by AuthCallbackActivity.
     */
    fun handleAuthCallback(token: String, needsOnboarding: Boolean = false) {
        tokenStorage.saveToken(token)
        _needsOnboarding.value = needsOnboarding
        _authState.value = AuthState.Authenticated
        Timber.d("Auth callback handled, token stored, needsOnboarding=$needsOnboarding")
    }

    /**
     * Called when deep link callback contains an error.
     */
    fun handleAuthError(error: String) {
        _authState.value = AuthState.Error(error)
        Timber.e("Auth callback error: $error")
    }

    /**
     * Clears stored token and resets auth state.
     */
    fun logout() {
        tokenStorage.clearToken()
        _needsOnboarding.value = false
        _authState.value = AuthState.Unauthenticated
        Timber.d("Logged out, token cleared")
    }

    /**
     * Returns the stored session token for API calls.
     */
    fun getAccessToken(): String? = tokenStorage.getToken()

    /**
     * Clears any error state.
     */
    fun clearError() {
        if (_authState.value is AuthState.Error) {
            _authState.value = AuthState.Unauthenticated
        }
    }
}

/**
 * Represents the current authentication state.
 */
sealed class AuthState {
    data object Unknown : AuthState()
    data object Loading : AuthState()
    data object Authenticated : AuthState()
    data object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
}
