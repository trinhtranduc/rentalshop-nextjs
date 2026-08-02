package com.anyrent.pos.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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

private fun TextStyle.withInter(
    fontSize: androidx.compose.ui.unit.TextUnit? = null,
    lineHeight: androidx.compose.ui.unit.TextUnit? = null,
    fontWeight: FontWeight? = null,
): TextStyle = copy(
    fontFamily = InterFontFamily,
    fontSize = fontSize ?: this.fontSize,
    lineHeight = lineHeight ?: this.lineHeight,
    fontWeight = fontWeight ?: this.fontWeight,
)

/**
 * Typography: Inter (same as iOS POS) + size/weight roles aligned to `Utils.*Font`.
 *
 * Why Inter over default Roboto: brand parity with iOS, more modern geometric sans,
 * better match for bilingual EN/VI UI.
 *
 * | Role            | iOS                         | Token          |
 * |-----------------|-----------------------------|----------------|
 * | Nav / sheet     | Bold 20                     | titleLarge     |
 * | Section title   | Medium 16                   | titleMedium    |
 * | Body / field    | Regular 16                  | bodyLarge      |
 * | Field label     | Medium 14                   | bodyMedium     |
 * | Meta / phone    | Regular 13–14               | bodySmall / bodyMedium |
 * | Hint / error    | Regular 12                  | labelSmall     |
 * | Primary CTA     | Bold 18                     | labelLarge     |
 */
private val base = Typography()
private val AppTypography = Typography(
    displayLarge = base.displayLarge.withInter(),
    displayMedium = base.displayMedium.withInter(),
    displaySmall = base.displaySmall.withInter(),
    headlineLarge = base.headlineLarge.withInter(
        fontSize = 28.sp,
        lineHeight = 34.sp,
        fontWeight = FontWeight.ExtraBold,
    ),
    headlineMedium = base.headlineMedium.withInter(
        fontSize = 22.sp,
        lineHeight = 28.sp,
        fontWeight = FontWeight.Bold,
    ),
    headlineSmall = base.headlineSmall.withInter(
        fontSize = 20.sp,
        lineHeight = 26.sp,
        fontWeight = FontWeight.Bold,
    ),
    // iOS setupCustomNavigationBar title — Bold 20
    titleLarge = base.titleLarge.withInter(
        fontSize = 20.sp,
        lineHeight = 26.sp,
        fontWeight = FontWeight.Bold,
    ),
    // iOS section titles — Medium 16
    titleMedium = base.titleMedium.withInter(
        fontSize = 16.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.Medium,
    ),
    // iOS customer cell name — Medium 15
    titleSmall = base.titleSmall.withInter(
        fontSize = 15.sp,
        lineHeight = 20.sp,
        fontWeight = FontWeight.Medium,
    ),
    // iOS RCPrimaryButton — Bold 18
    labelLarge = base.labelLarge.withInter(
        fontSize = 18.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.Bold,
    ),
    labelMedium = base.labelMedium.withInter(
        fontSize = 14.sp,
        lineHeight = 18.sp,
        fontWeight = FontWeight.Medium,
    ),
    labelSmall = base.labelSmall.withInter(
        fontSize = 12.sp,
        lineHeight = 16.sp,
        fontWeight = FontWeight.Medium,
    ),
    // iOS field value / list primary — Regular 16
    bodyLarge = base.bodyLarge.withInter(
        fontSize = 16.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.Normal,
    ),
    bodyMedium = base.bodyMedium.withInter(
        fontSize = 14.sp,
        lineHeight = 20.sp,
        fontWeight = FontWeight.Normal,
    ),
    bodySmall = base.bodySmall.withInter(
        fontSize = 13.sp,
        lineHeight = 18.sp,
        fontWeight = FontWeight.Normal,
    ),
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
