package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.UserProfileResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for authentication and user profile operations
 */
@Singleton
class AuthRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    /**
     * Get current authenticated user's profile from backend
     * @return Result containing UserProfileResponse or error
     */
    suspend fun getCurrentUser(): Result<UserProfileResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getCurrentUser()

            if (response.isSuccessful) {
                response.body()?.let { profile ->
                    Timber.d("Successfully fetched user profile: ${profile.email}")
                    Result.success(profile)
                } ?: run {
                    Timber.e("Empty response body for getCurrentUser")
                    Result.failure(Exception("Empty response from server"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Failed to fetch user profile: ${response.code()} - $errorBody")

                when (response.code()) {
                    401 -> Result.failure(AuthException.Unauthorized("Session expired. Please login again."))
                    404 -> Result.failure(AuthException.UserNotFound("User not found"))
                    else -> Result.failure(AuthException.ServerError("Server error: ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network error fetching user profile")
            Result.failure(AuthException.NetworkError(e.message ?: "Network error occurred"))
        }
    }
}

/**
 * Custom exceptions for auth-related errors
 */
sealed class AuthException(message: String) : Exception(message) {
    class Unauthorized(message: String) : AuthException(message)
    class UserNotFound(message: String) : AuthException(message)
    class ServerError(message: String) : AuthException(message)
    class NetworkError(message: String) : AuthException(message)
}
