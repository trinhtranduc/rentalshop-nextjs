package com.anyrent.pos.ui.onboarding

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.theme.DS

private data class OnboardingStep(val icon: ImageVector, val title: Int, val body: Int)

/**
 * Redesigned first-login onboarding (#387, flag `newAuth`, board Onboarding): three steps, Bỏ qua, dots,
 * Tiếp / Bắt đầu. The caller keeps the current "show once" storage (`SessionStore.onboardingDone`).
 */
@Composable
fun OnboardingV2Screen(onFinished: () -> Unit) {
    val steps = remember {
        listOf(
            OnboardingStep(Icons.Outlined.Checkroom, R.string.onboarding_v2_product_title, R.string.onboarding_v2_product_body),
            OnboardingStep(Icons.Outlined.Group, R.string.onboarding_v2_customer_title, R.string.onboarding_v2_customer_body),
            OnboardingStep(Icons.AutoMirrored.Outlined.ReceiptLong, R.string.onboarding_v2_order_title, R.string.onboarding_v2_order_body),
        )
    }
    var index by remember { mutableIntStateOf(0) }
    val isLast = index == steps.lastIndex
    val step = steps[index]

    Column(
        Modifier
            .fillMaxSize()
            .background(DS.Colors.Surface)
            .statusBarsPadding()
            .navigationBarsPadding()
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
        Row(Modifier.fillMaxWidth().padding(top = 8.dp, end = 8.dp).heightIn(min = DS.TouchTarget), horizontalArrangement = Arrangement.End) {
            if (!isLast) {
                TextButton(onClick = onFinished, modifier = Modifier.heightIn(min = DS.TouchTarget)) {
                    Text(stringResource(R.string.onboarding_v2_skip), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted)
                }
            }
        }
        Column(
            Modifier.weight(1f).fillMaxWidth().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        ) {
            Box(
                Modifier.size(220.dp).clip(RoundedCornerShape(48.dp)).background(Color(0xFFDBEAFE)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(step.icon, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(110.dp))
            }
            Text(
                stringResource(R.string.onboarding_v2_step, index + 1, steps.size),
                fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
                modifier = Modifier.padding(top = 8.dp),
            )
            Text(
                stringResource(step.title), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() },
            )
            Text(
                stringResource(step.body), fontSize = 16.sp, lineHeight = 24.sp, color = DS.Colors.TextMuted,
                textAlign = TextAlign.Center,
            )
        }
        Column(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = 40.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
                steps.indices.forEach { i ->
                    Box(
                        Modifier.height(8.dp).width(if (i == index) 24.dp else 8.dp).clip(RoundedCornerShape(DS.Radius.pill))
                            .background(if (i == index) DS.Colors.Primary else Color(0xFFCBD5E1)),
                    )
                }
            }
            Button(
                onClick = { if (isLast) onFinished() else index += 1 },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
            ) {
                Text(stringResource(if (isLast) R.string.onboarding_v2_start else R.string.onboarding_v2_next), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(0.dp))
        }
    }
}
