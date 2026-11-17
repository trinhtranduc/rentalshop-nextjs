package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.EventBusy
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.money.ShopMoney
import com.anyrent.pos.domain.overview.WeeklyBadge
import com.anyrent.pos.domain.overview.WeeklyContent
import com.anyrent.pos.domain.overview.WeeklyNumbers
import com.anyrent.pos.domain.overview.WeeklySummary
import com.anyrent.pos.domain.overview.WeeklySummaryLogic
import com.anyrent.pos.domain.overview.WeeklySummaryStatus
import com.anyrent.pos.domain.overview.WeeklyTone
import com.anyrent.pos.ui.theme.DS

/** #1612 colours of the summary sheet (mockup "Gom 3 nhóm"), on top of the Overview's [OV] */
private object WS {
    val Soft = Color(0xFFEFF6FF)
    val Bar = DS.Colors.Primary.copy(alpha = 0.3f)
    val Good = Color(0xFF047857)
    val Bad = Color(0xFFB91C1C)
    val Dot = Color(0xFFEF4444)
}

private fun tone(badge: WeeklyBadge): Color = if (badge.tone == WeeklyTone.GOOD) WS.Good else WS.Bad

/**
 * "✦ Tóm tắt tuần": small pill at the end of the Tổng quan title row (#1618, was floating above the tab bar); a red
 * dot until this week's summary is opened
 */
@Composable
internal fun WeeklySummaryButton(showsDot: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val title = stringResource(R.string.weekly_summary_title)
    val description = if (showsDot) "$title, ${stringResource(R.string.overview_dash_chip_new)}" else title
    Box(modifier) {
        Row(
            // 34dp pill; Compose widens the touch area of a small clickable to 48dp
            Modifier.heightIn(min = 34.dp).clip(CircleShape).background(DS.Colors.Primary)
                .clickable(role = Role.Button, onClick = onClick)
                .semantics(mergeDescendants = true) { contentDescription = description }
                .testTag("overview.weeklySummary.button")
                .padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text("✦", color = Color.White, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold)
            Text(title, color = Color.White, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, maxLines = 1)
        }
        if (showsDot) {
            Box(
                Modifier.align(Alignment.TopEnd).offset(x = 2.dp, y = (-3).dp).size(13.dp).clip(CircleShape)
                    .background(Color.White).padding(2.dp).clip(CircleShape).background(WS.Dot)
                    .testTag("overview.weeklySummary.dot"),
            )
        }
    }
}

/** Large sheet (90% of the screen, like the app's page sheets) in the Overview's light colours */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun WeeklySummarySheet(
    button: WeeklySummary?,
    phase: WeeklySheetPhase,
    onRetry: () -> Unit,
    onClose: () -> Unit,
) {
    val height = (LocalConfiguration.current.screenHeightDp * 0.9f).dp
    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = OV.Surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
        contentWindowInsets = { WindowInsets(0, 0, 0, 0) },
        dragHandle = {
            Box(Modifier.fillMaxWidth().padding(top = 7.dp, bottom = 2.dp), contentAlignment = Alignment.Center) {
                Box(Modifier.size(width = 38.dp, height = 5.dp).clip(RoundedCornerShape(3.dp)).background(OV.Line))
            }
        },
    ) {
        Column(Modifier.fillMaxWidth().height(height).testTag("overview.weeklySummary.sheet")) {
            val shown = (phase as? WeeklySheetPhase.Shown)?.summary
            val summary = shown ?: button
            val weekdays = stringResource(R.string.order_row_weekdays).split(',').map { it.trim() }
            // No-break spaces: a long branch name wraps before the week, never inside "CN 15/11"
            val week = WeeklySummaryLogic.weekLabel(summary?.weekStart, summary?.weekEnd, weekdays).replace(' ', ' ')
            // READY names the scope ("Cả shop" / the branch); loading, empty and error show the week only (mockup 1, 5)
            val subtitle = if (shown?.status == WeeklySummaryStatus.READY) {
                listOf(shown.branchName ?: stringResource(R.string.weekly_summary_whole_shop), week).filter { it.isNotEmpty() }.joinToString(" · ")
            } else week
            SheetHeader(subtitle, onClose)
            when {
                phase is WeeklySheetPhase.Loading -> Centered {
                    CircularProgressIndicator(
                        Modifier.size(30.dp), color = DS.Colors.Primary, trackColor = OV.Line, strokeWidth = 3.dp,
                    )
                    Text(stringResource(R.string.weekly_summary_loading), fontSize = DS.TextSize.Secondary, color = OV.Ink2, textAlign = TextAlign.Center)
                    Text(stringResource(R.string.weekly_summary_loading_hint), fontSize = DS.TextSize.Pill, color = OV.Muted, textAlign = TextAlign.Center)
                }
                phase is WeeklySheetPhase.Failed || shown == null -> Centered {
                    Text(stringResource(R.string.weekly_summary_error), fontSize = DS.TextSize.Secondary, color = OV.Ink2, textAlign = TextAlign.Center)
                    Text(
                        stringResource(R.string.retry), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = Color.White,
                        modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(DS.Colors.Primary)
                            .clickable(role = Role.Button, onClick = onRetry).heightIn(min = DS.TouchTarget)
                            .padding(horizontal = 20.dp, vertical = 12.dp).testTag("overview.weeklySummary.retry"),
                    )
                }
                shown.status == WeeklySummaryStatus.NO_ORDERS || shown.content == null -> Centered {
                    Icon(Icons.Outlined.EventBusy, contentDescription = null, tint = OV.Muted, modifier = Modifier.size(34.dp))
                    Text(stringResource(R.string.weekly_summary_no_orders), fontSize = DS.TextSize.Secondary, color = OV.Ink2, textAlign = TextAlign.Center)
                }
                else -> ReadyBody(shown, shown.content, weekdays)
            }
        }
    }
}

@Composable
private fun SheetHeader(subtitle: String, onClose: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 6.dp, top = 2.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).semantics(mergeDescendants = true) { heading() }, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stringResource(R.string.weekly_summary_title), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = OV.Ink)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, fontSize = DS.TextSize.Pill, color = OV.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        val close = stringResource(R.string.overview_dash_detail_close)
        Box(
            Modifier.size(DS.TouchTarget).clip(CircleShape).clickable(role = Role.Button, onClick = onClose)
                .semantics { contentDescription = close }.testTag("overview.weeklySummary.close"),
            contentAlignment = Alignment.Center,
        ) {
            Box(Modifier.size(30.dp).clip(CircleShape).background(OV.Track), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Close, contentDescription = null, tint = OV.Ink2, modifier = Modifier.size(16.dp))
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(OV.Line))
}

@Composable
private fun ColumnScope.Centered(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxWidth().weight(1f).padding(horizontal = 28.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
        content = content,
    )
}

/** Mockup "2 · Gom 3 nhóm": summary, 3 actions, then Doanh thu / Đơn hàng và thuê – trả / Mẫu hot và khách */
@Composable
private fun ReadyBody(summary: WeeklySummary, content: WeeklyContent, weekdays: List<String>) {
    val n = summary.numbers ?: WeeklyNumbers()
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "✦ " + content.summary, fontSize = DS.TextSize.Secondary, lineHeight = 20.sp, color = OV.Ink,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(WS.Soft).padding(horizontal = 12.dp, vertical = 10.dp),
        )
        if (content.actions.isNotEmpty()) {
            Section {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        stringResource(R.string.weekly_summary_actions).uppercase(), fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold,
                        color = OV.Muted, letterSpacing = 0.6.sp,
                    )
                    Text(
                        stringResource(R.string.weekly_summary_ai_tag), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Primary,
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(WS.Soft).padding(horizontal = 6.dp),
                    )
                }
                content.actions.forEachIndexed { index, action ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                        Box(Modifier.padding(top = 1.dp).size(20.dp).clip(CircleShape).background(DS.Colors.Primary), contentAlignment = Alignment.Center) {
                            Text("${index + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Text(action, fontSize = DS.TextSize.Secondary, lineHeight = 20.sp, color = OV.Ink, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
        Section {
            SectionTitle(stringResource(R.string.revenue))
            Pairs(
                { Figure(stringResource(R.string.overview_dash_kpi_order_value), money(n.orderValue?.current), WeeklySummaryLogic.percentBadge(n.orderValue)) },
                { Figure(stringResource(R.string.overview_dash_kpi_collected), money(n.collected?.current), WeeklySummaryLogic.percentBadge(n.collected)) },
            )
            Pairs(
                { Figure(stringResource(R.string.overview_dash_kpi_outstanding), money(n.outstanding)) },
                { Figure(stringResource(R.string.detail_fees), money(n.fees)) },
            )
            // The owner's open branches only; a branch manager never gets a list
            if (summary.branchName == null) {
                n.branches.forEach { branch ->
                    val badge = WeeklySummaryLogic.percentBadge(branch.orderValue)
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(OV.Track).padding(horizontal = 10.dp, vertical = 7.dp)
                            .semantics(mergeDescendants = true) {},
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(branch.name.ifBlank { "—" }, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = OV.Ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(pluralStringResource(R.plurals.overview_dash_orders, branch.newOrders, branch.newOrders), fontSize = DS.TextSize.Pill, color = OV.Muted)
                        }
                        ValueText(money(branch.orderValue?.current), badge)
                    }
                }
            }
            AiLine(content.revenueNote)
        }
        Section {
            SectionTitle(stringResource(R.string.weekly_summary_orders_group))
            Pairs(
                { Figure(stringResource(R.string.overview_dash_detail_new_orders), n.newOrders?.current?.toLong()?.toString() ?: "—", WeeklySummaryLogic.countBadge(n.newOrders)) },
                { Figure(stringResource(R.string.weekly_summary_rent_sale_cancel), WeeklySummaryLogic.joined(n.rent, n.sale, n.cancelled)) },
            )
            Pairs(
                { Figure(stringResource(R.string.weekly_summary_out_back), WeeklySummaryLogic.joined(n.pickedUp, n.returned)) },
                {
                    Figure(
                        stringResource(R.string.weekly_summary_late_not_picked),
                        n.late?.current?.toLong()?.toString() ?: "—",
                        WeeklySummaryLogic.countBadge(n.late, upIsBad = true),
                        tail = " · " + (n.notPickedUp?.toString() ?: "—"),
                    )
                },
            )
            DayBars(WeeklySummaryLogic.dayBars(n.byDay, weekdays))
            AiLine(content.ordersNote)
        }
        Section {
            SectionTitle(stringResource(R.string.weekly_summary_products_group))
            n.hot.take(3).forEachIndexed { index, product ->
                Row(
                    Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
                    verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("${index + 1}", fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Primary, modifier = Modifier.width(14.dp))
                    Text(product.name.ifBlank { "—" }, fontSize = DS.TextSize.Secondary, color = OV.Ink, modifier = Modifier.weight(1f))
                    val times = WeeklySummaryLogic.times(product)
                    Text(
                        pluralStringResource(R.plurals.weekly_summary_times, times, times) + " · " + money(product.revenue),
                        fontSize = DS.TextSize.Pill, color = OV.Muted, maxLines = 1, modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            Pairs(
                { Figure(stringResource(R.string.weekly_summary_customers), n.customers?.toString() ?: "—") },
                { Figure(stringResource(R.string.weekly_summary_new_returning), WeeklySummaryLogic.joined(n.newCustomers, n.returningCustomers)) },
            )
            AiLine(content.productsNote)
        }
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(OV.Line))
            Text(
                stringResource(R.string.weekly_summary_footer_figures), fontSize = DS.TextSize.Pill, lineHeight = 16.sp, color = OV.Muted,
                modifier = Modifier.padding(top = 8.dp),
            )
            val written = summary.generatedAt?.let { WeeklySummaryLogic.writtenAt(it, weekdays) }
            val next = summary.nextWeekStart?.let { WeeklySummaryLogic.dayLabel(it, weekdays) }
            if (written != null && next != null) {
                Text(stringResource(R.string.weekly_summary_footer_written, written, next), fontSize = DS.TextSize.Pill, lineHeight = 16.sp, color = OV.Muted)
            }
        }
    }
}

private fun money(amount: Double?): String = amount?.let { ShopMoney.withUnit(it) } ?: "—"

/** A group under a 1 dp line */
@Composable
private fun Section(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(OV.Line))
        Column(Modifier.fillMaxWidth().padding(top = 2.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = OV.Ink, modifier = Modifier.semantics { heading() })
}

/** Two grey tiles side by side, same height */
@Composable
private fun Pairs(left: @Composable RowScope.() -> Unit, right: @Composable RowScope.() -> Unit) {
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        left()
        right()
    }
}

/** Grey tile: small label, bold value, optional ▲ / ▼ badge and a tail ("4 ▲3 · 2") */
@Composable
private fun RowScope.Figure(label: String, value: String, badge: WeeklyBadge? = null, tail: String = "") {
    Column(
        Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(8.dp)).background(OV.Track)
            .semantics(mergeDescendants = true) {}
            .padding(horizontal = 10.dp, vertical = 7.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(label, fontSize = DS.TextSize.Pill, lineHeight = 15.sp, color = OV.Muted)
        ValueText(value, badge, tail)
    }
}

@Composable
private fun ValueText(value: String, badge: WeeklyBadge?, tail: String = "") {
    Text(
        buildAnnotatedString {
            append(value)
            if (badge != null) {
                append(" ")
                withStyle(SpanStyle(color = tone(badge), fontSize = 11.sp, fontWeight = FontWeight.Bold)) { append(badge.text) }
            }
            append(tail)
        },
        fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = OV.Ink, maxLines = 1,
    )
}

/** "✦ " + an AI note; nothing when the AI left it empty */
@Composable
private fun AiLine(text: String?) {
    if (text.isNullOrBlank()) return
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.Top) {
        Text("✦", fontSize = DS.TextSize.Secondary, color = DS.Colors.Primary)
        Text(text, fontSize = DS.TextSize.Secondary, lineHeight = 19.sp, color = OV.Ink, modifier = Modifier.weight(1f))
    }
}

/** New orders per day: the busiest day solid blue, the others light blue, weekday under each */
@Composable
private fun DayBars(bars: List<com.anyrent.pos.domain.overview.WeeklyDayBar>) {
    if (bars.isEmpty()) return
    val description = bars.joinToString(", ") { "${it.label} ${it.count}" }
    Row(
        Modifier.fillMaxWidth().height(70.dp).padding(horizontal = 2.dp).semantics { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.Bottom,
    ) {
        bars.forEach { bar ->
            Column(Modifier.weight(1f).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
                    Box(
                        Modifier.fillMaxWidth().fillMaxHeight(bar.ratio.toFloat().coerceIn(0f, 1f))
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(if (bar.top) DS.Colors.Primary else WS.Bar),
                    )
                }
                Text(
                    bar.label, fontSize = 11.sp, fontWeight = if (bar.top) FontWeight.Bold else FontWeight.Normal,
                    color = if (bar.top) OV.Ink else OV.Muted, maxLines = 1, modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}
