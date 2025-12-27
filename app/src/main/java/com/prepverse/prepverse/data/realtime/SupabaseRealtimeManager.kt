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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import com.prepverse.prepverse.BuildConfig
import timber.log.Timber
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
    
    // replay=1 to ensure late subscribers get the most recent event
    private val _messageFlow = MutableSharedFlow<RealtimeMessage>(replay = 1)
    val messageFlow: Flow<RealtimeMessage> = _messageFlow.asSharedFlow()

    private val _presenceFlow = MutableSharedFlow<String>(replay = 1) // Emits sessionId on presence change
    val presenceFlow: Flow<String> = _presenceFlow.asSharedFlow()

    private val _whiteboardFlow = MutableSharedFlow<WhiteboardUpdate>(replay = 1)
    val whiteboardFlow: Flow<WhiteboardUpdate> = _whiteboardFlow.asSharedFlow()

    private val _webrtcSignalFlow = MutableSharedFlow<WebRTCSignal>(replay = 1)
    val webrtcSignalFlow: Flow<WebRTCSignal> = _webrtcSignalFlow.asSharedFlow()

    /**
     * Join a session channel for real-time updates.
     */
    suspend fun joinSession(sessionId: String, userId: String, userName: String) {
        val channelName = "session:$sessionId"

        if (channels.containsKey(channelName)) {
            Timber.d("Realtime: Already joined channel $channelName")
            return // Already joined
        }

        Timber.d("Realtime: Creating channel $channelName for user $userId ($userName)")
        val channel = supabase.channel(channelName)

        // Listen for messages
        channel.broadcastFlow<RealtimeMessage>("message").onEach { message ->
            Timber.d("Realtime: Received message from ${message.senderId}")
            _messageFlow.emit(message)
        }.launchIn(scope)

        // Listen for whiteboard updates
        channel.broadcastFlow<WhiteboardUpdate>("whiteboard").onEach { update ->
            Timber.d("Realtime: >>> RECEIVED whiteboard broadcast <<< sessionId=${update.sessionId}, type=${update.type}")
            _whiteboardFlow.emit(update)
            Timber.d("Realtime: Emitted whiteboard update to flow")
        }.launchIn(scope)

        // Listen for WebRTC signaling
        channel.broadcastFlow<WebRTCSignal>("webrtc").onEach { signal ->
            // Only emit if the signal is meant for us
            if (signal.targetUserId == userId || signal.targetUserId == "all") {
                Timber.d("Realtime: Received WebRTC signal type=${signal.signalType} from ${signal.senderId}")
                _webrtcSignalFlow.emit(signal)
            }
        }.launchIn(scope)

        // Listen for presence changes
        channel.presenceChangeFlow().onEach { action ->
            // The presenceChangeFlow emits whenever anyone joins or leaves
            // We simply emit the sessionId to trigger a participant reload via REST API
            Timber.d("Realtime: Presence change detected in session $sessionId, triggering participant reload")
            _presenceFlow.emit(sessionId)
        }.launchIn(scope)

        // Store channel reference BEFORE subscribing (so other operations can find it)
        channels[channelName] = channel

        // Subscribe to channel and WAIT for subscription to complete
        // This is critical - track() won't work if not subscribed yet
        try {
            Timber.d("Realtime: Subscribing to channel $channelName (blocking until subscribed)")
            channel.subscribe(blockUntilSubscribed = true)
            Timber.d("Realtime: Successfully subscribed to channel $channelName")
        } catch (e: Exception) {
            Timber.e(e, "Realtime: Failed to subscribe to channel $channelName")
            channels.remove(channelName)
            throw e
        }

        // Small delay to ensure subscription is fully active
        delay(100)

        // Track our presence AFTER subscription is confirmed
        try {
            Timber.d("Realtime: Tracking presence for user $userId ($userName)")
            channel.track(
                PresenceData(
                    userId = userId,
                    userName = userName,
                    onlineAt = System.currentTimeMillis()
                )
            )
            Timber.d("Realtime: Successfully tracking presence")
        } catch (e: Exception) {
            Timber.e(e, "Realtime: Failed to track presence")
            // Don't throw - channel is still usable for messages
        }
    }

    /**
     * Leave a session channel.
     */
    suspend fun leaveSession(sessionId: String) {
        val channelName = "session:$sessionId"
        channels[channelName]?.let { channel ->
            try {
                Timber.d("Realtime: Leaving channel $channelName")
                channel.unsubscribe()
                channels.remove(channelName)
                Timber.d("Realtime: Successfully left channel $channelName")
            } catch (e: Exception) {
                Timber.e(e, "Realtime: Error leaving channel $channelName")
                channels.remove(channelName)
            }
        } ?: Timber.w("Realtime: Tried to leave channel $channelName but not subscribed")
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
     * Send a WebRTC signaling message to a specific peer or all peers.
     */
    suspend fun sendWebRTCSignal(
        sessionId: String,
        senderId: String,
        targetUserId: String,
        signalType: String,
        payload: String
    ) {
        val channelName = "session:$sessionId"
        channels[channelName]?.broadcast(
            event = "webrtc",
            message = WebRTCSignal(
                sessionId = sessionId,
                senderId = senderId,
                targetUserId = targetUserId,
                signalType = signalType,
                payload = payload,
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

    @Serializable
    data class WebRTCSignal(
        val sessionId: String,
        val senderId: String,
        val targetUserId: String,
        val signalType: String, // "offer", "answer", "ice-candidate"
        val payload: String,    // SDP or ICE candidate JSON
        val timestamp: Long
    )
}
