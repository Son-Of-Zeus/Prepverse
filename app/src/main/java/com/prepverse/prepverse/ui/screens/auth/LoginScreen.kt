package com.prepverse.prepverse.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.prepverse.prepverse.ui.theme.*
import kotlinx.coroutines.delay
import kotlin.random.Random

@Composable
fun LoginScreen(
    uiState: LoginUiState,
    onGoogleSignIn: () -> Unit,
    onNavigateToOnboarding: () -> Unit,
    onNavigateToDashboard: () -> Unit
) {
    val context = LocalContext.current

    // Handle navigation after auth
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            delay(500) // Brief delay for visual feedback
            if (uiState.needsOnboarding) {
                onNavigateToOnboarding()
            } else {
                onNavigateToDashboard()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Void)
    ) {
        // Cosmic Background
        CosmicBackground()

        // Glowing orbs
        GlowingOrbs()

        // Main Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(0.2f))

            // Logo
            AnimatedLogo()

            Spacer(modifier = Modifier.height(24.dp))

            // Title
            Text(
                text = "PrepVerse",
                style = MaterialTheme.typography.displayMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Tagline
            Text(
                text = "Learn. Compete. Connect.",
                style = MaterialTheme.typography.titleMedium,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle
            Text(
                text = "Enter the Verse",
                style = MaterialTheme.typography.bodyLarge,
                color = ElectricCyan,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.weight(0.3f))

            // Google Sign In Button
            GoogleSignInButton(
                onClick = onGoogleSignIn,
                isLoading = uiState.isLoading,
                enabled = !uiState.isLoading
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Privacy note
            Text(
                text = "By signing in, you agree to our Terms and Privacy Policy",
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 32.dp)
            )

            Spacer(modifier = Modifier.weight(0.2f))

            // Subject badges
            SubjectBadges()

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Error Snackbar
        AnimatedVisibility(
            visible = uiState.error != null,
            enter = slideInVertically() + fadeIn(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            uiState.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Error.copy(alpha = 0.9f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = TextPrimary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = error,
                            color = TextPrimary,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CosmicBackground() {
    val infiniteTransition = rememberInfiniteTransition(label = "stars")

    Canvas(modifier = Modifier.fillMaxSize()) {
        // Draw stars
        val random = Random(42)
        repeat(100) {
            val x = random.nextFloat() * size.width
            val y = random.nextFloat() * size.height
            val radius = random.nextFloat() * 2f + 0.5f
            val alpha = random.nextFloat() * 0.5f + 0.3f

            drawCircle(
                color = Color.White.copy(alpha = alpha),
                radius = radius,
                center = Offset(x, y)
            )
        }
    }
}

@Composable
private fun GlowingOrbs() {
    val infiniteTransition = rememberInfiniteTransition(label = "orbs")

    val offset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 30f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orb1"
    )

    val offset2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -20f,
        animationSpec = infiniteRepeatable(
            animation = tween(5000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orb2"
    )

    // Red orb (top right)
    Box(
        modifier = Modifier
            .offset(x = 250.dp + offset1.dp, y = 100.dp)
            .size(200.dp)
            .blur(80.dp)
            .alpha(0.4f)
            .background(
                Brush.radialGradient(
                    colors = listOf(PrepVerseRed, Color.Transparent)
                ),
                shape = CircleShape
            )
    )

    // Purple orb (bottom left)
    Box(
        modifier = Modifier
            .offset(x = (-50).dp + offset2.dp, y = 500.dp)
            .size(180.dp)
            .blur(70.dp)
            .alpha(0.3f)
            .background(
                Brush.radialGradient(
                    colors = listOf(PlasmaPurple, Color.Transparent)
                ),
                shape = CircleShape
            )
    )

    // Cyan orb (center right)
    Box(
        modifier = Modifier
            .offset(x = 300.dp, y = 400.dp + offset1.dp)
            .size(120.dp)
            .blur(60.dp)
            .alpha(0.25f)
            .background(
                Brush.radialGradient(
                    colors = listOf(ElectricCyan, Color.Transparent)
                ),
                shape = CircleShape
            )
    )
}

@Composable
private fun AnimatedLogo() {
    val infiniteTransition = rememberInfiniteTransition(label = "logo")

    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    Box(contentAlignment = Alignment.Center) {
        // Glow behind logo
        Box(
            modifier = Modifier
                .size(100.dp)
                .blur(30.dp)
                .alpha(glowAlpha)
                .background(
                    Brush.radialGradient(
                        colors = listOf(PrepVerseRed, Color.Transparent)
                    ),
                    shape = CircleShape
                )
        )

        // Logo container
        Surface(
            modifier = Modifier.size(80.dp),
            shape = RoundedCornerShape(20.dp),
            color = Surface,
            border = ButtonDefaults.outlinedButtonBorder
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Text(
                    text = "P",
                    style = MaterialTheme.typography.displaySmall,
                    color = PrepVerseRed,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun GoogleSignInButton(
    onClick: () -> Unit,
    isLoading: Boolean,
    enabled: Boolean
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .padding(horizontal = 32.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = TextPrimary,
            contentColor = Void,
            disabledContainerColor = TextPrimary.copy(alpha = 0.5f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = Void,
                strokeWidth = 2.dp
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Google icon placeholder (use actual icon in production)
                Surface(
                    modifier = Modifier.size(24.dp),
                    shape = CircleShape,
                    color = Color.White
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "G",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = CosmicBlue
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Text(
                    text = "Continue with Google",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun SubjectBadges() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        SubjectBadge("Math", MathColor)
        Spacer(modifier = Modifier.width(8.dp))
        SubjectBadge("Physics", PhysicsColor)
        Spacer(modifier = Modifier.width(8.dp))
        SubjectBadge("Chemistry", ChemistryColor)
        Spacer(modifier = Modifier.width(8.dp))
        SubjectBadge("Biology", BiologyColor)
    }
}

@Composable
private fun SubjectBadge(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.15f),
        border = ButtonDefaults.outlinedButtonBorder.copy(
            brush = Brush.linearGradient(
                colors = listOf(color.copy(alpha = 0.3f), color.copy(alpha = 0.1f))
            )
        )
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
