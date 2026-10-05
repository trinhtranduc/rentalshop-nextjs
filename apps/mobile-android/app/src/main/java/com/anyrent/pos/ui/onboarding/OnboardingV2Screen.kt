package com.anyrent.pos.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.auth.v2.AuthBrandBar
import com.anyrent.pos.ui.auth.v2.AuthDotGrid
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.theme.DS

private data class OnboardingStep(val icon: ImageVector, val title: Int, val body: Int)

private val DotOff = Color(0xFFBFDBFE)

/**
 * Redesigned first-login onboarding (#387, flag `newAuth`; style 4A in #466, board DX-Gioi-thieu): dot-grid header,
 * small brand top-left, Bỏ qua pill top-right, a step icon card, dots and Tiếp / Bắt đầu. The caller keeps the current
 * "show once" storage (`SessionStore.onboardingDone`). No motion.
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
        AuthDotGrid()

        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp, start = 24.dp, end = 16.dp).heightIn(min = DS.TouchTarget),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AuthBrandBar()
                Spacer(Modifier.weight(1f))
                if (!isLast) {
                    TextButton(
                        onClick = onFinished,
                        modifier = Modifier
                            .heightIn(min = DS.TouchTarget)
                            .shadow(2.dp, CircleShape, ambientColor = Color(0x1F0F172A), spotColor = Color(0x1F0F172A))
                            .clip(CircleShape)
                            .background(Color.White),
                    ) {
                        Text(stringResource(R.string.onboarding_v2_skip), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted)
                    }
                }
            }
            Box(Modifier.fillMaxWidth().padding(top = 110.dp), contentAlignment = Alignment.Center) {
                StepIcon(step.icon)
            }
            Column(
                Modifier.fillMaxWidth().padding(start = 28.dp, end = 28.dp, top = 120.dp),
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

/** 132dp white rounded card with a hairline border and a soft neutral shadow (board DX-Gioi-thieu) */
@Composable
private fun StepIcon(icon: ImageVector) {
    val shape = RoundedCornerShape(36.dp)
    Box(
        Modifier
            .size(132.dp)
            .shadow(20.dp, shape, ambientColor = Color(0x1A0F172A), spotColor = Color(0x1A0F172A))
            .background(Color.White, shape)
            .border(1.dp, Color(0xFFE8ECF2), shape),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(icon, contentDescription = null, size = 64.dp, tint = DS.Colors.Primary)
    }
}
