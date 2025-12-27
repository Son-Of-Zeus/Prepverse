package com.prepverse.prepverse.ui.screens.onboarding

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.prepverse.prepverse.R
import com.prepverse.prepverse.services.FocusAccessibilityService
import com.prepverse.prepverse.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Data class for quiz focus protection state
 */
data class QuizFocusState(
    val isActive: Boolean = false,
    val violations: Int = 0,
    val maxViolations: Int = 3,
    val showWarningDialog: Boolean = false,
    val showViolationDialog: Boolean = false,
    val isTerminated: Boolean = false
) {
    val hasReachedMaxViolations: Boolean
        get() = violations >= maxViolations
}

/**
 * Composable that provides focus protection for the quiz.
 * Shows warning dialog before quiz, tracks violations during quiz,
 * and terminates quiz if too many violations occur.
 */
@Composable
fun QuizFocusProtection(
    isQuizActive: Boolean,
    onQuizTerminated: () -> Unit,
    content: @Composable (QuizFocusState, () -> Unit) -> Unit
) {
    val context = LocalContext.current
    var focusState by remember { mutableStateOf(QuizFocusState()) }

    // Register broadcast receiver for violations
    DisposableEffect(isQuizActive) {
        if (isQuizActive && !focusState.isActive) {
            // Show warning dialog when quiz starts
            focusState = focusState.copy(showWarningDialog = true)
        }

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                if (intent?.action == FocusAccessibilityService.ACTION_FOCUS_VIOLATION) {
                    if (focusState.isActive && !focusState.isTerminated) {
                        val newViolations = focusState.violations + 1
                        if (newViolations >= focusState.maxViolations) {
                            focusState = focusState.copy(
                                violations = newViolations,
                                showViolationDialog = true,
                                isTerminated = true
                            )
                        } else {
                            focusState = focusState.copy(
                                violations = newViolations,
                                showViolationDialog = true
                            )
                        }
                    }
                }
            }
        }

        if (isQuizActive) {
            val filter = IntentFilter(FocusAccessibilityService.ACTION_FOCUS_VIOLATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(receiver, filter)
            }
        }

        onDispose {
            if (isQuizActive) {
                try {
                    context.unregisterReceiver(receiver)
                } catch (e: Exception) {
                    // Receiver might not be registered
                }
                FocusAccessibilityService.setQuizModeActive(false)
            }
        }
    }

    // Handle termination
    LaunchedEffect(focusState.isTerminated) {
        if (focusState.isTerminated) {
            delay(3500L)
            onQuizTerminated()
        }
    }

    // Content with callbacks
    content(focusState) {
        // Callback to start protection (called when user confirms warning dialog)
        focusState = focusState.copy(
            isActive = true,
            showWarningDialog = false
        )
        FocusAccessibilityService.setQuizModeActive(true)
    }

    // Warning Dialog
    if (focusState.showWarningDialog) {
        QuizWarningDialog(
            onConfirm = {
                focusState = focusState.copy(
                    isActive = true,
                    showWarningDialog = false
                )
                FocusAccessibilityService.setQuizModeActive(true)
            },
            onDismiss = {
                // Cannot dismiss, must confirm
            }
        )
    }

    // Violation Dialog
    if (focusState.showViolationDialog) {
        QuizViolationDialog(
            violations = focusState.violations,
            maxViolations = focusState.maxViolations,
            isTerminated = focusState.isTerminated,
            onDismiss = {
                if (!focusState.isTerminated) {
                    focusState = focusState.copy(showViolationDialog = false)
                }
            },
            onReturnToDashboard = onQuizTerminated
        )
    }
}

@Composable
private fun QuizWarningDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Shield icon
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(PrepVerseRed.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = PrepVerseRed,
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = stringResource(R.string.secure_exam_mode),
                    style = MaterialTheme.typography.headlineSmall,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = stringResource(R.string.exam_rules_intro),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Rules list
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        QuizRuleItem(number = "01", text = stringResource(R.string.exam_rule_1))
                        Spacer(modifier = Modifier.height(10.dp))
                        QuizRuleItem(number = "02", text = stringResource(R.string.exam_rule_2))
                        Spacer(modifier = Modifier.height(10.dp))
                        QuizRuleItem(number = "03", text = stringResource(R.string.exam_rule_3))
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onConfirm,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = stringResource(R.string.start_assessment),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun QuizRuleItem(number: String, text: String) {
    Row(
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = number,
            style = MaterialTheme.typography.titleMedium,
            color = PrepVerseRed,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.width(32.dp)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = TextPrimary
        )
    }
}

@Composable
private fun QuizViolationDialog(
    violations: Int,
    maxViolations: Int,
    isTerminated: Boolean,
    onDismiss: () -> Unit,
    onReturnToDashboard: () -> Unit
) {
    Dialog(
        onDismissRequest = { if (!isTerminated) onDismiss() },
        properties = DialogProperties(
            dismissOnBackPress = !isTerminated,
            dismissOnClickOutside = !isTerminated,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Void.copy(alpha = 0.95f)),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Icon
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Error.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isTerminated) Icons.Default.Block else Icons.Default.Warning,
                            contentDescription = null,
                            tint = Error,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Text(
                        text = if (isTerminated) {
                            stringResource(R.string.session_terminated)
                        } else {
                            stringResource(R.string.focus_violation)
                        },
                        style = MaterialTheme.typography.headlineSmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (isTerminated) {
                            stringResource(R.string.too_many_violations)
                        } else {
                            stringResource(R.string.violation_detected)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Violation counter
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Error.copy(alpha = 0.1f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.violation_count, violations, maxViolations),
                                style = MaterialTheme.typography.titleMedium,
                                color = Error,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    if (isTerminated) {
                        Text(
                            text = "Returning to Dashboard...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    } else {
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.return_to_focus),
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}
