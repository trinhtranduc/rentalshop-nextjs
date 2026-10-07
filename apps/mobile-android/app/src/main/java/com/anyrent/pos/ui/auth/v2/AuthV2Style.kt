package com.anyrent.pos.ui.auth.v2

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.theme.DS

/**
 * #386, restyled in #466 — the one place for the look of the pre-login screens (login, create store 1/2 and 2/2,
 * forgot, sent, onboarding v2): style 4A — white page, a light dot grid fading out over the top, the AnyRent brand
 * mark, no cards, no motion. A restyle only touches this file.
 */
object AuthV2Style {
    // Page
    val PageBackground = Color.White
    val MaxWidth = 480.dp
    val SideInset = 24.dp

    // Text
    val Text = DS.Colors.Text
    val TextMuted = DS.Colors.TextMuted
    val TermsText = Color(0xFF334155)
    val Error = Color(0xFFB91C1C)
    val HeadingLetterSpacing = (-0.02).em
    val SubtitleSize = 16.sp
    val TitleSize = 28
    val Wordmark = Color(0xFF1E3A8A)

    // Controls
    val Primary = DS.Colors.Primary
    val OnPrimary = Color.White
    val FieldBackground = Color.White
    val FieldBorder = Color(0xFFCBD5E1)
    val FieldIcon = Color(0xFF64748B)
    val FocusRing = Color(0xFFDBEAFE)
    val FieldHeight = 52.dp
    val FieldRadius = 12.dp
    val ButtonHeight = 54.dp
    val ButtonRadius = 14.dp
    val ChipOn = DS.Colors.Primary
    val ChipOnText = Color.White
    val ChipOff = Color.White
    val ChipOffText = DS.Colors.Text
    val ChipBorder = Color(0xFFCBD5E1)
    val ProgressTrack = Color(0xFFDBEAFE)
    val MailTile = Color(0xFFEFF6FF)

    // Dot grid (top of every pre-login screen)
    val Dot = Color(0xFFE2E8F0)
    val DotGridHeight = 420.dp
    val DotSpacing = 18.dp
    val DotRadius = 1.dp

    /** Height of the top bar (12 top + 44) */
    val HeaderHeight = 56.dp
}

/** Opacity of the dot grid at [fraction] of its height: opaque to 30 %, then a linear fade to 0 (CSS mask 4A) */
internal fun dotGridAlpha(fraction: Float): Float =
    if (fraction <= .3f) 1f else (1f - (fraction - .3f) / .7f).coerceIn(0f, 1f)

/** Light dot grid over the top 420dp of the page, fading out toward its bottom. Decorative, behind everything. */
@Composable
fun AuthDotGrid(modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(AuthV2Style.DotGridHeight).clearAndSetSemantics { }) {
        val step = AuthV2Style.DotSpacing.toPx()
        val radius = AuthV2Style.DotRadius.toPx()
        var y = step / 2
        while (y < size.height) {
            val alpha = dotGridAlpha(y / size.height)
            var x = step / 2
            while (x < size.width) {
                drawCircle(AuthV2Style.Dot, radius, Offset(x, y), alpha = alpha)
                x += step
            }
            y += step
        }
    }
}

/** The AnyRent mark as a rounded tile */
@Composable
private fun BrandMark(size: Dp, radius: Dp, shadow: Boolean) {
    val shape = RoundedCornerShape(radius)
    Image(
        painter = painterResource(R.drawable.anyrent_logo),
        contentDescription = null,
        modifier = Modifier
            .size(size)
            .then(
                if (shadow) Modifier.shadow(16.dp, shape, ambientColor = AuthV2Style.Primary, spotColor = AuthV2Style.Primary.copy(alpha = .5f))
                else Modifier,
            )
            .clip(shape)
            .background(Color.White, shape),
    )
}

/** Login header: 72dp mark, 10dp gap, "AnyRent" 22sp extra-bold, centred */
@Composable
fun AuthBrandHeader() {
    val name = stringResource(R.string.app_name)
    Column(
        Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = name },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        BrandMark(72.dp, 20.dp, shadow = true)
        Text(name, color = AuthV2Style.Wordmark, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
    }
}

/** Top-bar brand: 32dp mark + "AnyRent" 17sp */
@Composable
fun AuthBrandBar(modifier: Modifier = Modifier) {
    val name = stringResource(R.string.app_name)
    Row(
        modifier.semantics(mergeDescendants = true) { contentDescription = name },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        BrandMark(32.dp, 9.dp, shadow = false)
        Text(name, color = AuthV2Style.Wordmark, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
    }
}

/** 64dp light-blue rounded tile with a mail icon (board DX-Da-gui) */
@Composable
fun AuthMailTile() {
    Box(
        Modifier
            .size(64.dp)
            .background(AuthV2Style.MailTile, RoundedCornerShape(18.dp))
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(Icons.Outlined.Email, contentDescription = null, tint = AuthV2Style.Primary, size = 32.dp)
    }
}
