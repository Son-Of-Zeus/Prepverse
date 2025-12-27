package com.prepverse.prepverse.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = PrepVerseRed,
    onPrimary = TextPrimary,
    primaryContainer = PrepVerseRedDark,
    onPrimaryContainer = TextPrimary,

    secondary = ElectricCyan,
    onSecondary = Void,
    secondaryContainer = CosmicBlue,
    onSecondaryContainer = TextPrimary,

    tertiary = PlasmaPurple,
    onTertiary = Void,
    tertiaryContainer = PlasmaPurple.copy(alpha = 0.3f),
    onTertiaryContainer = TextPrimary,

    background = Void,
    onBackground = TextPrimary,

    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = TextSecondary,

    error = Error,
    onError = TextPrimary,
    errorContainer = Error.copy(alpha = 0.3f),
    onErrorContainer = TextPrimary,

    outline = TextMuted,
    outlineVariant = SurfaceVariant
)

private val LightColorScheme = lightColorScheme(
    primary = PrepVerseRed,
    onPrimary = TextPrimary,
    primaryContainer = PrepVerseRedLight,
    onPrimaryContainer = LightTextPrimary,

    secondary = CosmicBlue,
    onSecondary = TextPrimary,
    secondaryContainer = CosmicBlue.copy(alpha = 0.2f),
    onSecondaryContainer = LightTextPrimary,

    tertiary = PlasmaPurple,
    onTertiary = TextPrimary,
    tertiaryContainer = PlasmaPurple.copy(alpha = 0.2f),
    onTertiaryContainer = LightTextPrimary,

    background = LightBackground,
    onBackground = LightTextPrimary,

    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightBackground,
    onSurfaceVariant = LightTextSecondary,

    error = Error,
    onError = TextPrimary,
    errorContainer = Error.copy(alpha = 0.1f),
    onErrorContainer = Error,

    outline = LightTextSecondary,
    outlineVariant = LightBackground
)

@Composable
fun PrepVerseTheme(
    darkTheme: Boolean = true, // Default to dark theme
    dynamicColor: Boolean = false, // Disable dynamic colors to maintain brand
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Void.toArgb()
            window.navigationBarColor = Void.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
