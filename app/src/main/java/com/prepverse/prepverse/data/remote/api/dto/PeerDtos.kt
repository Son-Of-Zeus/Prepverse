package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ============================================
// Encryption Keys
// ============================================

@JsonClass(generateAdapter = true)
data class RegisterKeysRequest(
    @Json(name = "identity_public_key") val identityPublicKey: String,
    @Json(name = "signed_prekey_public") val signedPrekeyPublic: String,
    @Json(name = "signed_prekey_signature") val signedPrekeySignature: String,
    @Json(name = "signed_prekey_id") val signedPrekeyId: Int,
    @Json(name = "one_time_prekeys") val oneTimePrekeys: List<OneTimePrekey>
)

@JsonClass(generateAdapter = true)
data class OneTimePrekey(
    val id: Int,
    val key: String
)

@JsonClass(generateAdapter = true)
data class KeyBundleResponse(
    @Json(name = "identity_public_key") val identityPublicKey: String,
    @Json(name = "signed_prekey_public") val signedPrekeyPublic: String,
    @Json(name = "signed_prekey_signature") val signedPrekeySignature: String,
    @Json(name = "signed_prekey_id") val signedPrekeyId: Int,
    @Json(name = "one_time_prekey_public") val oneTimePrekeyPublic: String?,
    @Json(name = "one_time_prekey_id") val oneTimePrekeyId: Int?
)

// ============================================
// Sessions
// ============================================

@JsonClass(generateAdapter = true)
data class CreateSessionRequest(
    val name: String?,
    val topic: String,
    val subject: String,
    @Json(name = "max_participants") val maxParticipants: Int = 4,
    @Json(name = "is_voice_enabled") val isVoiceEnabled: Boolean = true,
    @Json(name = "is_whiteboard_enabled") val isWhiteboardEnabled: Boolean = true
)

@JsonClass(generateAdapter = true)
data class SessionResponse(
    val id: String,
    val name: String?,
    val topic: String,
    val subject: String,
    @Json(name = "school_id") val schoolId: String,
    @Json(name = "class_level") val classLevel: Int,
    @Json(name = "max_participants") val maxParticipants: Int,
    @Json(name = "is_voice_enabled") val isVoiceEnabled: Boolean,
    @Json(name = "is_whiteboard_enabled") val isWhiteboardEnabled: Boolean,
    val status: String,
    @Json(name = "created_by") val createdBy: String,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "participant_count") val participantCount: Int
)

@JsonClass(generateAdapter = true)
data class ParticipantResponse(
    @Json(name = "user_id") val userId: String,
    @Json(name = "user_name") val userName: String,
    val role: String,
    @Json(name = "is_muted") val isMuted: Boolean,
    @Json(name = "is_voice_active") val isVoiceActive: Boolean,
    @Json(name = "joined_at") val joinedAt: String
)

// ============================================
// Messaging
// ============================================

@JsonClass(generateAdapter = true)
data class SendMessageRequest(
    @Json(name = "session_id") val sessionId: String,
    @Json(name = "encrypted_content") val encryptedContent: Map<String, String>,
    @Json(name = "message_type") val messageType: String = "text"
)

@JsonClass(generateAdapter = true)
data class MessageResponse(
    val id: String,
    @Json(name = "session_id") val sessionId: String,
    @Json(name = "sender_id") val senderId: String,
    @Json(name = "sender_name") val senderName: String,
    @Json(name = "encrypted_content") val encryptedContent: Map<String, String>,
    @Json(name = "message_type") val messageType: String,
    @Json(name = "created_at") val createdAt: String
)

// ============================================
// Availability
// ============================================

@JsonClass(generateAdapter = true)
data class SetAvailabilityRequest(
    @Json(name = "is_available") val isAvailable: Boolean,
    @Json(name = "status_message") val statusMessage: String?,
    @Json(name = "strong_topics") val strongTopics: List<String>,
    @Json(name = "seeking_help_topics") val seekingHelpTopics: List<String>
)

@JsonClass(generateAdapter = true)
data class AvailablePeerResponse(
    @Json(name = "user_id") val userId: String,
    @Json(name = "user_name") val userName: String,
    @Json(name = "strong_topics") val strongTopics: List<String>,
    @Json(name = "seeking_help_topics") val seekingHelpTopics: List<String>,
    @Json(name = "status_message") val statusMessage: String?,
    @Json(name = "last_seen_at") val lastSeenAt: String?
)

@JsonClass(generateAdapter = true)
data class FindByTopicRequest(
    val topic: String
)

// ============================================
// Block & Report
// ============================================

@JsonClass(generateAdapter = true)
data class BlockUserRequest(
    @Json(name = "user_id") val userId: String,
    val reason: String?
)

@JsonClass(generateAdapter = true)
data class ReportUserRequest(
    @Json(name = "user_id") val userId: String,
    @Json(name = "session_id") val sessionId: String?,
    val reason: String,
    val description: String?
)

// ============================================
// Whiteboard
// ============================================

@JsonClass(generateAdapter = true)
data class WhiteboardOperationDto(
    val type: String,
    val data: Map<String, Any>,
    val timestamp: Long,
    @Json(name = "user_id") val userId: String
)

@JsonClass(generateAdapter = true)
data class WhiteboardSyncRequest(
    @Json(name = "session_id") val sessionId: String,
    val operations: List<WhiteboardOperationDto>,
    val version: Int
)

@JsonClass(generateAdapter = true)
data class WhiteboardStateResponse(
    @Json(name = "session_id") val sessionId: String,
    val operations: List<Map<String, Any>>,
    val version: Int
)
