package com.anyrent.pos.ui.onboarding

import android.provider.Settings
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.InfiniteRepeatableSpec
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.theme.DS

private data class OnboardingStep(val icon: ImageVector, val title: Int, val body: Int)

private val BlobBlue = Color(0xFFDBEAFE)
private val BlobPeach = Color(0xFFFFEDD5)
private val DotOff = Color(0xFFBFDBFE)

/**
 * Redesigned first-login onboarding (#387, flag `newAuth`, board Onboarding-E): drifting blobs, a floating step icon,
 * Bỏ qua pill, dots and Tiếp / Bắt đầu. The caller keeps the current "show once" storage
 * (`SessionStore.onboardingDone`). No motion when the system turns animations off.
 */
@Composable
fun OnboardingV2Screen(onFinished: () -> Unit) {
    val steps = remember {
        listOf(
            OnboardingStep(Icons.Outlined.Checkroom, R.string.onboarding_v2_product_title, R.string.onboarding_v2_product_body),
            OnboardingStep(Icons.Outlined.Person, R.string.onboarding_v2_customer_title, R.string.onboarding_v2_customer_body),
            OnboardingStep(Icons.Outlined.CalendarMonth, R.string.onboarding_v2_order_title, R.string.onboarding_v2_order_body),
        )
    }
    var index by remember { mutableIntStateOf(0) }
    val isLast = index == steps.lastIndex
    val step = steps[index]
    val context = LocalContext.current
    val motion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(DS.Colors.Surface)
            .pointerInput(Unit) {
                var total = 0f
                detectHorizontalDragGestures(
                    onDragStart = { total = 0f },
                    onDragEnd = {
                        if (total < -80 && index < steps.lastIndex) index += 1
                        if (total > 80 && index > 0) index -= 1
                    },
                ) { _, amount -> total += amount }
            },
    ) {
        // Decorative blobs, behind everything
        Box(Modifier.fillMaxSize().statusBarsPadding()) {
            Blob(BlobBlue, 299.dp, Alignment.TopStart, x = (-80).dp, y = (-29).dp, RoundedCornerShape(42, 50, 50, 45), motion, delayMs = 0)
            Blob(BlobPeach, 195.dp, Alignment.TopEnd, x = 69.dp, y = 178.dp, RoundedCornerShape(50, 45, 40, 50), motion, delayMs = 4000)
            Blob(DS.Colors.Primary, 80.dp, Alignment.TopStart, x = 69.dp, y = 304.dp, CircleShape, motion, delayMs = 8000)
        }

        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp, end = 16.dp).heightIn(min = DS.TouchTarget),
                horizontalArrangement = Arrangement.End,
            ) {
                if (!isLast) {
                    TextButton(
                        onClick = onFinished,
                        modifier = Modifier.heightIn(min = DS.TouchTarget).clip(CircleShape).background(Color.White.copy(alpha = 0.9f)),
                    ) {
                        Text(stringResource(R.string.onboarding_v2_skip), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted)
                    }
                }
            }
            Box(Modifier.fillMaxWidth().padding(top = 110.dp), contentAlignment = Alignment.Center) {
                StepIcon(step.icon, motion)
            }
            Column(
                Modifier.fillMaxWidth().padding(start = 28.dp, end = 28.dp, top = 150.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    stringResource(R.string.onboarding_v2_step, index + 1, steps.size).uppercase(),
                    fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Primary, letterSpacing = 0.5.sp,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
                Text(
                    stringResource(step.title), fontSize = 28.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold,
                    color = DS.Colors.Text, modifier = Modifier.semantics { heading() },
                )
                Text(stringResource(step.body), fontSize = 16.sp, lineHeight = 23.sp, color = DS.Colors.TextMuted)
            }
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = 36.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    steps.indices.forEach { i ->
                        Box(
                            Modifier.height(8.dp).width(if (i == index) 24.dp else 8.dp).clip(CircleShape)
                                .background(if (i == index) DS.Colors.Primary else DotOff),
                        )
                    }
                }
                Button(
                    onClick = { if (isLast) onFinished() else index += 1 },
                    modifier = Modifier.height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 28.dp),
                ) {
                    Text(stringResource(if (isLast) R.string.onboarding_v2_start else R.string.onboarding_v2_next), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/** Translate up to 15dp and scale 0.96–1.06 on a 12 s ease-in-out loop, offset by [delayMs] */
@Composable
private fun BoxScope.Blob(color: Color, size: Dp, align: Alignment, x: Dp, y: Dp, shape: Shape, motion: Boolean, delayMs: Int) {
    var tx = 0f
    var ty = 0f
    var scale = 1f
    if (motion) {
        val transition = rememberInfiniteTransition(label = "blob")
        fun spec(a: Float, b: Float): InfiniteRepeatableSpec<Float> = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 12_000
                0f at 0 using FastOutSlowInEasing
                a at 3_960 using FastOutSlowInEasing
                b at 7_920 using FastOutSlowInEasing
                0f at 12_000
            },
            initialStartOffset = StartOffset(delayMs),
        )
        tx = transition.animateFloat(0f, 0f, spec(18f, -14f), label = "x").value
        ty = transition.animateFloat(0f, 0f, spec(-12f, 10f), label = "y").value
        scale = 1f + transition.animateFloat(0f, 0f, spec(0.06f, -0.04f), label = "s").value
    }
    Box(
        Modifier
            .align(align)
            .offset(x, y)
            .size(size)
            .graphicsLayer {
                translationX = tx.dp.toPx()
                translationY = ty.dp.toPx()
                scaleX = scale
                scaleY = scale
            }
            .clip(shape)
            .background(color),
    )
}

/** 120dp white rounded card with a soft blue shadow; floats 8dp on a 4.2 s loop */
@Composable
private fun StepIcon(icon: ImageVector, motion: Boolean) {
    var lift = 0f
    if (motion) {
        val transition = rememberInfiniteTransition(label = "float")
        lift = transition.animateFloat(
            0f, -8f,
            infiniteRepeatable(tween(2_100, easing = FastOutSlowInEasing), RepeatMode.Reverse),
            label = "lift",
        ).value
    }
    Box(
        Modifier
            .graphicsLayer { translationY = lift.dp.toPx() }
            .size(120.dp)
            .shadow(24.dp, RoundedCornerShape(36.dp), ambientColor = DS.Colors.Primary.copy(alpha = 0.2f), spotColor = DS.Colors.Primary.copy(alpha = 0.35f))
            .background(Color.White, RoundedCornerShape(36.dp)),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(icon, contentDescription = null, size = 60.dp, tint = DS.Colors.Primary)
    }
}
