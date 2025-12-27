package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.SchoolDetailsResponse
import com.prepverse.prepverse.data.remote.api.dto.SchoolResult
import com.prepverse.prepverse.data.remote.api.dto.SchoolSearchResponse
import com.prepverse.prepverse.data.remote.api.dto.SetSchoolRequest
import com.prepverse.prepverse.data.remote.api.dto.SetSchoolResponse
import com.prepverse.prepverse.data.remote.api.dto.StateListResponse
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for school-related operations
 * Used for school search and selection during onboarding
 */
@Singleton
class SchoolRepository @Inject constructor(
    private val api: PrepVerseApi
) {

    /**
     * Search for schools by name or affiliation code
     */
    suspend fun searchSchools(
        query: String,
        state: String? = null,
        limit: Int = 20
    ): Result<SchoolSearchResponse> {
        return try {
            val response = api.searchSchools(query, state, limit)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Search schools failed: $error")
                Result.failure(Exception("Failed to search schools: $error"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Search schools exception")
            Result.failure(e)
        }
    }

    /**
     * Get list of all states with school counts
     */
    suspend fun getStates(): Result<StateListResponse> {
        return try {
            val response = api.getStates()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Get states failed: $error")
                Result.failure(Exception("Failed to get states: $error"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Get states exception")
            Result.failure(e)
        }
    }

    /**
     * Get details for a specific school
     */
    suspend fun getSchool(schoolId: String): Result<SchoolDetailsResponse> {
        return try {
            val response = api.getSchool(schoolId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Get school failed: $error")
                Result.failure(Exception("Failed to get school: $error"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Get school exception")
            Result.failure(e)
        }
    }

    /**
     * Set the current user's school
     */
    suspend fun setUserSchool(schoolId: String): Result<SetSchoolResponse> {
        return try {
            val response = api.setUserSchool(SetSchoolRequest(schoolId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Set school failed: $error")
                Result.failure(Exception("Failed to set school: $error"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Set school exception")
            Result.failure(e)
        }
    }

    /**
     * Get the current user's school
     */
    suspend fun getUserSchool(): Result<SchoolResult?> {
        return try {
            val response = api.getUserSchool()
            if (response.isSuccessful) {
                Result.success(response.body())
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("Get user school failed: $error")
                Result.failure(Exception("Failed to get user school: $error"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Get user school exception")
            Result.failure(e)
        }
    }
}
