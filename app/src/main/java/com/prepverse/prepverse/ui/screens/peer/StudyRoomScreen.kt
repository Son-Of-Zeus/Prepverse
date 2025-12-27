package com.prepverse.prepverse.ui.screens.peer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.ChatMessage
import com.prepverse.prepverse.domain.model.Participant
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyRoomScreen(
    onNavigateBack: () -> Unit,
    onNavigateToWhiteboard: () -> Unit = {},
    viewModel: StudyRoomViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showLeaveDialog by remember { mutableStateOf(false) }
    var showParticipantsSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Study Room")
                        Text(
                            text = "${uiState.participants.size} participants",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { showLeaveDialog = true }) {
                        Icon(Icons.Default.ExitToApp, "Leave")
                    }
                },
                actions = {
                    IconButton(onClick = { showParticipantsSheet = true }) {
                        BadgedBox(
                            badge = {
                                Badge { Text(uiState.participants.size.toString()) }
                            }
                        ) {
                            Icon(Icons.Default.Person, "Participants")
                        }
                    }
                    IconButton(onClick = { viewModel.toggleWhiteboard() }) {
                        Icon(Icons.Default.Edit, "Whiteboard")
                    }
                }
            )
        },
        bottomBar = {
            if (!uiState.showWhiteboard) {
                MessageInput(
                    value = uiState.messageInput,
                    onValueChange = viewModel::updateMessageInput,
                    onSend = { viewModel.sendMessage(uiState.messageInput) }
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (uiState.showWhiteboard) {
                WhiteboardView(
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                ChatView(
                    messages = uiState.messages,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Loading overlay
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background.copy(alpha = 0.7f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        // Participants sheet
        if (showParticipantsSheet) {
            ParticipantsSheet(
                participants = uiState.participants,
                onDismiss = { showParticipantsSheet = false }
            )
        }

        // Leave dialog
        if (showLeaveDialog) {
            AlertDialog(
                onDismissRequest = { showLeaveDialog = false },
                title = { Text("Leave Study Room?") },
                text = { Text("Are you sure you want to leave this session?") },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.leaveSession {
                                onNavigateBack()
                            }
                        }
                    ) {
                        Text("Leave")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLeaveDialog = false }) {
                        Text("Cancel")
                    }
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
private fun ChatView(
    messages: List<ChatMessage>,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    if (messages.isEmpty()) {
        Box(
            modifier = modifier,
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "No messages yet",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Start the conversation!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    } else {
        LazyColumn(
            modifier = modifier,
            state = listState,
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { message ->
                MessageBubble(message = message)
            }
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.isFromMe) Arrangement.End else Arrangement.Start
    ) {
        if (!message.isFromMe) {
            Surface(
                modifier = Modifier.size(32.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = message.senderName.first().uppercaseChar().toString(),
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Column(
            modifier = Modifier.widthIn(max = 280.dp),
            horizontalAlignment = if (message.isFromMe) Alignment.End else Alignment.Start
        ) {
            if (!message.isFromMe) {
                Text(
                    text = message.senderName,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                Spacer(modifier = Modifier.height(2.dp))
            }

            Surface(
                shape = RoundedCornerShape(
                    topStart = if (message.isFromMe) 16.dp else 4.dp,
                    topEnd = if (message.isFromMe) 4.dp else 16.dp,
                    bottomStart = 16.dp,
                    bottomEnd = 16.dp
                ),
                color = if (message.isFromMe) 
                    MaterialTheme.colorScheme.primary 
                else 
                    MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    text = message.content,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (message.isFromMe)
                        MaterialTheme.colorScheme.onPrimary
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Text(
                text = formatMessageTime(message.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
            )
        }
    }
}

@Composable
private fun MessageInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 3.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Type a message...") },
                maxLines = 4
            )

            IconButton(
                onClick = onSend,
                enabled = value.isNotBlank()
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = if (value.isNotBlank())
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ParticipantsSheet(
    participants: List<Participant>,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Participants (${participants.size})",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            participants.forEach { participant ->
                ParticipantItem(participant)
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ParticipantItem(participant: Participant) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(40.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = participant.userName.first().uppercaseChar().toString(),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = participant.userName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                if (participant.role.name == "HOST") {
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "HOST",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }
        }

        if (participant.isVoiceActive) {
            Icon(
                imageVector = if (participant.isMuted) Icons.Default.Close else Icons.Default.Phone,
                contentDescription = if (participant.isMuted) "Muted" else "Speaking",
                tint = if (participant.isMuted)
                    MaterialTheme.colorScheme.error
                else
                    MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun WhiteboardView(modifier: Modifier = Modifier) {
    // Use the actual whiteboard canvas
    var currentTool by remember { mutableStateOf(WhiteboardTool.DRAW) }
    var currentColor by remember { mutableStateOf(androidx.compose.ui.graphics.Color.Black) }
    var currentStrokeWidth by remember { mutableStateOf(5f) }
    var operations by remember { mutableStateOf<List<com.prepverse.prepverse.domain.model.WhiteboardOperation>>(emptyList()) }

    Column(modifier = modifier) {
        WhiteboardControls(
            currentTool = currentTool,
            currentColor = currentColor,
            currentStrokeWidth = currentStrokeWidth,
            onToolChanged = { currentTool = it },
            onColorChanged = { currentColor = it },
            onStrokeWidthChanged = { currentStrokeWidth = it },
            onClear = {
                val clearOp = com.prepverse.prepverse.domain.model.WhiteboardOperation.Clear(
                    id = java.util.UUID.randomUUID().toString(),
                    userId = "current-user",
                    timestamp = System.currentTimeMillis()
                )
                operations = listOf(clearOp)
            },
            modifier = Modifier.fillMaxWidth()
        )

        WhiteboardCanvas(
            operations = operations,
            currentTool = currentTool,
            currentColor = currentColor,
            currentStrokeWidth = currentStrokeWidth,
            onOperationAdded = { operation ->
                operations = operations + operation
                // TODO: Sync to server
            },
            modifier = Modifier.weight(1f)
        )
    }
}

private fun formatMessageTime(instant: java.time.Instant): String {
    val formatter = DateTimeFormatter.ofPattern("HH:mm")
        .withZone(java.time.ZoneId.systemDefault())
    return formatter.format(instant)
}
