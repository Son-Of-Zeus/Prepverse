package com.prepverse.prepverse.data.realtime

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.RealtimeChannel
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.broadcastFlow
import io.github.jan.supabase.realtime.broadcast
import io.github.jan.supabase.realtime.presenceChangeFlow
import io.github.jan.supabase.realtime.track
import io.github.jan.supabase.realtime.decodeJoinsAs
import io.github.jan.supabase.realtime.decodeLeavesAs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import com.prepverse.prepverse.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages Supabase Realtime connections for:
 * - Message broadcasting in sessions
 * - Participant presence tracking
 * - Whiteboard sync events
 * 
 * Configuration is loaded from local.properties (not committed to git)
 */
@Singleton
class SupabaseRealtimeManager @Inject constructor() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val supabase: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Realtime)
        }
    }

    private val channels = mutableMapOf<String, RealtimeChannel>()
    
    private val _messageFlow = MutableSharedFlow<RealtimeMessage>()
    val messageFlow: Flow<RealtimeMessage> = _messageFlow.asSharedFlow()

    private val _presenceFlow = MutableSharedFlow<String>() // Emits sessionId on presence change
    val presenceFlow: Flow<String> = _presenceFlow.asSharedFlow()

    private val _whiteboardFlow = MutableSharedFlow<WhiteboardUpdate>()
    val whiteboardFlow: Flow<WhiteboardUpdate> = _whiteboardFlow.asSharedFlow()

    /**
     * Join a session channel for real-time updates.
     */
    suspend fun joinSession(sessionId: String, userId: String, userName: String) {
        val channelName = "session:$sessionId"
        
        if (channels.containsKey(channelName)) {
            return // Already joined
        }

        val channel = supabase.channel(channelName)

        // Listen for messages
        channel.broadcastFlow<RealtimeMessage>("message").onEach { message ->
            _messageFlow.emit(message)
        }.launchIn(scope)

        // Listen for whiteboard updates
        channel.broadcastFlow<WhiteboardUpdate>("whiteboard").onEach { update ->
            _whiteboardFlow.emit(update)
        }.launchIn(scope)

        // Listen for presence changes
        channel.presenceChangeFlow().onEach { action ->
            scope.launch {
                _presenceFlow.emit(sessionId)
            }
        }.launchIn(scope)

        // Subscribe to channel
        channel.subscribe()

        // Track our presence
        channel.track(
            PresenceData(
                userId = userId,
                userName = userName,
                onlineAt = System.currentTimeMillis()
            )
        )

        channels[channelName] = channel
    }

    /**
     * Leave a session channel.
     */
    suspend fun leaveSession(sessionId: String) {
        val channelName = "session:$sessionId"
        channels[channelName]?.let { channel ->
            channel.unsubscribe()
            channels.remove(channelName)
        }
    }

    /**
     * Broadcast a message to all participants in a session.
     */
    suspend fun broadcastMessage(
        sessionId: String,
        messageId: String,
        senderId: String,
        senderName: String,
        encryptedContent: String
    ) {
        val channelName = "session:$sessionId"
        channels[channelName]?.broadcast(
            event = "message",
            message = RealtimeMessage(
                sessionId = sessionId,
                messageId = messageId,
                senderId = senderId,
                senderName = senderName,
                encryptedContent = encryptedContent,
                timestamp = System.currentTimeMillis()
            )
        )
    }

    /**
     * Broadcast a whiteboard update to all participants.
     */
    suspend fun broadcastWhiteboardUpdate(
        sessionId: String,
        operationType: String,
        operationData: Map<String, String>
    ) {
        val channelName = "session:$sessionId"
        channels[channelName]?.broadcast(
            event = "whiteboard",
            message = WhiteboardUpdate(
                sessionId = sessionId,
                type = operationType,
                data = operationData,
                timestamp = System.currentTimeMillis()
            )
        )
    }

    /**
     * Get current participants in a session.
     */
    suspend fun getSessionParticipants(sessionId: String): List<Participant> {
        val channelName = "session:$sessionId"
        val channel = channels[channelName] ?: return emptyList()

        // Get presence state
        return try {
            // Note: This is a placeholder - actual implementation may vary by Supabase version
            emptyList<Participant>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Clean up all connections.
     */
    fun disconnect() {
        scope.launch {
            channels.values.forEach { it.unsubscribe() }
            channels.clear()
        }
    }

    @Serializable
    data class RealtimeMessage(
        val sessionId: String,
        val messageId: String,
        val senderId: String,
        val senderName: String,
        val encryptedContent: String,
        val timestamp: Long
    )

    @Serializable
    data class WhiteboardUpdate(
        val sessionId: String,
        val type: String,
        val data: Map<String, String>,
        val timestamp: Long
    )

    @Serializable
    data class PresenceData(
        val userId: String,
        val userName: String,
        val onlineAt: Long
    )

    data class Participant(
        val userId: String,
        val userName: String
    )
}
