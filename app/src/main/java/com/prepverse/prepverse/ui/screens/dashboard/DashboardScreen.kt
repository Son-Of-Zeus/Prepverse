package com.prepverse.prepverse.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.MasteryLevel
import com.prepverse.prepverse.domain.model.Subject
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToPractice: () -> Unit,
    onNavigateToFocus: () -> Unit,
    onNavigateToBattle: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Welcome back!",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextSecondary
                        )
                        Text(
                            text = "PrepVerse",
                            style = MaterialTheme.typography.headlineSmall,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Void
                ),
                actions = {
                    IconButton(onClick = { }) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Notifications",
                            tint = TextSecondary
                        )
                    }
                    IconButton(onClick = { }) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Profile",
                            tint = TextSecondary
                        )
                    }
                }
            )
        },
        containerColor = Void
    ) { paddingValues ->
        when (uiState) {
            is DashboardUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ElectricCyan)
                }
            }
            is DashboardUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = uiState.message,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextSecondary
                        )
                        Button(
                            onClick = { viewModel.refresh() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = PrepVerseRed
                            )
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }
            is DashboardUiState.Success -> {
                DashboardContent(
                    data = uiState.data,
                    onNavigateToPractice = onNavigateToPractice,
                    onNavigateToFocus = onNavigateToFocus,
                    onNavigateToBattle = onNavigateToBattle,
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun DashboardContent(
    data: com.prepverse.prepverse.domain.model.DashboardData,
    onNavigateToPractice: () -> Unit,
    onNavigateToFocus: () -> Unit,
    onNavigateToBattle: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Streak and Daily XP Card
        item {
            StreakAndXPCard(
                currentStreak = data.streakInfo.currentStreak,
                totalXP = data.streakInfo.totalXP,
                dailyXP = data.dailyXP
            )
        }

        // Performance Summary
        item {
            Text(
                text = "Performance Summary",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
        }

        item {
            PerformanceSummaryCard(
                overallAccuracy = data.performanceSummary.overallAccuracy,
                totalQuestions = data.performanceSummary.totalQuestions,
                correctAnswers = data.performanceSummary.correctAnswers,
                recentScores = data.performanceSummary.recentScores
            )
        }

        // Quick Actions
        item {
            Text(
                text = "Quick Actions",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Start Practice",
                    icon = Icons.Default.Quiz,
                    color = MathColor,
                    onClick = onNavigateToPractice
                )
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Focus Mode",
                    icon = Icons.Default.Timer,
                    color = PrepVerseRed,
                    onClick = onNavigateToFocus
                )
            }
        }

        item {
            QuickActionCard(
                modifier = Modifier.fillMaxWidth(),
                title = "Join Battle",
                icon = Icons.Default.SportsEsports,
                color = PlasmaPurple,
                onClick = onNavigateToBattle
            )
        }

        // Suggested Topics
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Suggested Topics",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
        }

        items(data.suggestedTopics.size) { index ->
            val topic = data.suggestedTopics[index]
            SuggestedTopicCard(
                subject = topic.subject,
                topic = topic.topic,
                progress = topic.progress,
                accuracy = topic.accuracy,
                masteryLevel = topic.masteryLevel,
                color = getSubjectColor(topic.subject)
            )
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun StreakAndXPCard(
    currentStreak: Int,
    totalXP: Int,
    dailyXP: Int
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(20.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Streak info
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(SolarGold.copy(alpha = 0.15f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = SolarGold,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = "$currentStreak Day Streak",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Keep it up!",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }

            // XP badges
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "+$dailyXP",
                        style = MaterialTheme.typography.titleLarge,
                        color = ElectricCyan,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Today",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$totalXP",
                        style = MaterialTheme.typography.headlineSmall,
                        color = ElectricCyan,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Total XP",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun PerformanceSummaryCard(
    overallAccuracy: Float,
    totalQuestions: Int,
    correctAnswers: Int,
    recentScores: List<com.prepverse.prepverse.domain.model.RecentScore>
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Overall stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatItem(
                    label = "Accuracy",
                    value = "${overallAccuracy.toInt()}%",
                    color = ElectricCyan
                )
                StatItem(
                    label = "Questions",
                    value = "$totalQuestions",
                    color = NeonGreen
                )
                StatItem(
                    label = "Correct",
                    value = "$correctAnswers",
                    color = Success
                )
            }

            Divider(color = SurfaceVariant, thickness = 1.dp)

            // Recent scores
            if (recentScores.isNotEmpty()) {
                Text(
                    text = "Recent Scores",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold
                )

                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    recentScores.take(5).forEach { score ->
                        RecentScoreItem(score = score)
                    }
                }
            } else {
                Text(
                    text = "No recent scores yet. Start practicing!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun StatItem(
    label: String,
    value: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
    }
}

@Composable
private fun RecentScoreItem(
    score: com.prepverse.prepverse.domain.model.RecentScore
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            if (score.subject != null && score.topic != null) {
                Text(
                    text = "${score.subject} - ${score.topic}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                )
            } else {
                Text(
                    text = "Practice Session",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                )
            }
            Text(
                text = score.date,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${score.attempts} questions",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            Text(
                text = "${score.score.toInt()}%",
                style = MaterialTheme.typography.titleMedium,
                color = getScoreColor(score.score),
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun QuickActionCard(
    modifier: Modifier = Modifier,
    title: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(color.copy(alpha = 0.15f), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(32.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun SuggestedTopicCard(
    subject: String,
    topic: String,
    progress: Float,
    accuracy: Float,
    masteryLevel: MasteryLevel,
    color: Color
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Subject indicator
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(color.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = subject.first().toString(),
                    style = MaterialTheme.typography.titleLarge,
                    color = color,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = topic,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Medium
                    )
                    Badge(
                        containerColor = getMasteryColor(masteryLevel).copy(alpha = 0.2f),
                        contentColor = getMasteryColor(masteryLevel)
                    ) {
                        Text(
                            text = masteryLevel.name.lowercase().replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
                Text(
                    text = subject,
                    style = MaterialTheme.typography.bodySmall,
                    color = color
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Progress bar
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp),
                    color = color,
                    trackColor = SurfaceVariant,
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${(progress * 100).toInt()}% Complete",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    Text(
                        text = "${accuracy.toInt()}% Accuracy",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun getSubjectColor(subject: String): Color {
    return when (Subject.fromString(subject)) {
        Subject.MATHEMATICS -> MathColor
        Subject.PHYSICS -> PhysicsColor
        Subject.CHEMISTRY -> ChemistryColor
        Subject.BIOLOGY -> BiologyColor
        null -> TextSecondary
    }
}

@Composable
private fun getScoreColor(score: Float): Color {
    return when {
        score >= 80 -> Success
        score >= 60 -> Warning
        else -> Error
    }
}

@Composable
private fun getMasteryColor(masteryLevel: MasteryLevel): Color {
    return when (masteryLevel) {
        MasteryLevel.BEGINNER -> TextSecondary
        MasteryLevel.LEARNING -> Info
        MasteryLevel.PROFICIENT -> Warning
        MasteryLevel.MASTERED -> Success
    }
}
