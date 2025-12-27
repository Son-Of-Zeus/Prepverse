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

    private val sessionId: String = checkNotNull(savedStateHandle["sessionId"])
    
    private val _uiState = MutableStateFlow(StudyRoomUiState())
    val uiState: StateFlow<StudyRoomUiState> = _uiState.asStateFlow()

    private var currentUserId: String = ""
    private var currentUserName: String = "You"

    init {
        loadSession()
        setupRealtimeListeners()
    }

    private fun loadSession() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Load participants
            peerRepository.getParticipants(sessionId)
                .onSuccess { participants ->
                    _uiState.update { it.copy(participants = participants) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }

            // Load messages
            loadMessages()

            // Generate and store session encryption key
            val sessionKey = encryptionManager.generateSessionKey()
            encryptionManager.storeSessionKey(sessionId, sessionKey)

            // Join realtime channel
            realtimeManager.joinSession(sessionId, currentUserId, currentUserName)

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    private fun setupRealtimeListeners() {
        viewModelScope.launch {
            // Listen for new messages
            realtimeManager.messageFlow.collect { realtimeMessage ->
                if (realtimeMessage.sessionId == sessionId) {
                    try {
                        val decryptedContent = encryptionManager.decrypt(
                            realtimeMessage.encryptedContent,
                            sessionId
                        )
                        val message = ChatMessage(
                            id = realtimeMessage.messageId,
                            sessionId = sessionId,
                            senderId = realtimeMessage.senderId,
                            senderName = realtimeMessage.senderName,
                            content = decryptedContent,
                            messageType = MessageType.TEXT,
                            createdAt = Instant.ofEpochMilli(realtimeMessage.timestamp),
                            isFromMe = realtimeMessage.senderId == currentUserId
                        )
                        _uiState.update { state ->
                            state.copy(messages = state.messages + message)
                        }
                    } catch (e: Exception) {
                        // Failed to decrypt - ignore
                    }
                }
            }
        }

        viewModelScope.launch {
            // Listen for presence changes
            realtimeManager.presenceFlow.collect { changedSessionId ->
                if (changedSessionId == sessionId) {
                    loadParticipants()
                }
            }
        }
    }

    private fun loadMessages() {
        viewModelScope.launch {
            try {
                val response = api.getPeerMessages(sessionId)
                if (response.isSuccessful) {
                    val messages = response.body()?.mapNotNull { messageDto ->
                        try {
                            // Get encrypted content for current user
                            val encryptedForMe = messageDto.encryptedContent[currentUserId]
                                ?: return@mapNotNull null

                            val decrypted = encryptionManager.decrypt(encryptedForMe, sessionId)
                            ChatMessage(
                                id = messageDto.id,
                                sessionId = messageDto.sessionId,
                                senderId = messageDto.senderId,
                                senderName = messageDto.senderName,
                                content = decrypted,
                                messageType = MessageType.TEXT,
                                createdAt = Instant.parse(messageDto.createdAt),
                                isFromMe = messageDto.senderId == currentUserId
                            )
                        } catch (e: Exception) {
                            null
                        }
                    } ?: emptyList()

                    _uiState.update { it.copy(messages = messages) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    private fun loadParticipants() {
        viewModelScope.launch {
            peerRepository.getParticipants(sessionId)
                .onSuccess { participants ->
                    _uiState.update { it.copy(participants = participants) }
                }
                .onFailure { /* Silent fail */ }
        }
    }

    fun sendMessage(content: String) {
        if (content.isBlank()) return

        viewModelScope.launch {
            try {
                // Encrypt message for each participant
                val encryptedContent = _uiState.value.participants.associate { participant ->
                    participant.userId to encryptionManager.encrypt(content, sessionId)
                }

                // Send to server
                val messageId = UUID.randomUUID().toString()
                val response = api.sendPeerMessage(
                    SendMessageRequest(
                        sessionId = sessionId,
                        encryptedContent = encryptedContent,
                        messageType = "text"
                    )
                )

                if (response.isSuccessful) {
                    // Broadcast via realtime
                    realtimeManager.broadcastMessage(
                        sessionId = sessionId,
                        messageId = messageId,
                        senderId = currentUserId,
                        senderName = currentUserName,
                        encryptedContent = encryptedContent[currentUserId] ?: ""
                    )

                    // Add to local state immediately
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
                }
            } catch (e: Exception) {
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
        viewModelScope.launch {
            realtimeManager.leaveSession(sessionId)
            encryptionManager.clearSessionKey(sessionId)
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
