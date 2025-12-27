package com.prepverse.prepverse.ui.screens.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.AuthManager
import com.prepverse.prepverse.data.remote.AuthState
import com.prepverse.prepverse.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val needsOnboarding: Boolean = false,
    val error: String? = null,
    val userName: String? = null,
    val userEmail: String? = null,
    val classLevel: Int? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private var activityContext: Context? = null

    init {
        // Observe auth state changes from AuthManager
        viewModelScope.launch {
            authManager.authState.collect { state ->
                when (state) {
                    is AuthState.Authenticated -> {
                        Timber.d("Auth state: Authenticated, fetching profile...")
                        fetchUserProfileFromBackend()
                    }
                    is AuthState.Unauthenticated -> {
                        Timber.d("Auth state: Unauthenticated")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isAuthenticated = false,
                                error = null
                            )
                        }
                    }
                    is AuthState.Loading -> {
                        Timber.d("Auth state: Loading")
                        _uiState.update { it.copy(isLoading = true, error = null) }
                    }
                    is AuthState.Error -> {
                        Timber.e("Auth state: Error - ${state.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isAuthenticated = false,
                                error = state.message
                            )
                        }
                    }
                    is AuthState.Unknown -> {
                        // Initial state, do nothing
                    }
                }
            }
        }

        // Also observe needsOnboarding from AuthManager (set by deep link callback)
        viewModelScope.launch {
            authManager.needsOnboarding.collect { needsOnboarding ->
                _uiState.update { it.copy(needsOnboarding = needsOnboarding) }
            }
        }
    }

    fun setActivityContext(context: Context) {
        activityContext = context
    }

    fun signInWithGoogle() {
        val ctx = activityContext ?: run {
            Timber.e("Activity context not set")
            _uiState.update { it.copy(error = "Unable to start login") }
            return
        }

        // AuthManager will open Chrome Custom Tabs and update authState
        authManager.loginWithGoogle(ctx)
    }

    /**
     * Fetch user profile from backend API.
     * This validates the token and gets user data including onboarding status.
     */
    private fun fetchUserProfileFromBackend() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            authRepository.getCurrentUser()
                .onSuccess { profile ->
                    Timber.d("Backend profile fetched: ${profile.email}, onboarding: ${profile.onboardingCompleted}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            needsOnboarding = !profile.onboardingCompleted,
                            userName = profile.fullName,
                            userEmail = profile.email,
                            classLevel = profile.classLevel
                        )
                    }
                }
                .onFailure { error ->
                    Timber.e(error, "Failed to fetch profile from backend")
                    // Clear stored credentials since we couldn't validate with backend
                    authManager.logout()
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = false,
                            error = "Authentication failed: ${error.message}. Please try again."
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
        authManager.clearError()
    }

    fun logout() {
        authManager.logout()
    }
}
