package com.prepverse.prepverse.ui.screens.peer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.AvailablePeer
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PeerDiscoveryScreen(
    onNavigateToSession: (String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: PeerDiscoveryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Handle navigation
    LaunchedEffect(uiState.createdSessionId) {
        uiState.createdSessionId?.let { sessionId ->
            onNavigateToSession(sessionId)
            viewModel.clearNavigationState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Find Study Partners") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.showProfileDialog() }) {
                        Icon(Icons.Default.Person, "My Profile")
                    }
                    IconButton(onClick = { viewModel.loadAvailablePeers() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search and filters
            SearchSection(
                searchTopic = uiState.searchTopic,
                selectedStrength = uiState.selectedStrength,
                isSearching = uiState.isSearching,
                onSearchChange = viewModel::searchByTopic,
                onStrengthChange = viewModel::filterByStrength
            )

            // Online status indicator
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    )
                    Text(
                        text = "You're visible to classmates",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Peers list
            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                uiState.filteredPeers.isEmpty() -> {
                    EmptyPeersState(
                        hasSearchQuery = uiState.searchTopic.isNotEmpty()
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.filteredPeers) { peer ->
                            PeerCard(
                                peer = peer,
                                isInviting = uiState.isInviting == peer.userId,
                                onInvite = { topic ->
                                    viewModel.invitePeerToSession(peer.userId, topic)
                                }
                            )
                        }
                    }
                }
            }
        }

        // Profile dialog
        if (uiState.showProfileDialog) {
            ProfileDialog(
                strongTopics = uiState.myStrongTopics,
                seekingHelpTopics = uiState.mySeekingHelpTopics,
                statusMessage = uiState.statusMessage,
                isUpdating = uiState.isUpdatingProfile,
                onDismiss = { viewModel.hideProfileDialog() },
                onSave = { strong, seeking ->
                    viewModel.updateMyTopics(strong, seeking)
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
private fun SearchSection(
    searchTopic: String,
    selectedStrength: String?,
    isSearching: Boolean,
    onSearchChange: (String) -> Unit,
    onStrengthChange: (String?) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchTopic,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search by topic (e.g., Quadratic Equations)") },
            leadingIcon = { Icon(Icons.Default.Search, "Search") },
            trailingIcon = {
                if (isSearching) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                }
            },
            singleLine = true
        )

        // Strength filter chips
        Text(
            text = "Filter by expertise:",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedStrength == null,
                    onClick = { onStrengthChange(null) },
                    label = { Text("All") }
                )
            }
            val subjects = listOf("Mathematics", "Physics", "Chemistry", "Biology")
            items(subjects) { subject ->
                FilterChip(
                    selected = selectedStrength == subject,
                    onClick = { onStrengthChange(subject) },
                    label = { Text(subject) }
                )
            }
        }
    }
}

@Composable
private fun PeerCard(
    peer: AvailablePeer,
    isInviting: Boolean,
    onInvite: (String) -> Unit
) {
    var showInviteDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Avatar
                    Surface(
                        modifier = Modifier.size(48.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = peer.userName.first().uppercaseChar().toString(),
                                style = MaterialTheme.typography.titleLarge
                            )
                        }
                    }

                    Column {
                        Text(
                            text = peer.userName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        peer.statusMessage?.let { status ->
                            Text(
                                text = status,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Online indicator
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primary,
                                shape = CircleShape
                            )
                    )
                    Text(
                        text = formatLastSeen(peer.lastSeenAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Strong topics
            if (peer.strongTopics.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Strong in:",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(peer.strongTopics) { topic ->
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = topic,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                    }
                }
            }

            // Seeking help topics
            if (peer.seekingHelpTopics.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = "Needs help with:",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(peer.seekingHelpTopics) { topic ->
                            Surface(
                                color = MaterialTheme.colorScheme.secondaryContainer,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = topic,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                    }
                }
            }

            // Invite button
            Button(
                onClick = { showInviteDialog = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isInviting
            ) {
                if (isInviting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Invite to Study")
                }
            }
        }
    }

    // Invite dialog
    if (showInviteDialog) {
        InviteDialog(
            peerName = peer.userName,
            suggestedTopics = peer.strongTopics + peer.seekingHelpTopics,
            onDismiss = { showInviteDialog = false },
            onInvite = { topic ->
                showInviteDialog = false
                onInvite(topic)
            }
        )
    }
}

@Composable
private fun InviteDialog(
    peerName: String,
    suggestedTopics: List<String>,
    onDismiss: () -> Unit,
    onInvite: (String) -> Unit
) {
    var topic by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Study with $peerName") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("What would you like to study together?")

                OutlinedTextField(
                    value = topic,
                    onValueChange = { topic = it },
                    label = { Text("Topic") },
                    placeholder = { Text("e.g., Quadratic Equations") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                if (suggestedTopics.isNotEmpty()) {
                    Text(
                        text = "Suggestions:",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(suggestedTopics.take(4)) { suggestion ->
                            SuggestionChip(
                                onClick = { topic = suggestion },
                                label = { Text(suggestion) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onInvite(topic) },
                enabled = topic.isNotBlank()
            ) {
                Text("Create Room")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun ProfileDialog(
    strongTopics: List<String>,
    seekingHelpTopics: List<String>,
    statusMessage: String,
    isUpdating: Boolean,
    onDismiss: () -> Unit,
    onSave: (List<String>, List<String>) -> Unit
) {
    var strong by remember { mutableStateOf(strongTopics.joinToString(", ")) }
    var seeking by remember { mutableStateOf(seekingHelpTopics.joinToString(", ")) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("My Study Profile") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Let classmates know what you're good at and what you need help with.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = strong,
                    onValueChange = { strong = it },
                    label = { Text("Topics I'm strong in") },
                    placeholder = { Text("e.g., Algebra, Mechanics, Organic Chemistry") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = seeking,
                    onValueChange = { seeking = it },
                    label = { Text("Topics I need help with") },
                    placeholder = { Text("e.g., Calculus, Thermodynamics") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "Separate topics with commas",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val strongList = strong.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    val seekingList = seeking.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    onSave(strongList, seekingList)
                },
                enabled = !isUpdating
            ) {
                if (isUpdating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Save")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isUpdating) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun EmptyPeersState(hasSearchQuery: Boolean) {
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
                text = if (hasSearchQuery) "No peers found for this topic" else "No classmates online",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = if (hasSearchQuery)
                    "Try a different search term"
                else
                    "Check back later or create a study room",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun formatLastSeen(lastSeen: Instant?): String {
    if (lastSeen == null) return "Online"

    val now = Instant.now()
    val minutes = ChronoUnit.MINUTES.between(lastSeen, now)

    return when {
        minutes < 1 -> "Just now"
        minutes < 5 -> "${minutes}m ago"
        else -> "Online"
    }
}
