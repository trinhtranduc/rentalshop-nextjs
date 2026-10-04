package com.anyrent.pos.ui.auth.v2

import android.provider.Settings
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.StartOffsetType
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import com.anyrent.pos.ui.common.AppIcon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.anyrent.pos.ui.theme.DS

/**
 * #386 — the one place for the look of the new auth screens (login, create store 1/2 and 2/2, forgot, sent):
 * style E — white page, three soft drifting blobs at the top, no cards. A restyle only touches this file.
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

    // Controls
    val Primary = DS.Colors.Primary
    val OnPrimary = Color.White
    val FieldBackground = Color.White
    val FieldBorder = Color(0xFFCBD5E1)
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
    val BackButtonFill = Color.White.copy(alpha = .9f)

    // Blobs
    val BlobBlue = Color(0xFFDBEAFE)
    val BlobPeach = Color(0xFFFFEDD5)
    val BlobDot = DS.Colors.Primary

    /** Blob size per screen (board: login 1, forgot and sent 0.8, register 0.55) */
    enum class BlobScale(val factor: Float) { LOGIN(1f), FORGOT(.8f), REGISTER(.55f) }

    /** Lowest point of the blobs from the top of the screen, drift included (dot: y 230, 70dp, drifts ≤ 12dp).
     *  Content starts below it, so a blob never sits on text on any device. */
    fun blobClearance(scale: BlobScale): Dp = (230 + 70).dp * scale.factor + 16.dp

    /** Height of the back-button header (12 top + 44) */
    val HeaderHeight = 56.dp
}

/** System "remove animations" (animator duration scale 0) turns the motion off */
@Composable
private fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember {
        runCatching {
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        }.getOrDefault(false)
    }
}

private data class Blob(
    val color: Color,
    val size: Dp,
    val shape: Shape,
    val x: Dp,
    val y: Dp,
    val fromEnd: Boolean,
    val delayMillis: Int,
)

/** Three decorative blobs behind the content; each drifts and scales on a 12 s loop */
@Composable
fun AuthBlobs(scale: AuthV2Style.BlobScale, scrollOffset: () -> Int = { 0 }) {
    val f = scale.factor
    val blobs = listOf(
        Blob(AuthV2Style.BlobBlue, 260.dp * f, RoundedCornerShape(42, 58, 55, 45), (-70).dp * f, (-60).dp * f, false, 0),
        Blob(AuthV2Style.BlobPeach, 170.dp * f, RoundedCornerShape(55, 45, 40, 60), (-60).dp * f, 120.dp * f, true, 4000),
        Blob(AuthV2Style.BlobDot, 70.dp * f, CircleShape, 60.dp * f, 230.dp * f, false, 8000),
    )
    val reduceMotion = rememberReduceMotion()
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .clipToBounds()
            .graphicsLayer { translationY = -scrollOffset().toFloat() }
            .clearAndSetSemantics { },
    ) {
        val width = maxWidth
        blobs.forEach { blob ->
            // No running transition at all with reduced motion (it would still draw frames)
            val phase = if (reduceMotion) 0f else blobPhase(blob.delayMillis)
            val (dx, dy, s) = blobFrame(phase)
            val left = if (blob.fromEnd) width - blob.size - blob.x else blob.x
            Box(
                Modifier
                    .offset(x = left, y = blob.y)
                    .size(blob.size)
                    .graphicsLayer {
                        translationX = dx * density
                        translationY = dy * density
                        scaleX = s
                        scaleY = s
                    }
                    .background(blob.color, blob.shape),
            )
        }
    }
}

/** 0 → 1 over 12 s, started `delayMillis` into the loop (CSS negative animation-delay) */
@Composable
private fun blobPhase(delayMillis: Int): Float {
    val transition = rememberInfiniteTransition(label = "blob")
    val t by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            tween(12_000, easing = LinearEasing),
            RepeatMode.Restart,
            StartOffset(delayMillis, StartOffsetType.FastForward),
        ),
        label = "blob",
    )
    return t
}

/** Position on the drift loop: (dx dp, dy dp, scale), eased between the keyframes */
internal fun blobFrame(phase: Float): Triple<Float, Float, Float> {
    val keys = listOf(
        Triple(0f, 0f, 1f),
        Triple(15f, -12f, 1.06f),
        Triple(-14f, 10f, .96f),
        Triple(0f, 0f, 1f),
    )
    val p = phase.coerceIn(0f, 1f) * 3f
    val i = p.toInt().coerceAtMost(2)
    val local = FastOutSlowInEasing.transform(p - i)
    val a = keys[i]
    val b = keys[i + 1]
    fun lerp(x: Float, y: Float) = x + (y - x) * local
    return Triple(lerp(a.first, b.first), lerp(a.second, b.second), lerp(a.third, b.third))
}

@Composable
private fun floatLift(): Float {
    val transition = rememberInfiniteTransition(label = "float")
    val lift by transition.animateFloat(
        initialValue = 0f,
        targetValue = -8f,
        animationSpec = infiniteRepeatable(tween(2_100, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "lift",
    )
    return lift
}

/** White rounded square with a soft blue shadow and a mail icon, floating 8dp on a 4.2 s loop (board Sent-E) */
@Composable
fun AuthFloatingMailIcon() {
    val reduceMotion = rememberReduceMotion()
    val lift = if (reduceMotion) 0f else floatLift()
    val density = LocalDensity.current.density
    Box(
        Modifier
            .graphicsLayer { translationY = lift * density }
            .size(72.dp)
            .shadow(16.dp, RoundedCornerShape(22.dp), ambientColor = AuthV2Style.Primary, spotColor = AuthV2Style.Primary)
            .background(Color.White, RoundedCornerShape(22.dp))
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(Icons.Outlined.Email, contentDescription = null, tint = AuthV2Style.Primary, size = 36.dp)
    }
}
