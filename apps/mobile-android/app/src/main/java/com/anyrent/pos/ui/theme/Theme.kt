package com.anyrent.pos.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BrandPrimary = Color(0xFF0B6E4F)
private val BrandOnPrimary = Color(0xFFFFFFFF)
private val Surface = Color(0xFFF7F9F8)
private val OnSurface = Color(0xFF12241C)

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = BrandOnPrimary,
    secondary = Color(0xFF1B8F6A),
    background = Surface,
    surface = Color.White,
    onBackground = OnSurface,
    onSurface = OnSurface,
    error = Color(0xFFB3261E),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF5DDBB0),
    onPrimary = Color(0xFF003828),
    background = Color(0xFF0E1612),
    surface = Color(0xFF15201A),
    onBackground = Color(0xFFE6F2EC),
    onSurface = Color(0xFFE6F2EC),
)

@Composable
fun AnyRentTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
