package com.prepverse.prepverse.ui.screens.peer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.repository.PeerRepository
import com.prepverse.prepverse.domain.model.AvailablePeer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PeerDiscoveryViewModel @Inject constructor(
    private val peerRepository: PeerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PeerDiscoveryUiState())
    val uiState: StateFlow<PeerDiscoveryUiState> = _uiState.asStateFlow()

    init {
        loadAvailablePeers()
        setUserAvailable()
    }

    private fun setUserAvailable() {
        viewModelScope.launch {
            peerRepository.setAvailability(
                available = true,
                statusMessage = "Looking for study partners",
                strongTopics = emptyList(),
                seekingHelpTopics = emptyList()
            )
        }
    }

    fun loadAvailablePeers() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            peerRepository.getAvailablePeers()
                .onSuccess { peers ->
                    _uiState.update {
                        it.copy(
                            availablePeers = peers,
                            filteredPeers = filterPeers(peers, it.searchTopic, it.selectedStrength),
                            isLoading = false
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to load peers",
                            isLoading = false
                        )
                    }
                }
        }
    }

    fun searchByTopic(topic: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(searchTopic = topic, isSearching = true) }

            if (topic.length >= 2) {
                peerRepository.findPeersByTopic(topic)
                    .onSuccess { peers ->
                        _uiState.update {
                            it.copy(
                                filteredPeers = peers,
                                isSearching = false
                            )
                        }
                    }
                    .onFailure {
                        // Fall back to local filtering
                        _uiState.update { state ->
                            state.copy(
                                filteredPeers = filterPeers(state.availablePeers, topic, state.selectedStrength),
                                isSearching = false
                            )
                        }
                    }
            } else {
                _uiState.update { state ->
                    state.copy(
                        filteredPeers = filterPeers(state.availablePeers, topic, state.selectedStrength),
                        isSearching = false
                    )
                }
            }
        }
    }

    fun filterByStrength(strength: String?) {
        _uiState.update { state ->
            state.copy(
                selectedStrength = strength,
                filteredPeers = filterPeers(state.availablePeers, state.searchTopic, strength)
            )
        }
    }

    fun updateMyTopics(strongTopics: List<String>, seekingHelpTopics: List<String>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingProfile = true) }

            peerRepository.setAvailability(
                available = true,
                statusMessage = _uiState.value.statusMessage,
                strongTopics = strongTopics,
                seekingHelpTopics = seekingHelpTopics
            )
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            myStrongTopics = strongTopics,
                            mySeekingHelpTopics = seekingHelpTopics,
                            isUpdatingProfile = false,
                            showProfileDialog = false
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to update topics",
                            isUpdatingProfile = false
                        )
                    }
                }
        }
    }

    fun updateStatusMessage(message: String) {
        _uiState.update { it.copy(statusMessage = message) }
    }

    fun showProfileDialog() {
        _uiState.update { it.copy(showProfileDialog = true) }
    }

    fun hideProfileDialog() {
        _uiState.update { it.copy(showProfileDialog = false) }
    }

    fun invitePeerToSession(peerId: String, topic: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isInviting = peerId) }

            // Create a new session and invite the peer
            peerRepository.createSession(
                name = null,
                topic = topic,
                subject = getSubjectFromTopic(topic),
                maxParticipants = 2,
                voiceEnabled = true,
                whiteboardEnabled = true
            )
                .onSuccess { session ->
                    _uiState.update {
                        it.copy(
                            isInviting = null,
                            createdSessionId = session.id
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to create session",
                            isInviting = null
                        )
                    }
                }
        }
    }

    fun clearNavigationState() {
        _uiState.update { it.copy(createdSessionId = null) }
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null) }
    }

    fun setOffline() {
        viewModelScope.launch {
            peerRepository.setAvailability(
                available = false,
                statusMessage = null,
                strongTopics = emptyList(),
                seekingHelpTopics = emptyList()
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        setOffline()
    }

    private fun filterPeers(
        peers: List<AvailablePeer>,
        topic: String,
        strength: String?
    ): List<AvailablePeer> {
        return peers.filter { peer ->
            val matchesTopic = topic.isEmpty() ||
                peer.strongTopics.any { it.contains(topic, ignoreCase = true) } ||
                peer.seekingHelpTopics.any { it.contains(topic, ignoreCase = true) }

            val matchesStrength = strength == null ||
                peer.strongTopics.contains(strength)

            matchesTopic && matchesStrength
        }
    }

    private fun getSubjectFromTopic(topic: String): String {
        val topicLower = topic.lowercase()
        return when {
            topicLower.contains("math") || topicLower.contains("algebra") ||
            topicLower.contains("geometry") || topicLower.contains("calculus") -> "Mathematics"
            topicLower.contains("physics") || topicLower.contains("motion") ||
            topicLower.contains("force") || topicLower.contains("energy") -> "Physics"
            topicLower.contains("chem") || topicLower.contains("organic") ||
            topicLower.contains("reaction") || topicLower.contains("element") -> "Chemistry"
            topicLower.contains("bio") || topicLower.contains("cell") ||
            topicLower.contains("genetics") || topicLower.contains("evolution") -> "Biology"
            else -> "Mathematics" // Default
        }
    }
}

data class PeerDiscoveryUiState(
    val availablePeers: List<AvailablePeer> = emptyList(),
    val filteredPeers: List<AvailablePeer> = emptyList(),
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val error: String? = null,
    val searchTopic: String = "",
    val selectedStrength: String? = null,
    val myStrongTopics: List<String> = emptyList(),
    val mySeekingHelpTopics: List<String> = emptyList(),
    val statusMessage: String = "",
    val showProfileDialog: Boolean = false,
    val isUpdatingProfile: Boolean = false,
    val isInviting: String? = null,
    val createdSessionId: String? = null
)
