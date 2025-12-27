package com.prepverse.prepverse.ui.screens.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.AuthManager
import com.prepverse.prepverse.data.remote.AuthResult
import com.prepverse.prepverse.data.remote.ProfileResult
import com.prepverse.prepverse.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    val userPictureUrl: String? = null,
    val classLevel: Int? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val authRepository: AuthRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private var activityContext: Context? = null

    fun setActivityContext(context: Context) {
        activityContext = context
    }

    fun signInWithGoogle() {
        val ctx = activityContext ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            authManager.loginWithGoogle(ctx).collect { result ->
                when (result) {
                    is AuthResult.Success -> {
                        Timber.d("Auth0 login success, fetching profile from backend...")
                        fetchUserProfileFromBackend()
                    }
                    is AuthResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = result.message
                            )
                        }
                    }
                }
            }
        }
    }

    /**
     * Fetch user profile from backend API
     * This validates the token and gets user data including onboarding status
     */
    private fun fetchUserProfileFromBackend() {
        viewModelScope.launch {
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
                    Timber.e(error, "Failed to fetch profile from backend, falling back to Auth0 profile")
                    // Fall back to Auth0 profile if backend fails
                    fetchAuth0Profile()
                }
        }
    }

    /**
     * Fallback: Fetch profile from Auth0 if backend is unavailable
     */
    private fun fetchAuth0Profile() {
        viewModelScope.launch {
            authManager.getUserProfile().collect { result ->
                when (result) {
                    is ProfileResult.Success -> {
                        val profile = result.profile
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isAuthenticated = true,
                                needsOnboarding = true, // Assume needs onboarding if backend is down
                                userName = profile.name,
                                userEmail = profile.email,
                                userPictureUrl = profile.pictureURL
                            )
                        }
                    }
                    is ProfileResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isAuthenticated = true,
                                needsOnboarding = true,
                                error = result.message
                            )
                        }
                    }
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
