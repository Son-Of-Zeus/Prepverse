package com.prepverse.prepverse.domain.model

import java.time.Instant
import java.util.UUID

data class PeerSession(
    val id: String,
    val name: String?,
    val topic: String,
    val subject: String,
    val schoolId: String,
    val classLevel: Int,
    val maxParticipants: Int,
    val isVoiceEnabled: Boolean,
    val isWhiteboardEnabled: Boolean,
    val status: SessionStatus,
    val createdBy: String,
    val createdAt: Instant,
    val participantCount: Int
)

enum class SessionStatus {
    WAITING, ACTIVE, CLOSED
}

data class Participant(
    val userId: String,
    val userName: String,
    val role: ParticipantRole,
    val isMuted: Boolean,
    val isVoiceActive: Boolean,
    val joinedAt: Instant
)

enum class ParticipantRole {
    HOST, PARTICIPANT
}

data class AvailablePeer(
    val userId: String,
    val userName: String,
    val strongTopics: List<String>,
    val seekingHelpTopics: List<String>,
    val statusMessage: String?,
    val lastSeenAt: Instant?
)

data class ChatMessage(
    val id: String,
    val sessionId: String,
    val senderId: String,
    val senderName: String,
    val content: String,  // Decrypted content
    val messageType: MessageType,
    val createdAt: Instant,
    val isFromMe: Boolean = false
)

enum class MessageType {
    TEXT, SYSTEM, WHITEBOARD_SYNC
}

// Whiteboard operations
sealed class WhiteboardOperation {
    abstract val id: String
    abstract val userId: String
    abstract val timestamp: Long

    data class Draw(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val points: List<Point>,
        val color: Int,
        val strokeWidth: Float
    ) : WhiteboardOperation()

    data class Text(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val text: String,
        val position: Point,
        val fontSize: Float,
        val color: Int
    ) : WhiteboardOperation()

    data class Erase(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val targetIds: List<String>
    ) : WhiteboardOperation()

    data class Clear(
        override val id: String,
        override val userId: String,
        override val timestamp: Long
    ) : WhiteboardOperation()
}

data class Point(val x: Float, val y: Float)
