package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.guide.FirstRunGuide
import com.anyrent.pos.domain.guide.FirstRunGuideCard
import com.anyrent.pos.domain.guide.FirstRunGuideStep
import com.anyrent.pos.ui.theme.DS

private val GuideBlue = Color(0xFFEFF6FF)
private val GuideGreen = Color(0xFFECFDF5)
private val GuideOk = Color(0xFF059669)
private val GuideLine = Color(0xFFE2E8F0)
private val GuideRing = Color(0xFF94A3B8)

/**
 * #1393: the card "Bắt đầu: 3 việc" (tab "★ Cầm tay: đơn đầu tiên"), iOS `FirstRunGuideCardView`: three rows that tick from
 * real data, Bỏ qua, and the one-time "Xong đơn đầu tiên". The same card sits at the top of Home and in the sheet from Cài đặt.
 */
@Composable
internal fun FirstRunGuideCardView(
    card: FirstRunGuideCard,
    dismissLabel: String,
    onStep: (FirstRunGuideStep) -> Unit,
    onDismiss: () -> Unit,
    onCloseFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (card) {
        FirstRunGuideCard.Hidden -> Unit
        is FirstRunGuideCard.Steps -> StepsCard(card.done, dismissLabel, onStep, onDismiss, modifier)
        FirstRunGuideCard.Finished -> FinishCard(onCloseFinish, modifier)
    }
}

@Composable
private fun StepsCard(
    done: Set<FirstRunGuideStep>,
    dismissLabel: String,
    onStep: (FirstRunGuideStep) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier,
) {
    val current = FirstRunGuide.current(done)
    Column(
        modifier
            .fillMaxWidth()
            .testTag("guide.card")
            .clip(RoundedCornerShape(16.dp))
            .background(GuideBlue)
            .padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 6.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                stringResource(R.string.first_run_guide_title),
                fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f),
            )
            Text(
                "${done.size}/${FirstRunGuideStep.entries.size}",
                fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Primary, modifier = Modifier.testTag("guide.count"),
            )
        }
        FirstRunGuideStep.entries.forEachIndexed { index, step ->
            if (index > 0) HorizontalDivider(color = GuideLine)
            StepRow(step, isDone = step in done, isCurrent = step == current) { onStep(step) }
        }
        Text(
            dismissLabel,
            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("guide.dismiss")
                .clickable(onClick = onDismiss)
                .heightIn(min = 36.dp)
                .padding(vertical = 9.dp),
        )
    }
}

@Composable
private fun StepRow(step: FirstRunGuideStep, isDone: Boolean, isCurrent: Boolean, onClick: () -> Unit) {
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
        val circle = Modifier.size(22.dp).clip(CircleShape)
        Box(
            if (isDone) {
                circle.background(GuideOk)
            } else {
                circle.border(2.dp, if (isCurrent) DS.Colors.Primary else GuideRing, CircleShape)
            },
            contentAlignment = Alignment.Center,
        ) {
            if (isDone) Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
        }
        Text(
            stringResource(rowTitle(step)),
            fontSize = DS.TextSize.Body,
            fontWeight = if (isCurrent) FontWeight.Bold else if (isDone) FontWeight.Normal else FontWeight.Medium,
            color = if (isCurrent) DS.Colors.Text else DS.Colors.TextMuted,
            textDecoration = if (isDone) TextDecoration.LineThrough else null,
            modifier = Modifier.weight(1f),
        )
        Icon(
            Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null,
            tint = if (isCurrent) DS.Colors.Primary else DS.Colors.TextMuted, modifier = Modifier.size(18.dp),
        )
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

private fun rowTitle(step: FirstRunGuideStep) = when (step) {
    FirstRunGuideStep.PRODUCT -> R.string.first_run_guide_step_product
    FirstRunGuideStep.CUSTOMER -> R.string.first_run_guide_step_customer
    FirstRunGuideStep.ORDER -> R.string.first_run_guide_step_order
}
