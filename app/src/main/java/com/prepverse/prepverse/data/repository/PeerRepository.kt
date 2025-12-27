package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.*
import com.prepverse.prepverse.domain.model.*
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PeerRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    // ============================================
    // Encryption Keys
    // ============================================

    suspend fun registerKeys(request: RegisterKeysRequest): Result<Unit> {
        return try {
            val response = api.registerEncryptionKeys(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to register keys: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserKeys(userId: String): Result<KeyBundleResponse> {
        return try {
            val response = api.getUserKeys(userId)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get keys: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Sessions
    // ============================================

    suspend fun createSession(
        name: String?,
        topic: String,
        subject: String,
        maxParticipants: Int = 4,
        voiceEnabled: Boolean = true,
        whiteboardEnabled: Boolean = true
    ): Result<PeerSession> {
        return try {
            val response = api.createPeerSession(
                CreateSessionRequest(
                    name = name,
                    topic = topic,
                    subject = subject,
                    maxParticipants = maxParticipants,
                    isVoiceEnabled = voiceEnabled,
                    isWhiteboardEnabled = whiteboardEnabled
                )
            )
            if (response.isSuccessful) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to create session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun listSessions(
        topic: String? = null,
        subject: String? = null
    ): Result<List<PeerSession>> {
        return try {
            val response = api.listPeerSessions(topic, subject)
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to list sessions: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinSession(sessionId: String): Result<Unit> {
        return try {
            val response = api.joinPeerSession(sessionId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to join session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun leaveSession(sessionId: String): Result<Unit> {
        return try {
            val response = api.leavePeerSession(sessionId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to leave session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getParticipants(sessionId: String): Result<List<Participant>> {
        return try {
            val response = api.getSessionParticipants(sessionId)
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get participants: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Availability
    // ============================================

    suspend fun setAvailability(
        available: Boolean,
        statusMessage: String? = null,
        strongTopics: List<String> = emptyList(),
        seekingHelpTopics: List<String> = emptyList()
    ): Result<Unit> {
        return try {
            val response = api.setAvailability(
                SetAvailabilityRequest(
                    isAvailable = available,
                    statusMessage = statusMessage,
                    strongTopics = strongTopics,
                    seekingHelpTopics = seekingHelpTopics
                )
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to set availability: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAvailablePeers(): Result<List<AvailablePeer>> {
        return try {
            val response = api.getAvailablePeers()
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get peers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun findPeersByTopic(topic: String): Result<List<AvailablePeer>> {
        return try {
            val response = api.findPeersByTopic(FindByTopicRequest(topic))
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to find peers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Block & Report
    // ============================================

    suspend fun blockUser(userId: String, reason: String? = null): Result<Unit> {
        return try {
            val response = api.blockUser(BlockUserRequest(userId, reason))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to block: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unblockUser(userId: String): Result<Unit> {
        return try {
            val response = api.unblockUser(userId)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to unblock: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reportUser(
        userId: String,
        sessionId: String?,
        reason: String,
        description: String?
    ): Result<Unit> {
        return try {
            val response = api.reportUser(
                ReportUserRequest(userId, sessionId, reason, description)
            )
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to report: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Mappers
    // ============================================

    private fun SessionResponse.toDomain() = PeerSession(
        id = id,
        name = name,
        topic = topic,
        subject = subject,
        schoolId = schoolId,
        classLevel = classLevel,
        maxParticipants = maxParticipants,
        isVoiceEnabled = isVoiceEnabled,
        isWhiteboardEnabled = isWhiteboardEnabled,
        status = SessionStatus.valueOf(status.uppercase()),
        createdBy = createdBy,
        createdAt = Instant.parse(createdAt),
        participantCount = participantCount
    )

    private fun ParticipantResponse.toDomain() = Participant(
        userId = userId,
        userName = userName,
        role = ParticipantRole.valueOf(role.uppercase()),
        isMuted = isMuted,
        isVoiceActive = isVoiceActive,
        joinedAt = Instant.parse(joinedAt)
    )

    private fun AvailablePeerResponse.toDomain() = AvailablePeer(
        userId = userId,
        userName = userName,
        strongTopics = strongTopics,
        seekingHelpTopics = seekingHelpTopics,
        statusMessage = statusMessage,
        lastSeenAt = lastSeenAt?.let { Instant.parse(it) }
    )
}
