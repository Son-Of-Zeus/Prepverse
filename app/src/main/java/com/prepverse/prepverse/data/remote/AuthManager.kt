package com.prepverse.prepverse.data.remote

import android.content.Context
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationAPIClient
import com.auth0.android.authentication.AuthenticationException
import com.auth0.android.callback.Callback
import com.auth0.android.provider.WebAuthProvider
import com.auth0.android.result.Credentials
import com.auth0.android.result.UserProfile
import com.prepverse.prepverse.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val auth0: Auth0 = Auth0(
        BuildConfig.AUTH0_CLIENT_ID,
        BuildConfig.AUTH0_DOMAIN
    )

    private val _credentials = MutableStateFlow<Credentials?>(null)
    val credentials: StateFlow<Credentials?> = _credentials

    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile

    val isAuthenticated: Boolean
        get() = _credentials.value != null

    fun loginWithGoogle(activityContext: Context): Flow<AuthResult> = callbackFlow {
        WebAuthProvider.login(auth0)
            .withScheme(BuildConfig.AUTH0_SCHEME)
            .withConnection("google-oauth2")
            .withScope("openid profile email")
            .start(activityContext, object : Callback<Credentials, AuthenticationException> {
                override fun onSuccess(result: Credentials) {
                    _credentials.value = result
                    Timber.d("Login successful: ${result.accessToken}")
                    trySend(AuthResult.Success(result))
                    close()
                }

                override fun onFailure(error: AuthenticationException) {
                    Timber.e(error, "Login failed")
                    trySend(AuthResult.Error(error.message ?: "Login failed"))
                    close()
                }
            })

        awaitClose { }
    }

    fun getUserProfile(): Flow<ProfileResult> = callbackFlow {
        val accessToken = _credentials.value?.accessToken
        if (accessToken == null) {
            trySend(ProfileResult.Error("Not authenticated"))
            close()
            return@callbackFlow
        }

        val client = AuthenticationAPIClient(auth0)
        client.userInfo(accessToken)
            .start(object : Callback<UserProfile, AuthenticationException> {
                override fun onSuccess(result: UserProfile) {
                    _userProfile.value = result
                    Timber.d("Profile fetched: ${result.email}")
                    trySend(ProfileResult.Success(result))
                    close()
                }

                override fun onFailure(error: AuthenticationException) {
                    Timber.e(error, "Failed to fetch profile")
                    trySend(ProfileResult.Error(error.message ?: "Failed to fetch profile"))
                    close()
                }
            })

        awaitClose { }
    }

    fun logout(activityContext: Context): Flow<LogoutResult> = callbackFlow {
        WebAuthProvider.logout(auth0)
            .withScheme(BuildConfig.AUTH0_SCHEME)
            .start(activityContext, object : Callback<Void?, AuthenticationException> {
                override fun onSuccess(result: Void?) {
                    _credentials.value = null
                    _userProfile.value = null
                    Timber.d("Logout successful")
                    trySend(LogoutResult.Success)
                    close()
                }

                override fun onFailure(error: AuthenticationException) {
                    Timber.e(error, "Logout failed")
                    trySend(LogoutResult.Error(error.message ?: "Logout failed"))
                    close()
                }
            })

        awaitClose { }
    }

    fun getAccessToken(): String? = _credentials.value?.accessToken
}

sealed class AuthResult {
    data class Success(val credentials: Credentials) : AuthResult()
    data class Error(val message: String) : AuthResult()
}

sealed class ProfileResult {
    data class Success(val profile: UserProfile) : ProfileResult()
    data class Error(val message: String) : ProfileResult()
}

sealed class LogoutResult {
    data object Success : LogoutResult()
    data class Error(val message: String) : LogoutResult()
}
