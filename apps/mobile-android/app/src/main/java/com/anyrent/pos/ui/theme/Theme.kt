package com.anyrent.pos.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape

val BrandPrimary = Color(0xFF2454F4)
private val BrandOnPrimary = Color(0xFFFFFFFF)
val AppBackground = Color(0xFFF6F6F7)
val AppSurface = Color(0xFFFFFFFF)
val AppMuted = Color(0xFF72757B)
private val OnSurface = Color(0xFF1C1C1E)

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = BrandOnPrimary,
    secondary = Color(0xFF5269B6),
    background = AppBackground,
    surface = AppSurface,
    surfaceVariant = Color(0xFFEFF1F5),
    onSurfaceVariant = Color(0xFF666A73),
    onBackground = OnSurface,
    onSurface = OnSurface,
    outline = Color(0xFFD9DCE2),
    outlineVariant = Color(0xFFE7E8EC),
    error = Color(0xFFE33D45),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9AAEFF),
    onPrimary = Color(0xFF00175C),
    background = Color(0xFF111216),
    surface = Color(0xFF1B1C21),
    surfaceVariant = Color(0xFF292B32),
    onBackground = Color(0xFFF2F2F5),
    onSurface = Color(0xFFF2F2F5),
    onSurfaceVariant = Color(0xFFB9BBC3),
    outline = Color(0xFF44464F),
    error = Color(0xFFFFB3B6),
)

private val AppTypography = Typography(
    headlineMedium = Typography().headlineMedium.copy(
        fontSize = 28.sp,
        lineHeight = 34.sp,
        fontWeight = FontWeight.Bold,
    ),
    headlineSmall = Typography().headlineSmall.copy(
        fontSize = 24.sp,
        lineHeight = 30.sp,
        fontWeight = FontWeight.Bold,
    ),
    titleLarge = Typography().titleLarge.copy(
        fontSize = 20.sp,
        lineHeight = 26.sp,
        fontWeight = FontWeight.SemiBold,
    ),
    titleMedium = Typography().titleMedium.copy(
        fontSize = 16.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.SemiBold,
    ),
    bodyLarge = Typography().bodyLarge.copy(fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = Typography().bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
)

private val AppShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
)

@Composable
fun AnyRentTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}
