package com.prepverse.prepverse.ui.screens.peer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.repository.PeerRepository
import com.prepverse.prepverse.domain.model.AvailablePeer
import com.prepverse.prepverse.domain.model.PeerSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PeerLobbyViewModel @Inject constructor(
    private val peerRepository: PeerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PeerLobbyUiState())
    val uiState: StateFlow<PeerLobbyUiState> = _uiState.asStateFlow()

    // Debounce job for search
    private var searchJob: Job? = null

    companion object {
        private const val SEARCH_DEBOUNCE_MS = 300L
    }

    init {
        loadSessions()
        loadAvailablePeers()
    }

    fun loadSessions(
        topic: String? = null,
        subject: String? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            peerRepository.listSessions(topic, subject)
                .onSuccess { sessions ->
                    _uiState.update { it.copy(sessions = sessions, isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            error = error.message ?: "Failed to load sessions",
                            isLoading = false
                        )
                    }
                }
        }
    }

    fun loadAvailablePeers() {
        viewModelScope.launch {
            peerRepository.getAvailablePeers()
                .onSuccess { peers ->
                    _uiState.update { it.copy(availablePeers = peers) }
                }
                .onFailure { error ->
                    // Silent fail for peers - not critical
                }
        }
    }

    fun filterBySubject(subject: String?) {
        _uiState.update { it.copy(selectedSubject = subject) }
        loadSessions(subject = subject, topic = _uiState.value.searchTopic)
    }

    fun searchByTopic(topic: String) {
        _uiState.update { it.copy(searchTopic = topic) }

        // Cancel any pending search
        searchJob?.cancel()

        // Only search if topic is empty (reset) or has at least 2 characters
        if (topic.length >= 2 || topic.isEmpty()) {
            searchJob = viewModelScope.launch {
                // Debounce: wait before executing search
                delay(SEARCH_DEBOUNCE_MS)
                loadSessions(
                    topic = topic.ifEmpty { null },
                    subject = _uiState.value.selectedSubject
                )
            }
        }
    }

    fun showCreateRoomDialog() {
        _uiState.update { it.copy(showCreateDialog = true) }
    }

    fun hideCreateRoomDialog() {
        _uiState.update { it.copy(showCreateDialog = false) }
    }

    fun createSession(
        name: String?,
        topic: String,
        subject: String,
        maxParticipants: Int = 4,
        voiceEnabled: Boolean = true,
        whiteboardEnabled: Boolean = true
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCreatingSession = true) }
            
            peerRepository.createSession(
                name = name,
                topic = topic,
                subject = subject,
                maxParticipants = maxParticipants,
                voiceEnabled = voiceEnabled,
                whiteboardEnabled = whiteboardEnabled
            )
                .onSuccess { session ->
                    _uiState.update {
                        it.copy(
                            isCreatingSession = false,
                            showCreateDialog = false,
                            createdSessionId = session.id
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to create session",
                            isCreatingSession = false
                        )
                    }
                }
        }
    }

    fun joinSession(sessionId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isJoiningSession = sessionId) }
            
            peerRepository.joinSession(sessionId)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isJoiningSession = null,
                            joinedSessionId = sessionId
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to join session",
                            isJoiningSession = null
                        )
                    }
                }
        }
    }

    fun clearNavigationState() {
        _uiState.update {
            it.copy(createdSessionId = null, joinedSessionId = null)
        }
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null) }
    }
}

data class PeerLobbyUiState(
    val sessions: List<PeerSession> = emptyList(),
    val availablePeers: List<AvailablePeer> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedSubject: String? = null,
    val searchTopic: String = "",
    val showCreateDialog: Boolean = false,
    val isCreatingSession: Boolean = false,
    val createdSessionId: String? = null,
    val isJoiningSession: String? = null,
    val joinedSessionId: String? = null
)
