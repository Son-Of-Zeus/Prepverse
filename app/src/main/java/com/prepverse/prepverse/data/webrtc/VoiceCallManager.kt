package com.prepverse.prepverse.data.webrtc

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * Manages WebRTC voice calls in study rooms.
 * Supports peer-to-peer audio with multiple participants via mesh topology.
 */
@Singleton
class VoiceCallManager @Inject constructor() {

    private var factory: PeerConnectionFactory? = null
    private val peerConnections = mutableMapOf<String, PeerConnection>()
    private var localAudioTrack: AudioTrack? = null
    private var audioSource: AudioSource? = null

    private val _connectionState = MutableStateFlow(VoiceConnectionState.DISCONNECTED)
    val connectionState: StateFlow<VoiceConnectionState> = _connectionState.asStateFlow()

    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()

    private var isInitialized = false

    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
    )

    /**
     * Initialize WebRTC. Must be called before any other methods.
     */
    fun initialize(context: Context) {
        if (isInitialized) return

        val options = PeerConnectionFactory.InitializationOptions.builder(context.applicationContext)
            .setEnableInternalTracer(false)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)

        val encoderFactory = DefaultVideoEncoderFactory(
            EglBase.create().eglBaseContext,
            true,
            true
        )
        val decoderFactory = DefaultVideoDecoderFactory(EglBase.create().eglBaseContext)

        factory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()

        // Create local audio track
        val audioConstraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("echoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("noiseSuppression", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("autoGainControl", "true"))
        }
        audioSource = factory?.createAudioSource(audioConstraints)
        localAudioTrack = factory?.createAudioTrack("local_audio", audioSource)

        isInitialized = true
    }

    /**
     * Create a peer connection to a specific user.
     */
    fun createPeerConnection(
        peerId: String,
        onIceCandidate: (String, IceCandidate) -> Unit,
        onConnectionStateChange: (String, PeerConnection.IceConnectionState) -> Unit
    ): PeerConnection? {
        if (!isInitialized) return null

        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }

        val peerConnection = factory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {
                onIceCandidate(peerId, candidate)
            }

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                onConnectionStateChange(peerId, state)
                updateConnectionState(state)
            }

            override fun onAddStream(stream: MediaStream) {
                // Handle incoming audio stream
            }

            override fun onSignalingChange(state: PeerConnection.SignalingState) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onRemoveStream(stream: MediaStream) {}
            override fun onDataChannel(channel: DataChannel) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {}
            override fun onTrack(transceiver: RtpTransceiver?) {}
        })

        peerConnection?.let { pc ->
            // Add local audio track
            localAudioTrack?.let { track ->
                pc.addTrack(track, listOf("local_stream"))
            }
            peerConnections[peerId] = pc
        }

        return peerConnection
    }

    /**
     * Create an offer for a peer.
     */
    suspend fun createOffer(peerId: String): SessionDescription? {
        val peerConnection = peerConnections[peerId] ?: return null

        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
        }

        return suspendCancellableCoroutine { continuation ->
            peerConnection.createOffer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription) {
                    peerConnection.setLocalDescription(SimpleSdpObserver(), sdp)
                    continuation.resume(sdp)
                }
                override fun onCreateFailure(error: String) {
                    continuation.resume(null)
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String) {}
            }, constraints)
        }
    }

    /**
     * Handle an incoming offer from a peer.
     */
    suspend fun handleOffer(peerId: String, offer: SessionDescription): SessionDescription? {
        val peerConnection = peerConnections[peerId] ?: return null
        peerConnection.setRemoteDescription(SimpleSdpObserver(), offer)

        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
        }

        return suspendCancellableCoroutine { continuation ->
            peerConnection.createAnswer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription) {
                    peerConnection.setLocalDescription(SimpleSdpObserver(), sdp)
                    continuation.resume(sdp)
                }
                override fun onCreateFailure(error: String) {
                    continuation.resume(null)
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String) {}
            }, constraints)
        }
    }

    /**
     * Handle an answer from a peer.
     */
    fun handleAnswer(peerId: String, answer: SessionDescription) {
        peerConnections[peerId]?.setRemoteDescription(SimpleSdpObserver(), answer)
    }

    /**
     * Add an ICE candidate from a peer.
     */
    fun addIceCandidate(peerId: String, candidate: IceCandidate) {
        peerConnections[peerId]?.addIceCandidate(candidate)
    }

    /**
     * Toggle mute state.
     */
    fun toggleMute(): Boolean {
        val newMuteState = !_isMuted.value
        _isMuted.value = newMuteState
        localAudioTrack?.setEnabled(!newMuteState)
        return newMuteState
    }

    /**
     * Set mute state directly.
     */
    fun setMuted(muted: Boolean) {
        _isMuted.value = muted
        localAudioTrack?.setEnabled(!muted)
    }

    /**
     * Disconnect from a specific peer.
     */
    fun disconnectPeer(peerId: String) {
        peerConnections[peerId]?.close()
        peerConnections.remove(peerId)
        if (peerConnections.isEmpty()) {
            _connectionState.value = VoiceConnectionState.DISCONNECTED
        }
    }

    /**
     * Disconnect from all peers.
     */
    fun disconnectAll() {
        peerConnections.values.forEach { it.close() }
        peerConnections.clear()
        _connectionState.value = VoiceConnectionState.DISCONNECTED
    }

    /**
     * Clean up all resources.
     */
    fun dispose() {
        disconnectAll()
        localAudioTrack?.dispose()
        audioSource?.dispose()
        factory?.dispose()
        localAudioTrack = null
        audioSource = null
        factory = null
        isInitialized = false
    }

    private fun updateConnectionState(iceState: PeerConnection.IceConnectionState) {
        _connectionState.value = when (iceState) {
            PeerConnection.IceConnectionState.NEW,
            PeerConnection.IceConnectionState.CHECKING -> VoiceConnectionState.CONNECTING
            PeerConnection.IceConnectionState.CONNECTED,
            PeerConnection.IceConnectionState.COMPLETED -> VoiceConnectionState.CONNECTED
            PeerConnection.IceConnectionState.DISCONNECTED,
            PeerConnection.IceConnectionState.FAILED,
            PeerConnection.IceConnectionState.CLOSED -> VoiceConnectionState.DISCONNECTED
        }
    }

    private class SimpleSdpObserver : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String) {}
        override fun onSetFailure(error: String) {}
    }
}

enum class VoiceConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED
}
