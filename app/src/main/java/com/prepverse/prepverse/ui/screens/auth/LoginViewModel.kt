package com.prepverse.prepverse.ui.screens.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.remote.AuthManager
import com.prepverse.prepverse.data.remote.AuthResult
import com.prepverse.prepverse.data.remote.ProfileResult
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
    val userPictureUrl: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authManager: AuthManager,
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
                        Timber.d("Auth success, fetching profile...")
                        fetchUserProfile()
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

    private fun fetchUserProfile() {
        viewModelScope.launch {
            authManager.getUserProfile().collect { result ->
                when (result) {
                    is ProfileResult.Success -> {
                        val profile = result.profile
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isAuthenticated = true,
                                needsOnboarding = true, // TODO: Check from backend
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
