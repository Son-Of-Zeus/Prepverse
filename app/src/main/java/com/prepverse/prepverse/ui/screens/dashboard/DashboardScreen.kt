package com.prepverse.prepverse.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToPractice: () -> Unit,
    onNavigateToPracticeWithTopic: (subject: String, topic: String) -> Unit,
    onNavigateToFocus: () -> Unit,
    onNavigateToProgress: () -> Unit,
    onNavigateToPeer: () -> Unit,
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
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ElectricCyan)
                }
            }
            uiState.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudOff,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = "Couldn't load dashboard",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = uiState.error ?: "Unknown error",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Button(
                            onClick = { viewModel.refresh() },
                            colors = ButtonDefaults.buttonColors(containerColor = ElectricCyan)
                        ) {
                            Text("Retry", color = Void)
                        }
                    }
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Streak Card with real data
                    item {
                        StreakCard(
                            currentStreak = uiState.currentStreak,
                            totalXP = uiState.totalXP
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
                                title = "Practice",
                                icon = Icons.Default.Quiz,
                                color = MathColor,
                                onClick = onNavigateToPractice
                            )
                            QuickActionCard(
                                modifier = Modifier.weight(1f),
                                title = "Focus",
                                icon = Icons.Default.Timer,
                                color = PrepVerseRed,
                                onClick = onNavigateToFocus
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            QuickActionCard(
                                modifier = Modifier.weight(1f),
                                title = "Progress",
                                icon = Icons.Default.TrendingUp,
                                color = NeonGreen,
                                onClick = onNavigateToProgress
                            )
                            QuickActionCard(
                                modifier = Modifier.weight(1f),
                                title = "Study Room",
                                icon = Icons.Default.Groups,
                                color = PlasmaPurple,
                                onClick = onNavigateToPeer
                            )
                        }
                    }

                    // Continue Learning - Recently practiced topics
                    if (uiState.continueLearning.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Continue Learning",
                                style = MaterialTheme.typography.titleLarge,
                                color = TextPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        items(uiState.continueLearning) { topic ->
                            SuggestedTopicCard(
                                subject = topic.subject,
                                topicId = topic.topic,
                                topicName = topic.displayName,
                                progress = topic.progress,
                                color = getSubjectColor(topic.subject),
                                onClick = { onNavigateToPracticeWithTopic(topic.subject, topic.topic) }
                            )
                        }
                    }

                    // Suggested Topics - Topics user is weak on
                    if (uiState.suggestedTopics.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Suggested Topics",
                                style = MaterialTheme.typography.titleLarge,
                                color = TextPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Topics you need more practice on",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }

                        items(uiState.suggestedTopics) { topic ->
                            SuggestedTopicCard(
                                subject = topic.subject,
                                topicId = topic.topic,
                                topicName = topic.displayName,
                                progress = topic.progress,
                                color = getSubjectColor(topic.subject),
                                onClick = { onNavigateToPracticeWithTopic(topic.subject, topic.topic) }
                            )
                        }
                    }

                    // Show empty state for new users (no recent topics and no suggested)
                    if (uiState.continueLearning.isEmpty() && uiState.suggestedTopics.isEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Get Started",
                                style = MaterialTheme.typography.titleLarge,
                                color = TextPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.School,
                                        contentDescription = null,
                                        tint = ElectricCyan,
                                        modifier = Modifier.size(48.dp)
                                    )
                                    Text(
                                        text = "Start your first practice session!",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = TextPrimary,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = "Complete practice sessions to track your progress and get personalized recommendations.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextSecondary,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    }

                    // SWOT Analysis Section
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "SWOT Analysis",
                            style = MaterialTheme.typography.titleLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Select a subject to analyze your performance",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }

                    // Subject Tabs
                    item {
                        SubjectTabs(
                            subjects = uiState.availableSubjects,
                            selectedSubject = uiState.selectedSubject,
                            onSubjectSelected = { viewModel.selectSubject(it) }
                        )
                    }

                    // SWOT Analysis Content
                    item {
                        SWOTAnalysisSection(
                            swotData = viewModel.generateSWOTAnalysis(),
                            isLoading = uiState.isLoadingConcepts,
                            hasSelectedSubject = uiState.selectedSubject != null
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SubjectTabs(
    subjects: List<String>,
    selectedSubject: String?,
    onSubjectSelected: (String?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        subjects.forEach { subject ->
            val isSelected = selectedSubject == subject
            val subjectColor = getSubjectColor(subject)

            FilterChip(
                selected = isSelected,
                onClick = {
                    onSubjectSelected(if (isSelected) null else subject)
                },
                label = {
                    Text(
                        text = subject,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Surface,
                    labelColor = TextSecondary,
                    selectedContainerColor = subjectColor.copy(alpha = 0.2f),
                    selectedLabelColor = subjectColor
                ),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = isSelected,
                    borderColor = SurfaceVariant,
                    selectedBorderColor = subjectColor
                )
            )
        }
    }
}

@Composable
private fun SWOTAnalysisSection(
    swotData: SWOTAnalysisData?,
    isLoading: Boolean,
    hasSelectedSubject: Boolean
) {
    when {
        isLoading -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = ElectricCyan,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
        !hasSelectedSubject -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.GridView,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "Select a Subject",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Choose a subject above to generate your SWOT matrix.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
        swotData == null -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "No Data Available",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Complete practice sessions in this subject to generate analysis.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
        else -> {
            // 2x2 SWOT Grid
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SWOTCard(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        title = "Strengths",
                        type = SWOTType.STRENGTH,
                        insights = swotData.strengths
                    )
                    SWOTCard(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        title = "Weaknesses",
                        type = SWOTType.WEAKNESS,
                        insights = swotData.weaknesses
                    )
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SWOTCard(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        title = "Opportunities",
                        type = SWOTType.OPPORTUNITY,
                        insights = swotData.opportunities
                    )
                    SWOTCard(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        title = "Threats",
                        type = SWOTType.THREAT,
                        insights = swotData.threats
                    )
                }
            }
        }
    }
}

private enum class SWOTType {
    STRENGTH, WEAKNESS, OPPORTUNITY, THREAT
}

@Composable
private fun SWOTCard(
    modifier: Modifier = Modifier,
    title: String,
    type: SWOTType,
    insights: List<SWOTInsight>
) {
    val (iconColor, bgColor, icon) = when (type) {
        SWOTType.STRENGTH -> Triple(NeonGreen, NeonGreen.copy(alpha = 0.1f), Icons.Default.FlashOn)
        SWOTType.WEAKNESS -> Triple(PrepVerseRed, PrepVerseRed.copy(alpha = 0.1f), Icons.Default.Warning)
        SWOTType.OPPORTUNITY -> Triple(ElectricCyan, ElectricCyan.copy(alpha = 0.1f), Icons.Default.TrendingUp)
        SWOTType.THREAT -> Triple(SolarGold, SolarGold.copy(alpha = 0.1f), Icons.Default.Error)
    }

    Card(
        modifier = modifier
            .defaultMinSize(minHeight = 140.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(iconColor, RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (type == SWOTType.WEAKNESS) TextPrimary else Void,
                        modifier = Modifier.size(16.dp)
                    )
                }
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    color = iconColor,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Insights
            Column(
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                insights.take(2).forEach { insight ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .offset(y = 5.dp)
                                .background(iconColor, CircleShape)
                        )
                        Column {
                            Text(
                                text = insight.label,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextPrimary,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1
                            )
                            Text(
                                text = insight.description,
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary,
                                maxLines = 2
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun getSubjectColor(subject: String): Color {
    return when (subject.lowercase()) {
        "mathematics", "math" -> MathColor
        "physics" -> PhysicsColor
        "chemistry" -> ChemistryColor
        "biology" -> BiologyColor
        else -> ElectricCyan
    }
}

@Composable
private fun StreakCard(currentStreak: Int, totalXP: Int) {
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
                        .size(48.dp)
                        .background(SolarGold.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = SolarGold,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = "$currentStreak Day Streak",
                        style = MaterialTheme.typography.titleMedium,
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

            // XP badge
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
    topicId: String,
    topicName: String,
    progress: Float,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
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
                Text(
                    text = topicName,
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                )
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
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Progress percentage and arrow icon
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${(progress * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Go to practice",
                    tint = TextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
