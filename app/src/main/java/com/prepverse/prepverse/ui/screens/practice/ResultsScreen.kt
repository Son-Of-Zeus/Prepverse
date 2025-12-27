package com.prepverse.prepverse.ui.screens.practice

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.data.remote.api.dto.QuestionReview
import com.prepverse.prepverse.data.remote.api.dto.SessionSummary
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultsScreen(
    viewModel: ResultsViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToPractice: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Results",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
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
                        onRetry = { viewModel.loadResults() },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.summary != null -> {
                    ResultsContent(
                        uiState = uiState,
                        onSelectTab = viewModel::selectTab,
                        onToggleQuestion = viewModel::toggleQuestionExpanded,
                        onPracticeAgain = onNavigateToPractice,
                        onDone = onNavigateBack
                    )
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

@Composable
private fun ResultsContent(
    uiState: ResultsUiState,
    onSelectTab: (ResultsTab) -> Unit,
    onToggleQuestion: (Int) -> Unit,
    onPracticeAgain: () -> Unit,
    onDone: () -> Unit
) {
    val summary = uiState.summary ?: return

    Column(modifier = Modifier.fillMaxSize()) {
        // Score card
        ScoreCard(summary = summary)

        Spacer(modifier = Modifier.height(16.dp))

        // Tab selector
        TabRow(
            selectedTabIndex = if (uiState.selectedTab == ResultsTab.SUMMARY) 0 else 1,
            containerColor = Surface,
            contentColor = TextPrimary,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    Modifier.tabIndicatorOffset(tabPositions[if (uiState.selectedTab == ResultsTab.SUMMARY) 0 else 1]),
                    color = PrepVerseRed
                )
            }
        ) {
            Tab(
                selected = uiState.selectedTab == ResultsTab.SUMMARY,
                onClick = { onSelectTab(ResultsTab.SUMMARY) },
                text = { Text("Summary") }
            )
            Tab(
                selected = uiState.selectedTab == ResultsTab.REVIEW,
                onClick = { onSelectTab(ResultsTab.REVIEW) },
                text = { Text("Review") }
            )
        }

        // Tab content
        when (uiState.selectedTab) {
            ResultsTab.SUMMARY -> {
                SummaryTab(
                    summary = summary,
                    onPracticeAgain = onPracticeAgain,
                    onDone = onDone
                )
            }
            ResultsTab.REVIEW -> {
                ReviewTab(
                    questions = uiState.questionsReview,
                    expandedIndex = uiState.expandedQuestionIndex,
                    onToggleQuestion = onToggleQuestion
                )
            }
        }
    }
}

@Composable
private fun ScoreCard(summary: SessionSummary) {
    val scoreColor = when {
        summary.scorePercentage >= 80 -> Success
        summary.scorePercentage >= 60 -> SolarGold
        summary.scorePercentage >= 40 -> MediumColor
        else -> Error
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Score circle
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                scoreColor.copy(alpha = 0.3f),
                                scoreColor.copy(alpha = 0.1f)
                            )
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${summary.scorePercentage.toInt()}%",
                        style = MaterialTheme.typography.headlineLarge,
                        color = scoreColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 36.sp
                    )
                    Text(
                        text = "Score",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    value = summary.correctAnswers.toString(),
                    label = "Correct",
                    color = Success
                )
                StatItem(
                    value = summary.wrongAnswers.toString(),
                    label = "Wrong",
                    color = Error
                )
                StatItem(
                    value = summary.skipped.toString(),
                    label = "Skipped",
                    color = TextMuted
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Time stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                TimeStatItem(
                    value = formatTime(summary.totalTimeSeconds),
                    label = "Total Time"
                )
                TimeStatItem(
                    value = "${summary.avgTimePerQuestion.toInt()}s",
                    label = "Avg per Q"
                )
            }
        }
    }
}

@Composable
private fun StatItem(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary
        )
    }
}

@Composable
private fun TimeStatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                tint = ElectricCyan,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                color = ElectricCyan,
                fontWeight = FontWeight.Bold
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary
        )
    }
}

@Composable
private fun SummaryTab(
    summary: SessionSummary,
    onPracticeAgain: () -> Unit,
    onDone: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Difficulty breakdown
        item {
            DifficultyBreakdownCard(summary = summary)
        }

        // Weak/Strong topics
        if (summary.weakTopics.isNotEmpty() || summary.strongTopics.isNotEmpty()) {
            item {
                TopicsAnalysisCard(
                    weakTopics = summary.weakTopics,
                    strongTopics = summary.strongTopics
                )
            }
        }

        // Action buttons
        item {
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDone,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = TextSecondary
                    )
                ) {
                    Text(
                        text = "Done",
                        style = MaterialTheme.typography.titleMedium
                    )
                }

                Button(
                    onClick = onPracticeAgain,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Practice Again",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun DifficultyBreakdownCard(summary: SessionSummary) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Difficulty Breakdown",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )

            if (summary.easyTotal > 0) {
                DifficultyRow(
                    label = "Easy",
                    correct = summary.easyCorrect,
                    total = summary.easyTotal,
                    color = EasyColor
                )
            }

            if (summary.mediumTotal > 0) {
                DifficultyRow(
                    label = "Medium",
                    correct = summary.mediumCorrect,
                    total = summary.mediumTotal,
                    color = MediumColor
                )
            }

            if (summary.hardTotal > 0) {
                DifficultyRow(
                    label = "Hard",
                    correct = summary.hardCorrect,
                    total = summary.hardTotal,
                    color = HardColor
                )
            }
        }
    }
}

@Composable
private fun DifficultyRow(
    label: String,
    correct: Int,
    total: Int,
    color: Color
) {
    val percentage = if (total > 0) correct.toFloat() / total else 0f

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = color,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "$correct / $total",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { percentage },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = color,
            trackColor = SurfaceVariant,
        )
    }
}

@Composable
private fun TopicsAnalysisCard(
    weakTopics: List<String>,
    strongTopics: List<String>
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (strongTopics.isNotEmpty()) {
                TopicSection(
                    title = "Strong Topics",
                    topics = strongTopics,
                    color = Success,
                    icon = Icons.Default.CheckCircle
                )
            }

            if (weakTopics.isNotEmpty()) {
                TopicSection(
                    title = "Needs Practice",
                    topics = weakTopics,
                    color = Warning,
                    icon = Icons.Default.TrendingUp
                )
            }
        }
    }
}

@Composable
private fun TopicSection(
    title: String,
    topics: List<String>,
    color: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        topics.forEach { topic ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                color = color.copy(alpha = 0.1f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = topic.replace("_", " ").replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    }
}

@Composable
private fun ReviewTab(
    questions: List<QuestionReview>,
    expandedIndex: Int?,
    onToggleQuestion: (Int) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        itemsIndexed(questions) { index, question ->
            ReviewQuestionCard(
                question = question,
                index = index,
                isExpanded = expandedIndex == index,
                onToggle = { onToggleQuestion(index) }
            )
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ReviewQuestionCard(
    question: QuestionReview,
    index: Int,
    isExpanded: Boolean,
    onToggle: () -> Unit
) {
    val isCorrect = question.isCorrect == true
    val borderColor = when {
        isCorrect -> Success
        question.userAnswer == null -> TextMuted
        else -> Error
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() },
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(borderColor.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${index + 1}",
                            style = MaterialTheme.typography.labelLarge,
                            color = borderColor,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = when {
                                isCorrect -> "Correct"
                                question.userAnswer == null -> "Skipped"
                                else -> "Incorrect"
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = borderColor,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = question.topic.replace("_", " "),
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                    }
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = TextSecondary
                )
            }

            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    // Question text
                    Text(
                        text = question.question,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextPrimary,
                        lineHeight = 22.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Options
                    question.options.forEachIndexed { optIndex, option ->
                        val isUserAnswer = option == question.userAnswer
                        val isCorrectAnswer = option == question.correctAnswer
                        val letter = ('A' + optIndex).toString()

                        val bgColor = when {
                            isCorrectAnswer -> Success.copy(alpha = 0.1f)
                            isUserAnswer && !isCorrect -> Error.copy(alpha = 0.1f)
                            else -> SurfaceVariant.copy(alpha = 0.5f)
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .background(bgColor, RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "$letter.",
                                style = MaterialTheme.typography.labelMedium,
                                color = when {
                                    isCorrectAnswer -> Success
                                    isUserAnswer && !isCorrect -> Error
                                    else -> TextMuted
                                },
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = option,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            if (isCorrectAnswer) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = Success,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            if (isUserAnswer && !isCorrect) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = null,
                                    tint = Error,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    // Explanation
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = CosmicBlue.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Explanation",
                                style = MaterialTheme.typography.labelMedium,
                                color = CosmicBlue,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = question.explanation,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                                lineHeight = 20.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%d:%02d".format(mins, secs)
}
