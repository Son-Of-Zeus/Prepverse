package com.prepverse.prepverse.ui.screens.practice

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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
import com.prepverse.prepverse.data.remote.api.dto.SessionQuestion
import com.prepverse.prepverse.data.remote.api.dto.SubmitAnswerResponse
import com.prepverse.prepverse.ui.theme.*

@Composable
fun QuizScreen(
    viewModel: QuizViewModel = hiltViewModel(),
    onNavigateToResults: (sessionId: String) -> Unit,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var showQuitDialog by remember { mutableStateOf(false) }

    // Handle back press
    BackHandler {
        showQuitDialog = true
    }

    // Navigate to results when session complete
    LaunchedEffect(uiState.isSessionComplete) {
        if (uiState.isSessionComplete) {
            onNavigateToResults(uiState.sessionId)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Void)
    ) {
        when {
            uiState.isLoading && uiState.currentQuestion == null -> {
                LoadingContent()
            }

            uiState.error != null && uiState.currentQuestion == null -> {
                ErrorContent(
                    message = uiState.error!!,
                    onRetry = { viewModel.loadNextQuestion() }
                )
            }

            uiState.currentQuestion != null -> {
                QuizContent(
                    uiState = uiState,
                    onSelectAnswer = viewModel::selectAnswer,
                    onSubmitAnswer = viewModel::submitAnswer,
                    onProceedToNext = viewModel::proceedToNext,
                    onSkipQuestion = viewModel::skipQuestion,
                    onQuit = { showQuitDialog = true }
                )
            }
        }
    }

    // Quit confirmation dialog
    if (showQuitDialog) {
        AlertDialog(
            onDismissRequest = { showQuitDialog = false },
            containerColor = Surface,
            title = {
                Text(
                    text = "Quit Practice?",
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "Your progress will be saved, but the session will be marked as incomplete.",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showQuitDialog = false
                        viewModel.endSession(abandoned = true)
                        onNavigateBack()
                    }
                ) {
                    Text("Quit", color = Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuitDialog = false }) {
                    Text("Continue", color = ElectricCyan)
                }
            }
        )
    }
}

@Composable
private fun LoadingContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(color = PrepVerseRed)
            Text(
                text = "Loading question...",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(32.dp)
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
}

@Composable
private fun QuizContent(
    uiState: QuizUiState,
    onSelectAnswer: (String) -> Unit,
    onSubmitAnswer: () -> Unit,
    onProceedToNext: () -> Unit,
    onSkipQuestion: () -> Unit,
    onQuit: () -> Unit
) {
    val question = uiState.currentQuestion ?: return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header with progress and timer
        QuizHeader(
            currentQuestion = uiState.currentQuestionNumber,
            totalQuestions = uiState.totalQuestions,
            correctAnswers = uiState.correctAnswers,
            wrongAnswers = uiState.wrongAnswers,
            timeRemainingSeconds = uiState.timeRemainingSeconds,
            questionTimeSeconds = uiState.questionTimeSeconds,
            onQuit = onQuit
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Question content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            // Difficulty and topic badge
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                DifficultyBadge(difficulty = question.difficulty)
                TopicBadge(topic = question.topic)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Question text
            Text(
                text = question.question,
                style = MaterialTheme.typography.headlineSmall,
                color = TextPrimary,
                fontWeight = FontWeight.Medium,
                lineHeight = 32.sp
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Answer options
            AnswerOptions(
                options = question.options,
                selectedAnswer = uiState.selectedAnswer,
                correctAnswer = uiState.lastAnswerResult?.correctAnswer,
                showFeedback = uiState.showAnswerFeedback,
                onSelectAnswer = onSelectAnswer
            )

            // Answer feedback
            AnimatedVisibility(
                visible = uiState.showAnswerFeedback && uiState.lastAnswerResult != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                uiState.lastAnswerResult?.let { result ->
                    AnswerFeedback(result = result)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action buttons
        ActionButtons(
            showFeedback = uiState.showAnswerFeedback,
            hasSelectedAnswer = uiState.selectedAnswer != null,
            isSubmitting = uiState.isSubmitting,
            questionsRemaining = uiState.lastAnswerResult?.questionsRemaining,
            onSubmit = onSubmitAnswer,
            onNext = onProceedToNext,
            onSkip = onSkipQuestion
        )
    }
}

@Composable
private fun QuizHeader(
    currentQuestion: Int,
    totalQuestions: Int,
    correctAnswers: Int,
    wrongAnswers: Int,
    timeRemainingSeconds: Int?,
    questionTimeSeconds: Int,
    onQuit: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Question counter
            Text(
                text = "Question $currentQuestion of $totalQuestions",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )

            // Timer or quit button
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Time display
                if (timeRemainingSeconds != null) {
                    TimeDisplay(
                        seconds = timeRemainingSeconds,
                        isWarning = timeRemainingSeconds < 60
                    )
                } else {
                    TimeDisplay(seconds = questionTimeSeconds, isWarning = false)
                }

                IconButton(
                    onClick = onQuit,
                    modifier = Modifier
                        .size(36.dp)
                        .background(Surface, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Quit",
                        tint = TextSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Progress bar
        LinearProgressIndicator(
            progress = { currentQuestion.toFloat() / totalQuestions },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = PrepVerseRed,
            trackColor = SurfaceVariant,
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Score display
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ScoreBadge(
                count = correctAnswers,
                color = Success,
                icon = Icons.Default.Check
            )
            ScoreBadge(
                count = wrongAnswers,
                color = Error,
                icon = Icons.Default.Close
            )
        }
    }
}

@Composable
private fun TimeDisplay(seconds: Int, isWarning: Boolean) {
    val minutes = seconds / 60
    val secs = seconds % 60
    val timeText = "%d:%02d".format(minutes, secs)

    val animatedColor by animateColorAsState(
        targetValue = if (isWarning) Error else TextSecondary,
        label = "timerColor"
    )

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(
                if (isWarning) Error.copy(alpha = 0.1f) else Surface,
                RoundedCornerShape(8.dp)
            )
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Timer,
            contentDescription = null,
            tint = animatedColor,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = timeText,
            style = MaterialTheme.typography.labelLarge,
            color = animatedColor,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun ScoreBadge(count: Int, color: Color, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.labelMedium,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun DifficultyBadge(difficulty: String) {
    val color = when (difficulty.lowercase()) {
        "easy" -> EasyColor
        "medium" -> MediumColor
        "hard" -> HardColor
        else -> TextMuted
    }

    Surface(
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = difficulty.replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun TopicBadge(topic: String) {
    Surface(
        color = SurfaceVariant,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = topic.replace("_", " ").replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun AnswerOptions(
    options: List<String>,
    selectedAnswer: String?,
    correctAnswer: String?,
    showFeedback: Boolean,
    onSelectAnswer: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        options.forEachIndexed { index, option ->
            val letter = ('A' + index).toString()
            val isSelected = option == selectedAnswer
            val isCorrect = option == correctAnswer
            val isWrong = showFeedback && isSelected && !isCorrect

            val backgroundColor = when {
                showFeedback && isCorrect -> Success.copy(alpha = 0.15f)
                isWrong -> Error.copy(alpha = 0.15f)
                isSelected -> ElectricCyan.copy(alpha = 0.15f)
                else -> Surface
            }

            val borderColor = when {
                showFeedback && isCorrect -> Success
                isWrong -> Error
                isSelected -> ElectricCyan
                else -> Color.Transparent
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .then(
                        if (borderColor != Color.Transparent) {
                            Modifier.border(2.dp, borderColor, RoundedCornerShape(12.dp))
                        } else Modifier
                    )
                    .clickable(enabled = !showFeedback) { onSelectAnswer(option) },
                colors = CardDefaults.cardColors(containerColor = backgroundColor),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Letter badge
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                when {
                                    showFeedback && isCorrect -> Success
                                    isWrong -> Error
                                    isSelected -> ElectricCyan
                                    else -> SurfaceVariant
                                },
                                CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (showFeedback && isCorrect) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        } else if (isWrong) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        } else {
                            Text(
                                text = letter,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (isSelected) Void else TextSecondary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Text(
                        text = option,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimary
                    )
                }
            }
        }
    }
}

@Composable
private fun AnswerFeedback(result: SubmitAnswerResponse) {
    Spacer(modifier = Modifier.height(16.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (result.isCorrect) Success.copy(alpha = 0.1f) else Error.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = if (result.isCorrect) Icons.Default.CheckCircle else Icons.Default.Cancel,
                    contentDescription = null,
                    tint = if (result.isCorrect) Success else Error,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (result.isCorrect) "Correct!" else "Incorrect",
                    style = MaterialTheme.typography.titleMedium,
                    color = if (result.isCorrect) Success else Error,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = result.explanation,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                lineHeight = 22.sp
            )

            if (!result.isCorrect) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Correct answer: ${result.correctAnswer}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Success,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun ActionButtons(
    showFeedback: Boolean,
    hasSelectedAnswer: Boolean,
    isSubmitting: Boolean,
    questionsRemaining: Int?,
    onSubmit: () -> Unit,
    onNext: () -> Unit,
    onSkip: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (showFeedback) {
            // Next question button
            Button(
                onClick = onNext,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = if (questionsRemaining == 0) "See Results" else "Next Question",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = null
                )
            }
        } else {
            // Skip button
            OutlinedButton(
                onClick = onSkip,
                modifier = Modifier
                    .weight(0.4f)
                    .height(56.dp),
                enabled = !isSubmitting,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = TextSecondary
                )
            ) {
                Text(
                    text = "Skip",
                    style = MaterialTheme.typography.titleMedium
                )
            }

            // Submit button
            Button(
                onClick = onSubmit,
                modifier = Modifier
                    .weight(0.6f)
                    .height(56.dp),
                enabled = hasSelectedAnswer && !isSubmitting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = ElectricCyan,
                    disabledContainerColor = ElectricCyan.copy(alpha = 0.3f)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Void,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Submit",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Void
                    )
                }
            }
        }
    }
}
