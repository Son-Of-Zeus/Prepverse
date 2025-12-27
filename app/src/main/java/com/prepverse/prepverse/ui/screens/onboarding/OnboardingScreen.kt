package com.prepverse.prepverse.ui.screens.onboarding

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.prepverse.prepverse.domain.model.Difficulty
import com.prepverse.prepverse.domain.model.OnboardingQuestion
import com.prepverse.prepverse.ui.theme.*
import kotlin.random.Random

@Composable
fun OnboardingScreen(
    uiState: OnboardingUiState,
    onSelectClass: (Int) -> Unit,
    onStartAssessment: () -> Unit,
    onSelectAnswer: (String) -> Unit,
    onNextQuestion: () -> Unit,
    onFinishOnboarding: () -> Unit
) {
    // Track if quiz is in assessment mode for focus protection
    val isQuizActive = uiState.step == OnboardingStep.ASSESSMENT

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Void)
    ) {
        // Cosmic background
        CosmicBackground()

        when (uiState.step) {
            OnboardingStep.WELCOME -> WelcomeStep(
                onSelectClass = onSelectClass
            )
            OnboardingStep.CLASS_SELECTION -> ClassSelectionStep(
                selectedClass = uiState.selectedClass,
                onSelectClass = onSelectClass,
                onStart = onStartAssessment
            )
            OnboardingStep.ASSESSMENT -> {
                // Wrap assessment in focus protection
                QuizFocusProtection(
                    isQuizActive = true,
                    onQuizTerminated = onFinishOnboarding
                ) { focusState, onStartProtection ->
                    // Only show assessment if focus protection is confirmed
                    if (focusState.isActive || !focusState.showWarningDialog) {
                        AssessmentStep(
                            uiState = uiState,
                            onSelectAnswer = onSelectAnswer,
                            onNextQuestion = onNextQuestion,
                            violations = focusState.violations,
                            maxViolations = focusState.maxViolations
                        )
                    }
                }
            }
            OnboardingStep.RESULTS -> ResultsStep(
                uiState = uiState,
                onFinish = onFinishOnboarding
            )
        }

        // Loading overlay
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Void.copy(alpha = 0.8f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PrepVerseRed)
            }
        }
    }
}

@Composable
private fun CosmicBackground() {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val random = Random(42)
        repeat(80) {
            val x = random.nextFloat() * size.width
            val y = random.nextFloat() * size.height
            val radius = random.nextFloat() * 2f + 0.5f
            val alpha = random.nextFloat() * 0.5f + 0.2f

            drawCircle(
                color = Color.White.copy(alpha = alpha),
                radius = radius,
                center = Offset(x, y)
            )
        }
    }
}

@Composable
private fun WelcomeStep(onSelectClass: (Int) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome to PrepVerse!",
            style = MaterialTheme.typography.headlineLarge,
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Let's personalize your learning experience with a quick assessment",
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(48.dp))

        Text(
            text = "Select Your Class",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary
        )

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ClassCard(
                classNumber = 10,
                isSelected = false,
                onClick = { onSelectClass(10) }
            )
            ClassCard(
                classNumber = 12,
                isSelected = false,
                onClick = { onSelectClass(12) }
            )
        }
    }
}

@Composable
private fun ClassSelectionStep(
    selectedClass: Int?,
    onSelectClass: (Int) -> Unit,
    onStart: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Select Your Class",
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "CBSE Curriculum",
            style = MaterialTheme.typography.bodyMedium,
            color = TextMuted
        )

        Spacer(modifier = Modifier.height(48.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ClassCard(
                classNumber = 10,
                isSelected = selectedClass == 10,
                onClick = { onSelectClass(10) }
            )
            ClassCard(
                classNumber = 12,
                isSelected = selectedClass == 12,
                onClick = { onSelectClass(12) }
            )
        }

        Spacer(modifier = Modifier.height(48.dp))

        Button(
            onClick = onStart,
            enabled = selectedClass != null,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 32.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = PrepVerseRed,
                disabledContainerColor = PrepVerseRed.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text(
                text = "Start Assessment",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "10 questions • ~10 minutes",
            style = MaterialTheme.typography.bodySmall,
            color = TextMuted
        )
    }
}

@Composable
private fun ClassCard(
    classNumber: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "scale"
    )

    val accentColor = if (classNumber == 10) CosmicBlue else PlasmaPurple

    Card(
        modifier = Modifier
            .size(140.dp)
            .scale(scale)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) accentColor.copy(alpha = 0.2f) else Surface
        ),
        shape = RoundedCornerShape(20.dp),
        border = if (isSelected) {
            ButtonDefaults.outlinedButtonBorder.copy(
                brush = Brush.linearGradient(listOf(accentColor, accentColor.copy(alpha = 0.5f)))
            )
        } else null
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = classNumber.toString(),
                    style = MaterialTheme.typography.displayMedium,
                    color = if (isSelected) accentColor else TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Class",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }

            if (isSelected) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                        .size(24.dp)
                        .background(accentColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = Void,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun AssessmentStep(
    uiState: OnboardingUiState,
    onSelectAnswer: (String) -> Unit,
    onNextQuestion: () -> Unit,
    violations: Int = 0,
    maxViolations: Int = 3
) {
    val currentQuestion = uiState.questions.getOrNull(uiState.currentQuestionIndex)
        ?: return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        // Header with timer, progress, and violations
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Question counter
            Text(
                text = "Question ${uiState.currentQuestionIndex + 1} of ${uiState.questions.size}",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Violations indicator (only show if there are violations)
                if (violations > 0) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .background(
                                Error.copy(alpha = 0.1f),
                                RoundedCornerShape(20.dp)
                            )
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "$violations/$maxViolations",
                            style = MaterialTheme.typography.labelMedium,
                            color = Error,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Timer
                AssessmentTimer(timeSeconds = uiState.timeRemainingSeconds)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Progress bar
        ProgressIndicator(
            current = uiState.currentQuestionIndex + 1,
            total = uiState.questions.size
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Subject/Topic badge
        Row {
            SubjectBadge(text = currentQuestion.subject.replaceFirstChar { it.uppercase() })
            Spacer(modifier = Modifier.width(8.dp))
            TopicBadge(text = currentQuestion.topic.replace("_", " ").replaceFirstChar { it.uppercase() })
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Question
        Text(
            text = currentQuestion.question,
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Options
        val optionLabels = listOf("A", "B", "C", "D")
        currentQuestion.options.forEachIndexed { index, option ->
            OptionCard(
                label = optionLabels[index],
                text = option,
                isSelected = uiState.selectedAnswer == option,
                onClick = { onSelectAnswer(option) }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        // Next button
        Button(
            onClick = onNextQuestion,
            enabled = uiState.selectedAnswer != null,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = PrepVerseRed,
                disabledContainerColor = PrepVerseRed.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text(
                text = if (uiState.currentQuestionIndex < uiState.questions.size - 1) "Next" else "Finish",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun AssessmentTimer(timeSeconds: Int) {
    val minutes = timeSeconds / 60
    val seconds = timeSeconds % 60

    val warningColor = when {
        timeSeconds <= 30 -> Error
        timeSeconds <= 60 -> SolarGold
        else -> ElectricCyan
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(
                warningColor.copy(alpha = 0.1f),
                RoundedCornerShape(20.dp)
            )
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = String.format("%02d:%02d", minutes, seconds),
            style = MaterialTheme.typography.titleMedium,
            color = warningColor,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun ProgressIndicator(current: Int, total: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        repeat(total) { index ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        when {
                            index < current - 1 -> NeonGreen
                            index == current - 1 -> PrepVerseRed
                            else -> SurfaceVariant
                        }
                    )
            )
        }
    }
}

@Composable
private fun SubjectBadge(text: String) {
    val color = when (text.lowercase()) {
        "mathematics" -> MathColor
        "physics" -> PhysicsColor
        "chemistry" -> ChemistryColor
        "biology" -> BiologyColor
        else -> CosmicBlue
    }

    Surface(
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = color
        )
    }
}

@Composable
private fun TopicBadge(text: String) {
    Surface(
        color = SurfaceVariant,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = TextSecondary
        )
    }
}

@Composable
private fun OptionCard(
    label: String,
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) ElectricCyan else SurfaceVariant,
        animationSpec = tween(200),
        label = "border"
    )

    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) ElectricCyan.copy(alpha = 0.1f) else Surface,
        animationSpec = tween(200),
        label = "bg"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = RoundedCornerShape(16.dp),
        border = ButtonDefaults.outlinedButtonBorder.copy(
            brush = Brush.linearGradient(listOf(borderColor, borderColor.copy(alpha = 0.5f)))
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Option label (A, B, C, D)
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(
                        if (isSelected) ElectricCyan else SurfaceVariant,
                        RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isSelected) Void else TextSecondary,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Text(
                text = text,
                style = MaterialTheme.typography.bodyLarge,
                color = TextPrimary
            )
        }
    }
}

@Composable
private fun ResultsStep(
    uiState: OnboardingUiState,
    onFinish: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Assessment Complete!",
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Score circle
        ScoreCircle(score = uiState.score, total = uiState.questions.size)

        Spacer(modifier = Modifier.height(32.dp))

        // XP earned
        Row(
            modifier = Modifier
                .background(SolarGold.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = null,
                tint = SolarGold,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "+100 XP",
                style = MaterialTheme.typography.titleMedium,
                color = SolarGold,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Strengths
        if (uiState.strengths.isNotEmpty()) {
            ResultCard(
                title = "Your Strengths",
                items = uiState.strengths,
                color = NeonGreen
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Weaknesses
        if (uiState.weaknesses.isNotEmpty()) {
            ResultCard(
                title = "Areas to Improve",
                items = uiState.weaknesses,
                color = SolarGold
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onFinish,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text(
                text = "Go to Dashboard",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ScoreCircle(score: Int, total: Int) {
    val percentage = score.toFloat() / total

    val animatedPercentage by animateFloatAsState(
        targetValue = percentage,
        animationSpec = tween(1500, easing = FastOutSlowInEasing),
        label = "score"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(160.dp)
    ) {
        // Background circle
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = SurfaceVariant,
                style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        // Progress arc
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawArc(
                brush = Brush.sweepGradient(
                    colors = listOf(PrepVerseRed, ElectricCyan, NeonGreen)
                ),
                startAngle = -90f,
                sweepAngle = 360f * animatedPercentage,
                useCenter = false,
                style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$score/$total",
                style = MaterialTheme.typography.displaySmall,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "${(percentage * 100).toInt()}%",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun ResultCard(
    title: String,
    items: List<String>,
    color: Color
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = color,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            items.forEach { item ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(color, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = item.replace("_", " ").replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextPrimary
                    )
                }
            }
        }
    }
}
