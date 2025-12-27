package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * School search result for autocomplete
 */
@JsonClass(generateAdapter = true)
data class SchoolResult(
    @Json(name = "id") val id: String,
    @Json(name = "affiliation_code") val affiliationCode: String,
    @Json(name = "name") val name: String,
    @Json(name = "state") val state: String?,
    @Json(name = "district") val district: String?,
    @Json(name = "address") val address: String?,
    @Json(name = "display_name") val displayName: String?
)

/**
 * Response from school search endpoint
 */
@JsonClass(generateAdapter = true)
data class SchoolSearchResponse(
    @Json(name = "results") val results: List<SchoolResult>,
    @Json(name = "total") val total: Int,
    @Json(name = "query") val query: String
)

/**
 * State with school count
 */
@JsonClass(generateAdapter = true)
data class StateInfo(
    @Json(name = "state") val state: String,
    @Json(name = "count") val count: Int
)

/**
 * Response from states endpoint
 */
@JsonClass(generateAdapter = true)
data class StateListResponse(
    @Json(name = "states") val states: List<StateInfo>
)

/**
 * Request to set user's school
 */
@JsonClass(generateAdapter = true)
data class SetSchoolRequest(
    @Json(name = "school_id") val schoolId: String
)

/**
 * Response after setting user's school
 */
@JsonClass(generateAdapter = true)
data class SetSchoolResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "school") val school: SchoolResult?,
    @Json(name = "message") val message: String
)

/**
 * Full school details
 */
@JsonClass(generateAdapter = true)
data class SchoolDetailsResponse(
    @Json(name = "id") val id: String,
    @Json(name = "affiliation_code") val affiliationCode: String,
    @Json(name = "name") val name: String,
    @Json(name = "state") val state: String?,
    @Json(name = "district") val district: String?,
    @Json(name = "region") val region: String?,
    @Json(name = "address") val address: String?,
    @Json(name = "pincode") val pincode: String?,
    @Json(name = "phone") val phone: String?,
    @Json(name = "email") val email: String?,
    @Json(name = "website") val website: String?,
    @Json(name = "principal_name") val principalName: String?,
    @Json(name = "year_founded") val yearFounded: Int?,
    @Json(name = "affiliation_type") val affiliationType: String?,
    @Json(name = "school_type") val schoolType: String?
)
