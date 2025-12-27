package com.prepverse.prepverse.ui.screens.focus

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.R
import com.prepverse.prepverse.domain.model.FocusSession
import com.prepverse.prepverse.domain.model.FocusState
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusModeScreen(
    onNavigateBack: () -> Unit,
    viewModel: FocusModeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Check permissions when screen is resumed
    LaunchedEffect(Unit) {
        viewModel.checkPermissions()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.focus_mode_title),
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.showSettingsDialog() }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = TextSecondary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Void)
            )
        },
        containerColor = Void
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Timer Display
            FocusTimer(
                session = uiState.session,
                settings = uiState.settings
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Session Info
            SessionInfoCard(
                session = uiState.session,
                settings = uiState.settings
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Permission Status Cards
            if (!uiState.isAccessibilityEnabled || !uiState.isDndAccessGranted) {
                PermissionStatusCard(
                    isAccessibilityEnabled = uiState.isAccessibilityEnabled,
                    isDndAccessGranted = uiState.isDndAccessGranted,
                    onOpenAccessibilitySettings = { viewModel.openAccessibilitySettings() },
                    onOpenDndSettings = { viewModel.openDndSettings() }
                )

                Spacer(modifier = Modifier.height(24.dp))
            }

            // Stats Card
            StatsCard(
                totalSessions = uiState.totalSessions,
                totalMinutes = uiState.totalMinutes
            )

            Spacer(modifier = Modifier.weight(1f))

            // Controls
            FocusControls(
                session = uiState.session,
                onStartClick = { viewModel.showWarningDialog() },
                onPauseClick = { viewModel.pauseSession() },
                onResumeClick = { viewModel.resumeSession() },
                onEndClick = { viewModel.endSession() }
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // Dialogs
    if (uiState.showWarningDialog) {
        FocusWarningDialog(
            onConfirm = { viewModel.startFocusSession() },
            onDismiss = { viewModel.dismissWarningDialog() }
        )
    }

    if (uiState.showSettingsDialog) {
        FocusSettingsDialog(
            settings = uiState.settings,
            onFocusDurationChange = { viewModel.updateFocusDuration(it) },
            onBreakDurationChange = { viewModel.updateBreakDuration(it) },
            onDndChange = { viewModel.updateDndEnabled(it) },
            onDismiss = { viewModel.dismissSettingsDialog() }
        )
    }

    if (uiState.showBreakDialog) {
        FocusBreakDialog(
            timeRemainingSeconds = uiState.session.timeRemainingSeconds,
            onSkipBreak = { viewModel.skipBreak() }
        )
    }

    if (uiState.showCompletionDialog) {
        FocusCompletionDialog(
            session = uiState.session,
            onDismiss = { viewModel.dismissCompletionDialog() }
        )
    }
}

@Composable
private fun FocusTimer(
    session: FocusSession,
    settings: com.prepverse.prepverse.domain.model.FocusModeSettings
) {
    val totalSeconds = when (session.state) {
        FocusState.FOCUSING -> settings.focusDurationMinutes * 60
        FocusState.BREAK -> settings.breakDurationMinutes * 60
        else -> settings.focusDurationMinutes * 60
    }

    val progress = if (totalSeconds > 0 && session.isActive) {
        session.timeRemainingSeconds.toFloat() / totalSeconds
    } else {
        1f
    }

    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(500),
        label = "progress"
    )

    val timerColor = when (session.state) {
        FocusState.FOCUSING -> PrepVerseRed
        FocusState.BREAK -> NeonGreen
        FocusState.PAUSED -> SolarGold
        else -> ElectricCyan
    }

    val minutes = session.timeRemainingSeconds / 60
    val seconds = session.timeRemainingSeconds % 60
    val timeText = if (session.isActive) {
        String.format("%02d:%02d", minutes, seconds)
    } else {
        String.format("%02d:00", settings.focusDurationMinutes)
    }

    val stateText = when (session.state) {
        FocusState.FOCUSING -> stringResource(R.string.state_focusing)
        FocusState.BREAK -> stringResource(R.string.state_break)
        FocusState.PAUSED -> stringResource(R.string.state_paused)
        else -> stringResource(R.string.state_idle)
    }

    Box(
        modifier = Modifier.size(240.dp),
        contentAlignment = Alignment.Center
    ) {
        // Background circle
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = SurfaceVariant,
                style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        // Progress arc
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawArc(
                brush = Brush.sweepGradient(
                    colors = listOf(timerColor, timerColor.copy(alpha = 0.5f), timerColor)
                ),
                startAngle = -90f,
                sweepAngle = 360f * animatedProgress,
                useCenter = false,
                style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        // Timer text
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = timeText,
                style = MaterialTheme.typography.displayLarge,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 48.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stateText,
                style = MaterialTheme.typography.titleMedium,
                color = timerColor,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun SessionInfoCard(
    session: FocusSession,
    settings: com.prepverse.prepverse.domain.model.FocusModeSettings
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
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "${settings.focusDurationMinutes}",
                    style = MaterialTheme.typography.headlineSmall,
                    color = PrepVerseRed,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Focus (min)",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(40.dp)
                    .background(SurfaceVariant)
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "${settings.breakDurationMinutes}",
                    style = MaterialTheme.typography.headlineSmall,
                    color = NeonGreen,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Break (min)",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun PermissionStatusCard(
    isAccessibilityEnabled: Boolean,
    isDndAccessGranted: Boolean,
    onOpenAccessibilitySettings: () -> Unit,
    onOpenDndSettings: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolarGold.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = SolarGold
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Permissions Required",
                    style = MaterialTheme.typography.titleMedium,
                    color = SolarGold,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (!isAccessibilityEnabled) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Accessibility Service",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    TextButton(onClick = onOpenAccessibilitySettings) {
                        Text("Enable", color = ElectricCyan)
                    }
                }
            }

            if (!isDndAccessGranted) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Do Not Disturb",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    TextButton(onClick = onOpenDndSettings) {
                        Text("Grant", color = ElectricCyan)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsCard(
    totalSessions: Int,
    totalMinutes: Int
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
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$totalSessions",
                    style = MaterialTheme.typography.headlineSmall,
                    color = ElectricCyan,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Total Sessions",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(40.dp)
                    .background(SurfaceVariant)
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                val hours = totalMinutes / 60
                val mins = totalMinutes % 60
                val timeText = if (hours > 0) "${hours}h ${mins}m" else "${mins}m"
                Text(
                    text = timeText,
                    style = MaterialTheme.typography.headlineSmall,
                    color = PlasmaPurple,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Focus Time",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun FocusControls(
    session: FocusSession,
    onStartClick: () -> Unit,
    onPauseClick: () -> Unit,
    onResumeClick: () -> Unit,
    onEndClick: () -> Unit
) {
    when (session.state) {
        FocusState.IDLE, FocusState.COMPLETED, FocusState.TERMINATED -> {
            Button(
                onClick = onStartClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrepVerseRed),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.start_focus),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        FocusState.FOCUSING -> {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onPauseClick,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SolarGold)
                ) {
                    Icon(
                        imageVector = Icons.Default.Pause,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.pause_focus))
                }

                Button(
                    onClick = onEndClick,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Error),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.end_focus))
                }
            }
        }
        FocusState.PAUSED -> {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onResumeClick,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NeonGreen),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.resume_focus), color = Void)
                }

                OutlinedButton(
                    onClick = onEndClick,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Error)
                ) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.end_focus))
                }
            }
        }
        FocusState.BREAK -> {
            // During break, controls are in the break dialog
        }
    }
}
