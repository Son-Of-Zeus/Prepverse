package com.prepverse.prepverse.ui.screens.peer

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.local.EncryptionManager
import com.prepverse.prepverse.data.realtime.SupabaseRealtimeManager
import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.SendMessageRequest
import com.prepverse.prepverse.data.repository.PeerRepository
import com.prepverse.prepverse.domain.model.ChatMessage
import com.prepverse.prepverse.domain.model.MessageType
import com.prepverse.prepverse.domain.model.Participant
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class StudyRoomViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val peerRepository: PeerRepository,
    private val api: PrepVerseApi,
    private val encryptionManager: EncryptionManager,
    private val realtimeManager: SupabaseRealtimeManager
) : ViewModel() {

    private val sessionId: String = checkNotNull(savedStateHandle["roomId"])

    private val _uiState = MutableStateFlow(StudyRoomUiState())
    val uiState: StateFlow<StudyRoomUiState> = _uiState.asStateFlow()

    private var currentUserId: String = ""
    private var currentUserName: String = "User"

    init {
        loadCurrentUser()
    }

    private fun loadCurrentUser() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                // First, get current user info
                val userResponse = api.getCurrentUser()
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    val user = userResponse.body()!!
                    currentUserId = user.id
                    currentUserName = user.fullName ?: user.email.substringBefore("@")

                    timber.log.Timber.d("StudyRoom: User loaded - id=$currentUserId, name=$currentUserName")

                    // Now load the session
                    loadSession()
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Failed to load user: ${userResponse.code()}"
                        )
                    }
                }
            } catch (e: Exception) {
                timber.log.Timber.e(e, "StudyRoom: Failed to load user")
                _uiState.update {
                    it.copy(isLoading = false, error = "Failed to load user: ${e.message}")
                }
            }
        }
    }

    private fun loadSession() {
        viewModelScope.launch {
            timber.log.Timber.d("StudyRoom: Loading session $sessionId")

            try {
                // Load participants
                peerRepository.getParticipants(sessionId)
                    .onSuccess { participants ->
                        timber.log.Timber.d("StudyRoom: Loaded ${participants.size} participants")
                        _uiState.update { it.copy(participants = participants) }
                    }
                    .onFailure { error ->
                        timber.log.Timber.e("StudyRoom: Failed to load participants: ${error.message}")
                    }

                // Load existing messages
                loadMessages()

                // Generate and store session encryption key
                val sessionKey = encryptionManager.generateSessionKey()
                encryptionManager.storeSessionKey(sessionId, sessionKey)

                // Setup realtime listeners first (they run in background)
                setupRealtimeListeners()

                // Join realtime channel with retry logic
                viewModelScope.launch {
                    var retries = 0
                    val maxRetries = 3
                    var success = false

                    while (retries < maxRetries && !success) {
                        try {
                            kotlinx.coroutines.withTimeout(10000) { // Increased timeout to 10 seconds
                                timber.log.Timber.d("StudyRoom: Joining realtime channel for session $sessionId (attempt ${retries + 1}/$maxRetries)")
                                realtimeManager.joinSession(sessionId, currentUserId, currentUserName)
                                timber.log.Timber.d("StudyRoom: Joined realtime channel successfully")
                                success = true
                            }
                        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                            retries++
                            timber.log.Timber.w("StudyRoom: Realtime connection timed out (attempt $retries/$maxRetries)")
                            if (retries < maxRetries) {
                                kotlinx.coroutines.delay(1000L * retries) // Exponential backoff
                            }
                        } catch (e: Exception) {
                            retries++
                            timber.log.Timber.e(e, "StudyRoom: Failed to join realtime channel (attempt $retries/$maxRetries)")
                            if (retries < maxRetries) {
                                kotlinx.coroutines.delay(1000L * retries)
                            }
                        }
                    }

                    if (!success) {
                        timber.log.Timber.e("StudyRoom: Failed to join realtime after $maxRetries attempts - chat may not work")
                        _uiState.update { it.copy(error = "Real-time connection failed. Messages may not sync.") }
                    }
                }

            } catch (e: Exception) {
                timber.log.Timber.e(e, "StudyRoom: Error loading session")
                _uiState.update { it.copy(error = "Failed to load session: ${e.message}") }
            } finally {
                // Always stop loading, even if there were errors
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    private fun setupRealtimeListeners() {
        viewModelScope.launch {
            timber.log.Timber.d("StudyRoom: Setting up message listener")
            // Listen for new messages
            realtimeManager.messageFlow.collect { realtimeMessage ->
                timber.log.Timber.d("StudyRoom: Received realtime message from ${realtimeMessage.senderId}")

                if (realtimeMessage.sessionId == sessionId) {
                    // Skip our own messages (we already added them locally)
                    if (realtimeMessage.senderId == currentUserId) {
                        timber.log.Timber.d("StudyRoom: Skipping own message")
                        return@collect
                    }

                    try {
                        // Decode Base64 content
                        val decodedContent = String(
                            android.util.Base64.decode(
                                realtimeMessage.encryptedContent,
                                android.util.Base64.NO_WRAP
                            ),
                            Charsets.UTF_8
                        )

                        timber.log.Timber.d("StudyRoom: Decoded message: $decodedContent")

                        val message = ChatMessage(
                            id = realtimeMessage.messageId,
                            sessionId = sessionId,
                            senderId = realtimeMessage.senderId,
                            senderName = realtimeMessage.senderName,
                            content = decodedContent,
                            messageType = MessageType.TEXT,
                            createdAt = Instant.ofEpochMilli(realtimeMessage.timestamp),
                            isFromMe = false
                        )
                        _uiState.update { state ->
                            // Avoid duplicates
                            if (state.messages.none { it.id == message.id }) {
                                state.copy(messages = state.messages + message)
                            } else {
                                state
                            }
                        }
                    } catch (e: Exception) {
                        timber.log.Timber.e(e, "StudyRoom: Failed to decode message")
                    }
                }
            }
        }

        viewModelScope.launch {
            timber.log.Timber.d("StudyRoom: Setting up presence listener")
            // Listen for presence changes
            realtimeManager.presenceFlow.collect { changedSessionId ->
                timber.log.Timber.d("StudyRoom: Presence changed for session $changedSessionId")
                if (changedSessionId == sessionId) {
                    loadParticipants()
                }
            }
        }
    }

    private fun loadMessages() {
        viewModelScope.launch {
            timber.log.Timber.d("StudyRoom: Loading messages for session $sessionId")
            try {
                val response = api.getPeerMessages(sessionId)
                if (response.isSuccessful) {
                    val messages = response.body()?.mapNotNull { messageDto ->
                        try {
                            // Get encoded content for current user (or first available)
                            val encodedContent = messageDto.encryptedContent[currentUserId]
                                ?: messageDto.encryptedContent.values.firstOrNull()
                                ?: return@mapNotNull null

                            // Decode Base64 content
                            val decoded = String(
                                android.util.Base64.decode(encodedContent, android.util.Base64.NO_WRAP),
                                Charsets.UTF_8
                            )

                            ChatMessage(
                                id = messageDto.id,
                                sessionId = messageDto.sessionId,
                                senderId = messageDto.senderId,
                                senderName = messageDto.senderName,
                                content = decoded,
                                messageType = MessageType.TEXT,
                                createdAt = Instant.parse(messageDto.createdAt),
                                isFromMe = messageDto.senderId == currentUserId
                            )
                        } catch (e: Exception) {
                            timber.log.Timber.w(e, "StudyRoom: Failed to decode message ${messageDto.id}")
                            null
                        }
                    } ?: emptyList()

                    timber.log.Timber.d("StudyRoom: Loaded ${messages.size} messages")
                    _uiState.update { it.copy(messages = messages) }
                } else {
                    timber.log.Timber.w("StudyRoom: Failed to load messages: ${response.code()}")
                }
            } catch (e: Exception) {
                timber.log.Timber.e(e, "StudyRoom: Error loading messages")
                // Don't show error to user - messages will come via realtime
            }
        }
    }

    private fun loadParticipants() {
        viewModelScope.launch {
            timber.log.Timber.d("StudyRoom: Reloading participants for session $sessionId")
            peerRepository.getParticipants(sessionId)
                .onSuccess { participants ->
                    timber.log.Timber.d("StudyRoom: Loaded ${participants.size} participants: ${participants.map { it.userName }}")
                    _uiState.update { it.copy(participants = participants) }
                }
                .onFailure { error ->
                    timber.log.Timber.e(error, "StudyRoom: Failed to reload participants")
                }
        }
    }

    fun sendMessage(content: String) {
        if (content.isBlank()) return

        viewModelScope.launch {
            try {
                val messageId = UUID.randomUUID().toString()

                timber.log.Timber.d("StudyRoom: Sending message - id=$messageId, content=$content")

                // For now, use simple Base64 encoding instead of complex encryption
                // This allows messages to be readable by all participants
                val encodedContent = android.util.Base64.encodeToString(
                    content.toByteArray(Charsets.UTF_8),
                    android.util.Base64.NO_WRAP
                )

                // Broadcast via realtime immediately (this is the real-time path)
                realtimeManager.broadcastMessage(
                    sessionId = sessionId,
                    messageId = messageId,
                    senderId = currentUserId,
                    senderName = currentUserName,
                    encryptedContent = encodedContent
                )

                timber.log.Timber.d("StudyRoom: Message broadcast sent")

                // Add to local state immediately (sender sees their own message)
                val message = ChatMessage(
                    id = messageId,
                    sessionId = sessionId,
                    senderId = currentUserId,
                    senderName = currentUserName,
                    content = content,
                    messageType = MessageType.TEXT,
                    createdAt = Instant.now(),
                    isFromMe = true
                )
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages + message,
                        messageInput = ""
                    )
                }

                // Also persist to server (optional, for history)
                try {
                    val encryptedForAll = _uiState.value.participants.associate { participant ->
                        participant.userId to encodedContent
                    }
                    api.sendPeerMessage(
                        SendMessageRequest(
                            sessionId = sessionId,
                            encryptedContent = encryptedForAll,
                            messageType = "text"
                        )
                    )
                } catch (e: Exception) {
                    timber.log.Timber.w(e, "StudyRoom: Failed to persist message to server")
                    // Don't fail the send - realtime already delivered it
                }

            } catch (e: Exception) {
                timber.log.Timber.e(e, "StudyRoom: Failed to send message")
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun updateMessageInput(text: String) {
        _uiState.update { it.copy(messageInput = text) }
    }

    fun toggleWhiteboard() {
        _uiState.update { it.copy(showWhiteboard = !it.showWhiteboard) }
    }

    fun leaveSession(onLeft: () -> Unit) {
        viewModelScope.launch {
            peerRepository.leaveSession(sessionId)
                .onSuccess {
                    encryptionManager.clearSessionKey(sessionId)
                    realtimeManager.leaveSession(sessionId)
                    onLeft()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null) }
    }

    override fun onCleared() {
        super.onCleared()
        // IMPORTANT: Use GlobalScope here because viewModelScope is cancelled when VM is cleared
        // We need the API call to complete even after the ViewModel is destroyed
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                timber.log.Timber.d("StudyRoom: onCleared - leaving session $sessionId")
                // Leave the session on the backend first
                peerRepository.leaveSession(sessionId)
                    .onSuccess {
                        timber.log.Timber.d("StudyRoom: Successfully left session $sessionId via API")
                    }
                    .onFailure { error ->
                        timber.log.Timber.e(error, "StudyRoom: Failed to leave session via API")
                    }
                // Then leave realtime and clear encryption
                realtimeManager.leaveSession(sessionId)
                encryptionManager.clearSessionKey(sessionId)
            } catch (e: Exception) {
                timber.log.Timber.e(e, "StudyRoom: Error during cleanup in onCleared")
            }
        }
    }
}

data class StudyRoomUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val participants: List<Participant> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val messageInput: String = "",
    val showWhiteboard: Boolean = false
)
