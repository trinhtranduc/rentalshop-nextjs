package com.anyrent.pos.ui.home.v2

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.keyframes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.guide.FirstRunGuide
import com.anyrent.pos.domain.guide.FirstRunGuideCard
import com.anyrent.pos.domain.guide.FirstRunGuideStep
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.delay

private val GuideBlue = Color(0xFFEFF6FF)
private val GuideGreen = Color(0xFFECFDF5)
private val GuideOk = Color(0xFF059669)
private val GuideRing = Color(0xFF94A3B8)

/** What sits under the rows: Để sau on Home, Đóng and maybe Ẩn hướng dẫn in the sheet from Cài đặt */
internal sealed interface FirstRunGuideFoot {
    data class Home(val onLater: () -> Unit) : FirstRunGuideFoot
    data class Sheet(val onClose: () -> Unit, val onHide: (() -> Unit)?) : FirstRunGuideFoot
}

/**
 * #1393, #1410: the card "Bắt đầu: 3 việc" (tab "★ Cầm tay: đơn đầu tiên"), iOS `FirstRunGuideCardView`: rows that tick from real
 * data, one blue button on the current step, Để sau, the slim row, and the one-time "Xong đơn đầu tiên". The same card sits on Home
 * and in the sheet from Cài đặt.
 */
@Composable
internal fun FirstRunGuideCardView(
    card: FirstRunGuideCard,
    foot: FirstRunGuideFoot,
    onStep: (FirstRunGuideStep) -> Unit,
    onExpand: () -> Unit,
    onCloseFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (card) {
        FirstRunGuideCard.Hidden -> Unit
        is FirstRunGuideCard.Steps -> StepsCard(card.done, foot, onStep, modifier)
        is FirstRunGuideCard.Collapsed -> SlimRow(card.done, onExpand, modifier)
        FirstRunGuideCard.Finished -> FinishCard(onCloseFinish, modifier)
    }
}

@Composable
private fun StepsCard(
    done: Set<FirstRunGuideStep>,
    foot: FirstRunGuideFoot,
    onStep: (FirstRunGuideStep) -> Unit,
    modifier: Modifier,
) {
    val current = FirstRunGuide.current(done)
    Column(
        modifier
            .fillMaxWidth()
            .testTag("guide.card")
            .clip(RoundedCornerShape(16.dp))
            .background(GuideBlue)
            .padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 4.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                stringResource(R.string.first_run_guide_title),
                fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f),
            )
            Text(
                countText(done),
                fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Primary, modifier = Modifier.testTag("guide.count"),
            )
        }
        FirstRunGuideStep.entries.forEach { step ->
            if (step == current) {
                CurrentRow(step) { onStep(step) }
            } else {
                StepRow(step, isDone = step in done) { onStep(step) }
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            when (foot) {
                is FirstRunGuideFoot.Home -> FootText(stringResource(R.string.first_run_guide_later), "guide.later", foot.onLater)
                is FirstRunGuideFoot.Sheet -> {
                    FootText(stringResource(R.string.first_run_guide_close), "guide.dismiss", foot.onClose)
                    Spacer(Modifier.weight(1f))
                    foot.onHide?.let { FootText(stringResource(R.string.first_run_guide_hide), "guide.hide", it, TextDecoration.Underline) }
                }
            }
        }
    }
}

@Composable
private fun FootText(text: String, tag: String, onClick: () -> Unit, decoration: TextDecoration? = null) {
    Text(
        text,
        fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted, textDecoration = decoration,
        modifier = Modifier.testTag(tag).clickable(onClick = onClick).heightIn(min = 44.dp).padding(vertical = 12.dp),
    )
}

/** "Bắt đầu n/3 ›": stays at the top of the list and reopens the card */
@Composable
private fun SlimRow(done: Set<FirstRunGuideStep>, onExpand: () -> Unit, modifier: Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .testTag("guide.slim")
            .clip(RoundedCornerShape(12.dp))
            .background(GuideBlue)
            .clickable(onClick = onExpand)
            .heightIn(min = 44.dp)
            .padding(start = 14.dp, end = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(stringResource(R.string.first_run_guide_collapsed_title), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        Text(
            countText(done),
            fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Primary,
            modifier = Modifier.weight(1f).testTag("guide.count"),
        )
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(18.dp))
    }
}

private fun countText(done: Set<FirstRunGuideStep>) = "${done.size}/${FirstRunGuideStep.entries.size}"

/** The step to do now: a highlighted box with its number and one solid blue button */
@Composable
private fun CurrentRow(step: FirstRunGuideStep, onClick: () -> Unit) {
    val context = LocalContext.current
    val lift = remember { Animatable(0f) }
    var bounced by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        if (FirstRunGuide.bounces(scale, bounced)) {
            bounced = true
            delay(250)
            lift.animateTo(0f, keyframes {
                durationMillis = 500
                -5f at 225
                1f at 375
            })
        }
    }
    Column(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White)
            .border(1.5.dp, DS.Colors.Primary, RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().testTag(rowTag(step)).clickable(onClick = onClick).heightIn(min = 32.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(Modifier.size(24.dp).clip(CircleShape).background(DS.Colors.Primary), contentAlignment = Alignment.Center) {
                Text("${step.ordinal + 1}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
            Text(stringResource(rowTitle(step)), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
        }
        Box(
            Modifier
                .fillMaxWidth()
                .offset { IntOffset(0, lift.value.dp.roundToPx()) }
                .testTag("guide.cta")
                .clip(RoundedCornerShape(12.dp))
                .background(DS.Colors.Primary)
                .clickable(onClick = onClick)
                .height(46.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(stringResource(rowButton(step)), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}

/** A row that is not the current one: dim but tappable, or ticked */
@Composable
private fun StepRow(step: FirstRunGuideStep, isDone: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .testTag(rowTag(step))
            .clickable(onClick = onClick)
            .heightIn(min = 44.dp)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        val circle = Modifier.size(24.dp).clip(CircleShape)
        Box(
            if (isDone) circle.background(GuideOk) else circle.border(1.5.dp, GuideRing, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (isDone) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            } else {
                Text("${step.ordinal + 1}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted)
            }
        }
        Text(
            stringResource(rowTitle(step)),
            fontSize = DS.TextSize.Body,
            color = DS.Colors.TextMuted,
            textDecoration = if (isDone) TextDecoration.LineThrough else null,
            modifier = Modifier.weight(1f),
        )
        if (!isDone) {
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null,
                tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
private fun FinishCard(onClose: () -> Unit, modifier: Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .testTag("guide.finish")
            .clip(RoundedCornerShape(16.dp))
            .background(GuideGreen)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(GuideOk), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(stringResource(R.string.first_run_guide_finish_title), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            Text(stringResource(R.string.first_run_guide_finish_body), fontSize = 13.sp, color = DS.Colors.TextMuted)
        }
        Text(
            stringResource(R.string.first_run_guide_close),
            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Primary,
            modifier = Modifier.testTag("guide.finish.close").clickable(onClick = onClose).padding(horizontal = 6.dp, vertical = 12.dp),
        )
    }
}

private fun rowTag(step: FirstRunGuideStep) = when (step) {
    FirstRunGuideStep.PRODUCT -> "guide.row.product"
    FirstRunGuideStep.CUSTOMER -> "guide.row.customer"
    FirstRunGuideStep.ORDER -> "guide.row.order"
}

private fun rowButton(step: FirstRunGuideStep) = when (step) {
    FirstRunGuideStep.PRODUCT -> R.string.first_run_guide_go_product
    FirstRunGuideStep.CUSTOMER -> R.string.first_run_guide_go_customer
    FirstRunGuideStep.ORDER -> R.string.first_run_guide_go_order
}

private fun rowTitle(step: FirstRunGuideStep) = when (step) {
    FirstRunGuideStep.PRODUCT -> R.string.first_run_guide_step_product
    FirstRunGuideStep.CUSTOMER -> R.string.first_run_guide_step_customer
    FirstRunGuideStep.ORDER -> R.string.first_run_guide_step_order
}
