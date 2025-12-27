package com.prepverse.prepverse.ui.screens.peer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.PeerSession
import com.prepverse.prepverse.domain.model.SessionStatus
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PeerLobbyScreen(
    onNavigateToSession: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onNavigateToPeerDiscovery: () -> Unit = {},
    viewModel: PeerLobbyViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Handle navigation
    LaunchedEffect(uiState.createdSessionId) {
        uiState.createdSessionId?.let { sessionId ->
            onNavigateToSession(sessionId)
            viewModel.clearNavigationState()
        }
    }

    LaunchedEffect(uiState.joinedSessionId) {
        uiState.joinedSessionId?.let { sessionId ->
            onNavigateToSession(sessionId)
            viewModel.clearNavigationState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Study Rooms") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToPeerDiscovery) {
                        Icon(Icons.Default.Person, "Find Peers")
                    }
                    IconButton(onClick = { viewModel.loadSessions() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { viewModel.showCreateRoomDialog() },
                icon = { Icon(Icons.Default.Add, "Create") },
                text = { Text("Create Room") }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search and filters
            SearchAndFilters(
                searchTopic = uiState.searchTopic,
                selectedSubject = uiState.selectedSubject,
                onSearchChange = viewModel::searchByTopic,
                onSubjectChange = viewModel::filterBySubject
            )

            // Session list
            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                uiState.sessions.isEmpty() -> {
                    EmptyState()
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.sessions) { session ->
                            SessionCard(
                                session = session,
                                isJoining = uiState.isJoiningSession == session.id,
                                onJoinClick = { viewModel.joinSession(session.id) }
                            )
                        }
                    }
                }
            }
        }

        // Create room dialog
        if (uiState.showCreateDialog) {
            CreateRoomDialog(
                isCreating = uiState.isCreatingSession,
                onDismiss = { viewModel.hideCreateRoomDialog() },
                onCreate = { name, topic, subject, maxParticipants, voiceEnabled, whiteboardEnabled ->
                    viewModel.createSession(
                        name = name,
                        topic = topic,
                        subject = subject,
                        maxParticipants = maxParticipants,
                        voiceEnabled = voiceEnabled,
                        whiteboardEnabled = whiteboardEnabled
                    )
                }
            )
        }

        // Error snackbar
        uiState.error?.let { error ->
            LaunchedEffect(error) {
                kotlinx.coroutines.delay(3000)
                viewModel.dismissError()
            }
        }
    }
}

@Composable
private fun SearchAndFilters(
    searchTopic: String,
    selectedSubject: String?,
    onSearchChange: (String) -> Unit,
    onSubjectChange: (String?) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchTopic,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search by topic...") },
            leadingIcon = { Icon(Icons.Default.Search, "Search") },
            singleLine = true
        )

        // Subject chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val subjects = listOf("Mathematics", "Physics", "Chemistry", "Biology")
            FilterChip(
                selected = selectedSubject == null,
                onClick = { onSubjectChange(null) },
                label = { Text("All") }
            )
            subjects.forEach { subject ->
                FilterChip(
                    selected = selectedSubject == subject,
                    onClick = { onSubjectChange(subject) },
                    label = { Text(subject) }
                )
            }
        }
    }
}

@Composable
private fun SessionCard(
    session: PeerSession,
    isJoining: Boolean,
    onJoinClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.name ?: session.topic,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = session.subject,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Status badge
                Surface(
                    color = when (session.status) {
                        SessionStatus.WAITING -> MaterialTheme.colorScheme.primaryContainer
                        SessionStatus.ACTIVE -> MaterialTheme.colorScheme.tertiaryContainer
                        SessionStatus.CLOSED -> MaterialTheme.colorScheme.errorContainer
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = session.status.name,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }

            // Info row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                InfoChip(
                    icon = Icons.Default.Person,
                    text = "${session.participantCount}/${session.maxParticipants}"
                )
                if (session.isVoiceEnabled) {
                    InfoChip(icon = Icons.Default.Phone, text = "Voice")
                }
                if (session.isWhiteboardEnabled) {
                    InfoChip(icon = Icons.Default.Edit, text = "Board")
                }
            }

            // Time
            Text(
                text = formatTime(session.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Join button
            if (session.status != SessionStatus.CLOSED && 
                session.participantCount < session.maxParticipants) {
                Button(
                    onClick = onJoinClick,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isJoining
                ) {
                    if (isJoining) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Join Room")
                    }
                }
            } else if (session.participantCount >= session.maxParticipants) {
                Text(
                    text = "Room Full",
                    modifier = Modifier.fillMaxWidth(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun InfoChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Surface(
        color = MaterialTheme.colorScheme.secondaryContainer,
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp)
            )
            Text(text = text, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "No study rooms available",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Create one to get started!",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun CreateRoomDialog(
    isCreating: Boolean,
    onDismiss: () -> Unit,
    onCreate: (String?, String, String, Int, Boolean, Boolean) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var topic by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("Mathematics") }
    var maxParticipants by remember { mutableStateOf(4) }
    var voiceEnabled by remember { mutableStateOf(true) }
    var whiteboardEnabled by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Study Room") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Room Name (Optional)") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = topic,
                    onValueChange = { topic = it },
                    label = { Text("Topic *") },
                    modifier = Modifier.fillMaxWidth()
                )

                // Subject dropdown
                var expanded by remember { mutableStateOf(false) }
                @OptIn(ExperimentalMaterial3Api::class)
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = subject,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Subject") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        listOf("Mathematics", "Physics", "Chemistry", "Biology").forEach { subj ->
                            DropdownMenuItem(
                                text = { Text(subj) },
                                onClick = {
                                    subject = subj
                                    expanded = false
                                }
                            )
                        }
                    }
                }

                // Max participants
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Max Participants")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(2, 3, 4).forEach { count ->
                            FilterChip(
                                selected = maxParticipants == count,
                                onClick = { maxParticipants = count },
                                label = { Text(count.toString()) }
                            )
                        }
                    }
                }

                // Features
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Enable Voice")
                    Switch(
                        checked = voiceEnabled,
                        onCheckedChange = { voiceEnabled = it }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Enable Whiteboard")
                    Switch(
                        checked = whiteboardEnabled,
                        onCheckedChange = { whiteboardEnabled = it }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (topic.isNotBlank()) {
                        onCreate(
                            name.ifBlank { null },
                            topic,
                            subject,
                            maxParticipants,
                            voiceEnabled,
                            whiteboardEnabled
                        )
                    }
                },
                enabled = !isCreating && topic.isNotBlank()
            ) {
                if (isCreating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Create")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isCreating) {
                Text("Cancel")
            }
        }
    )
}

private fun formatTime(instant: Instant): String {
    val formatter = DateTimeFormatter.ofPattern("MMM dd, HH:mm")
        .withZone(ZoneId.systemDefault())
    return formatter.format(instant)
}
