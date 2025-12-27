package com.prepverse.prepverse.ui.screens.practice

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.data.remote.api.dto.TopicInfo
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToQuiz: (sessionId: String) -> Unit,
    initialSubject: String? = null,
    initialTopic: String? = null
) {
    val uiState by viewModel.uiState.collectAsState()

    // Apply initial selections when data is loaded
    LaunchedEffect(uiState.topics, initialSubject, initialTopic) {
        if (uiState.topics.isNotEmpty() && !uiState.isLoading) {
            // First select the subject
            if (initialSubject != null && uiState.selectedSubject != initialSubject) {
                viewModel.selectSubject(initialSubject)
            }
            // Then select the topic after filtering
            if (initialTopic != null) {
                val matchingTopic = uiState.topics.find { it.topic == initialTopic }
                if (matchingTopic != null && uiState.selectedTopic != matchingTopic) {
                    viewModel.selectTopic(matchingTopic)
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Practice",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Void)
            )
        },
        containerColor = Void
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = PrepVerseRed
                    )
                }

                uiState.error != null -> {
                    ErrorContent(
                        message = uiState.error!!,
                        onRetry = { viewModel.loadTopics() },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                else -> {
                    PracticeContent(
                        uiState = uiState,
                        onSelectSubject = viewModel::selectSubject,
                        onSelectTopic = viewModel::selectTopic,
                        onSelectDifficulty = viewModel::selectDifficulty,
                        onSetQuestionCount = viewModel::setQuestionCount,
                        onSetTimeLimit = viewModel::setTimeLimit,
                        onStartSession = { viewModel.startSession(onNavigateToQuiz) }
                    )
                }
            }

            // Starting session overlay
            AnimatedVisibility(
                visible = uiState.isStartingSession,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Void.copy(alpha = 0.8f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(color = PrepVerseRed)
                        Text(
                            text = "Preparing your questions...",
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeContent(
    uiState: PracticeUiState,
    onSelectSubject: (String) -> Unit,
    onSelectTopic: (TopicInfo) -> Unit,
    onSelectDifficulty: (String?) -> Unit,
    onSetQuestionCount: (Int) -> Unit,
    onSetTimeLimit: (Int?) -> Unit,
    onStartSession: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Subject Selection
        item {
            SectionHeader(title = "Select Subject")
        }

        item {
            SubjectChips(
                subjects = uiState.subjects,
                selectedSubject = uiState.selectedSubject,
                onSelectSubject = onSelectSubject
            )
        }

        // Topic Selection
        item {
            SectionHeader(
                title = "Select Topic",
                subtitle = uiState.selectedTopic?.let { "Selected: ${it.displayName}" }
            )
        }

        item {
            TopicsGrid(
                topics = uiState.filteredTopics,
                selectedTopic = uiState.selectedTopic,
                onSelectTopic = onSelectTopic
            )
        }

        // Difficulty Selection
        item {
            SectionHeader(title = "Difficulty")
        }

        item {
            DifficultySelector(
                selectedDifficulty = uiState.selectedDifficulty,
                onSelectDifficulty = onSelectDifficulty
            )
        }

        // Session Configuration
        item {
            SectionHeader(title = "Session Settings")
        }

        item {
            SessionConfigCard(
                questionCount = uiState.questionCount,
                timeLimitMinutes = uiState.timeLimitMinutes,
                onSetQuestionCount = onSetQuestionCount,
                onSetTimeLimit = onSetTimeLimit
            )
        }

        // Start Button
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onStartSession,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = uiState.selectedSubject != null,
                colors = ButtonDefaults.buttonColors(
                    containerColor = PrepVerseRed,
                    disabledContainerColor = PrepVerseRed.copy(alpha = 0.3f)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Start Practice",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    subtitle: String? = null
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary,
            fontWeight = FontWeight.SemiBold
        )
        if (subtitle != null) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = ElectricCyan
            )
        }
    }
}

@Composable
private fun SubjectChips(
    subjects: List<String>,
    selectedSubject: String?,
    onSelectSubject: (String) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(subjects) { subject ->
            val isSelected = subject == selectedSubject
            val color = getSubjectColor(subject)

            FilterChip(
                selected = isSelected,
                onClick = { onSelectSubject(subject) },
                label = {
                    Text(
                        text = subject.replaceFirstChar { it.uppercase() },
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                leadingIcon = if (isSelected) {
                    {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                } else null,
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Surface,
                    selectedContainerColor = color.copy(alpha = 0.2f),
                    labelColor = TextSecondary,
                    selectedLabelColor = color,
                    selectedLeadingIconColor = color
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = SurfaceVariant,
                    selectedBorderColor = color,
                    enabled = true,
                    selected = isSelected
                )
            )
        }
    }
}

@Composable
private fun TopicsGrid(
    topics: List<TopicInfo>,
    selectedTopic: TopicInfo?,
    onSelectTopic: (TopicInfo) -> Unit
) {
    if (topics.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No topics available",
                style = MaterialTheme.typography.bodyLarge,
                color = TextMuted
            )
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            topics.chunked(2).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    row.forEach { topic ->
                        TopicCard(
                            topic = topic,
                            isSelected = topic == selectedTopic,
                            onClick = { onSelectTopic(topic) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    // Fill empty space if odd number of topics
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun TopicCard(
    topic: TopicInfo,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val color = getSubjectColor(topic.subject)

    Card(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .then(
                if (isSelected) {
                    Modifier.border(2.dp, color, RoundedCornerShape(16.dp))
                } else {
                    Modifier
                }
            )
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) color.copy(alpha = 0.1f) else Surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(color.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = topic.displayName.first().toString(),
                    style = MaterialTheme.typography.titleMedium,
                    color = color,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = topic.displayName,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                fontWeight = FontWeight.Medium,
                maxLines = 2
            )

            topic.description?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted,
                    maxLines = 2
                )
            }

            if (topic.questionCount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "${topic.questionCount} questions",
                    style = MaterialTheme.typography.labelSmall,
                    color = color
                )
            }
        }
    }
}

@Composable
private fun DifficultySelector(
    selectedDifficulty: String?,
    onSelectDifficulty: (String?) -> Unit
) {
    val difficulties = listOf(
        null to "Adaptive",
        "easy" to "Easy",
        "medium" to "Medium",
        "hard" to "Hard"
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        difficulties.forEach { (difficulty, label) ->
            val isSelected = difficulty == selectedDifficulty
            val color = when (difficulty) {
                "easy" -> EasyColor
                "medium" -> MediumColor
                "hard" -> HardColor
                else -> ElectricCyan
            }

            FilterChip(
                selected = isSelected,
                onClick = { onSelectDifficulty(difficulty) },
                label = {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                modifier = Modifier.weight(1f),
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Surface,
                    selectedContainerColor = color.copy(alpha = 0.2f),
                    labelColor = TextSecondary,
                    selectedLabelColor = color
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = SurfaceVariant,
                    selectedBorderColor = color,
                    enabled = true,
                    selected = isSelected
                )
            )
        }
    }
}

@Composable
private fun SessionConfigCard(
    questionCount: Int,
    timeLimitMinutes: Int?,
    onSetQuestionCount: (Int) -> Unit,
    onSetTimeLimit: (Int?) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Question Count
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Questions",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary
                    )
                    Text(
                        text = questionCount.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        color = ElectricCyan,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Slider(
                    value = questionCount.toFloat(),
                    onValueChange = { onSetQuestionCount(it.toInt()) },
                    valueRange = 5f..30f,
                    steps = 4,
                    colors = SliderDefaults.colors(
                        thumbColor = ElectricCyan,
                        activeTrackColor = ElectricCyan,
                        inactiveTrackColor = SurfaceVariant
                    )
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("5", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    Text("30", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                }
            }

            HorizontalDivider(color = SurfaceVariant)

            // Time Limit
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Time Limit",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary
                    )
                    Text(
                        text = timeLimitMinutes?.let { "${it}min" } ?: "No limit",
                        style = MaterialTheme.typography.titleMedium,
                        color = if (timeLimitMinutes != null) SolarGold else TextMuted,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))

                val timeOptions = listOf(null, 5, 10, 15, 20)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    timeOptions.forEach { time ->
                        val isSelected = time == timeLimitMinutes

                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onSetTimeLimit(time) },
                            color = if (isSelected) SolarGold.copy(alpha = 0.2f) else SurfaceVariant,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = time?.let { "${it}m" } ?: "None",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isSelected) SolarGold else TextSecondary,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.ErrorOutline,
            contentDescription = null,
            tint = Error,
            modifier = Modifier.size(48.dp)
        )
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed)
        ) {
            Text("Retry")
        }
    }
}

private fun getSubjectColor(subject: String): Color {
    return when (subject.lowercase()) {
        "mathematics" -> MathColor
        "physics" -> PhysicsColor
        "chemistry" -> ChemistryColor
        "biology" -> BiologyColor
        else -> CosmicBlue
    }
}
