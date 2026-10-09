package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.domain.overview.CollateralCount
import com.anyrent.pos.domain.overview.CollateralFlow
import com.anyrent.pos.domain.overview.CollectedBreakdown
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewLinks
import com.anyrent.pos.domain.overview.OverviewBar
import com.anyrent.pos.domain.overview.OverviewChart
import com.anyrent.pos.domain.overview.OutstandingBreakdown
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewPeriod
import com.anyrent.pos.domain.overview.OverviewPreset
import com.anyrent.pos.domain.overview.OverviewReport
import com.anyrent.pos.domain.overview.OverviewTopKind
import com.anyrent.pos.domain.overview.OverviewTopRow
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.v2.ProductThumb
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.home.v2.V2Segmented
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.ui.theme.DS
import java.time.LocalDate
import kotlinx.coroutines.flow.drop

private fun dayLabel(date: LocalDate): String =
    formatDayShort(date)

/** "CN 27/09 – T7 03/10" (one day: "T7 03/10") */
internal fun longRange(range: DayRange): String =
    if (range.start == range.end) dayLabel(range.start) else "${dayLabel(range.start)} – ${dayLabel(range.end)}"

@Composable
private fun presetTitle(preset: OverviewPreset): String = stringResource(
    when (preset) {
        OverviewPreset.TODAY -> R.string.overview_v2_period_today
        OverviewPreset.YESTERDAY -> R.string.overview_v2_period_yesterday
        OverviewPreset.LAST_7 -> R.string.overview_v2_period_last7
        OverviewPreset.LAST_30 -> R.string.overview_v2_period_last30
        OverviewPreset.THIS_MONTH -> R.string.overview_v2_period_this_month
        OverviewPreset.LAST_MONTH -> R.string.overview_v2_period_last_month
    },
)

/** Redesigned overview tab (#374, boards Tong-quan, Tong-quan-chon), shown when `newOverview` is on */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewV2Screen(
    viewModel: OverviewV2ViewModel = viewModel(factory = OverviewV2ViewModel.Factory()),
    /** #388: (kind, start, end) of the `overview-orders` route */
    onOpenList: (String, String, String) -> Unit = { _, _, _ -> },
    /** #388: (product id, start, end) */
    onOpenProduct: (Int, String, String) -> Unit = { _, _, _ -> },
    /** #633: (customer id, start, end), the customer's orders in the period */
    onOpenCustomer: (Int, String, String) -> Unit = { _, _, _ -> },
    /** #633: "Xem tất cả" of a top list: ([OverviewTopKind.key], start, end) */
    onOpenTopAll: (String, String, String) -> Unit = { _, _, _ -> },
    /** #484: "Đang cho thuê" and "Đang thuê · trễ hạn trả" open the rented-out list */
    onOpenRentedOut: () -> Unit = {},
    /** #496: "Quá ngày lấy, khách chưa đến" and both "Còn phải thu" rows open "Chưa lấy đồ" */
    onOpenNotPickedUp: () -> Unit = {},
    /** #496: the "Việc hôm nay" rows open the Orders tab */
    onOpenOrdersTab: () -> Unit = {},
) {
    val state by viewModel.state.collectAsState()
    // #674: back on screen or an order changed: quiet reload only when dirty or 10 minutes old
    LaunchedEffect(Unit) { viewModel.onShown() }
    LaunchedEffect(Unit) { OrdersChanged.version.drop(1).collect { viewModel.onShown() } }
    var showSheet by remember { mutableStateOf(false) }
    var showDetails by remember { mutableStateOf(false) }
    var showOutstanding by remember { mutableStateOf(false) }
    var chart by rememberSaveable { mutableStateOf(OverviewChart.MONEY) }
    var showPicker by remember { mutableStateOf(false) }
    val today = viewModel.today()
    val range = OverviewLogic.range(state.period, today)
    val periodTitle = when (val period = state.period) {
        is OverviewPeriod.Preset -> presetTitle(period.preset)
        is OverviewPeriod.Custom -> OverviewLogic.shortRange(period.range)
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.overview_v2_title), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
            if (state.showsRevenue) {
                val description = stringResource(R.string.overview_v2_period_accessibility, periodTitle)
                Row(
                    Modifier
                        .heightIn(min = DS.TouchTarget)
                        .clip(RoundedCornerShape(999.dp))
                        .border(1.dp, V2Colors.Line, RoundedCornerShape(999.dp))
                        .clickable { showSheet = true }
                        .semantics { contentDescription = description }
                        .padding(start = 14.dp, end = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(periodTitle, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                    Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(16.dp))
                }
            }
        }
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = viewModel::refresh, modifier = Modifier.fillMaxSize()) {
            LazyColumn(Modifier.fillMaxSize()) {
                if (state.showsRevenue) {
                    item(key = "revenue") {
                        Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
                        RevenueSection(
                            state.report, state.loading, state.reportError, range, chart,
                            onChart = { chart = it }, onDetails = { showDetails = true },
                            onOutstanding = { showOutstanding = true }, onRetry = viewModel::load,
                        )
                    }
                }
                // #496 "VIỆC HÔM NAY · T3 06/10": today's hand-overs and returns, whatever the period; hidden without the data
                val todayTasks = state.now?.takeIf { state.showsOperations }?.let { now ->
                    listOfNotNull(
                        now.pickupsToday?.let { Triple(R.string.overview_v2_pickups_today, R.string.overview_v2_pickups_done, it) },
                        now.returnsToday?.let { Triple(R.string.overview_v2_returns_today, R.string.overview_v2_returns_done, it) },
                    )
                }.orEmpty()
                if (todayTasks.isNotEmpty()) {
                    item(key = "today-band") {
                        val weekdays = stringResource(R.string.order_row_weekdays).split(',').map { it.trim() }
                        SectionBand("${stringResource(R.string.overview_v2_today_work)} · ${OrderRowDates.day(ShopTime.today(), weekdays)}")
                    }
                    items(todayTasks, key = { "today-${it.first}" }) { (label, sub, task) ->
                        TodayTaskRow(stringResource(label), stringResource(sub, task.done, task.total), task.remaining, onOpenOrdersTab)
                    }
                }
                // #388: each figure opens its list (the kind of the `overview-orders` route)
                val stats = buildList {
                    state.report?.newOrders?.takeIf { state.showsRevenue }?.let { add(StatRowData(R.string.overview_v2_new_orders, it.toString(), DS.Colors.Text, OverviewLinks.NEW)) }
                    state.now?.rentedOut?.let { add(StatRowData(R.string.overview_v2_rented_out, it.toString(), DS.Colors.Text, OverviewLinks.RENTED)) }
                    state.now?.takeIf { state.showsOperations }?.let {
                        add(StatRowData(R.string.overview_v2_late_returns, it.lateReturns.toString(), if (it.lateReturns > 0) V2Colors.Danger else DS.Colors.Text, OverviewLinks.LATE))
                    }
                    // #496: red row, opens "Chưa lấy đồ"
                    state.now?.noShows?.takeIf { state.showsOperations }?.let {
                        add(StatRowData(R.string.overview_v2_no_shows, it.toString(), if (it > 0) V2Colors.Danger else DS.Colors.Text, NO_SHOWS_KIND))
                    }
                }
                if (stats.isNotEmpty()) {
                    item(key = "orders-band") { SectionBand(stringResource(R.string.overview_v2_orders)) }
                    items(stats, key = { it.label }) { stat ->
                        Row(
                            Modifier.fillMaxWidth()
                                .then(
                                    stat.kind?.let { kind ->
                                        when (kind) {
                                            OverviewLinks.RENTED, OverviewLinks.LATE -> Modifier.clickable(onClick = onOpenRentedOut)
                                            NO_SHOWS_KIND -> Modifier.clickable(onClick = onOpenNotPickedUp)
                                            else -> Modifier.clickable { onOpenList(kind, range.start.toString(), range.end.toString()) }
                                        }
                                    } ?: Modifier,
                                )
                                .heightIn(min = 48.dp).padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                stringResource(stat.label), fontSize = DS.TextSize.Body, modifier = Modifier.weight(1f),
                                color = if (stat.kind == NO_SHOWS_KIND && stat.color == V2Colors.Danger) V2Colors.Danger else DS.Colors.Text,
                            )
                            Text(stat.value, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = stat.color)
                            if (stat.kind != null) Chevron()
                        }
                        ThinDivider()
                    }
                }
                // #633: Top sản phẩm / Top khách hàng, five rows each; "Xem tất cả" opens up to 50 (hidden without rows)
                val report = state.report
                if (state.showsRevenue && report != null) {
                    OverviewTopKind.entries.forEach { kind ->
                        val rows = OverviewLogic.topRows(report, kind)
                        if (rows.isEmpty()) return@forEach
                        item(key = "top-band-${kind.key}") {
                            SectionBand(stringResource(topTitle(kind))) {
                                ViewAllLink { onOpenTopAll(kind.key, range.start.toString(), range.end.toString()) }
                            }
                        }
                        itemsIndexed(rows, key = { index, row -> "top-${kind.key}-$index-${row.id}" }) { index, row ->
                            OverviewTopRowItem(
                                row, kind, rank = index + 1,
                                onClick = row.id?.let { id ->
                                    {
                                        val open = if (kind == OverviewTopKind.PRODUCTS) onOpenProduct else onOpenCustomer
                                        open(id, range.start.toString(), range.end.toString())
                                    }
                                },
                            )
                        }
                    }
                }
                if (!state.showsRevenue && !state.showsOperations) {
                    item(key = "no-access") {
                        Text(
                            stringResource(R.string.overview_v2_no_access), color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body,
                            textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(40.dp),
                        )
                    }
                }
                item(key = "bottom") { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    if (showSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = DS.Colors.Surface,
        ) {
            PeriodSheet(
                selected = state.period,
                today = today,
                onClose = { showSheet = false },
                onSelect = {
                    showSheet = false
                    viewModel.select(it)
                },
                onCustom = {
                    showSheet = false
                    showPicker = true
                },
            )
        }
    }
    val detailsReport = state.report
    if (showDetails && detailsReport != null) {
        ModalBottomSheet(
            onDismissRequest = { showDetails = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = DS.Colors.Surface,
        ) {
            val flow = detailsReport.collateralFlow
            if (flow != null) {
                // #494: everything received, collateral included, split into "Thực thu" and "Thế chân"
                ReceivedDetailSheet(
                    report = detailsReport,
                    flow = flow,
                    collateralToReturn = state.now?.collateralToReturn,
                    collateralToCollect = state.now?.collateralToCollect,
                    periodTitle = periodTitle,
                    onClose = { showDetails = false },
                )
            } else {
                CollectedDetailSheet(
                    report = detailsReport,
                    collateralHeld = state.now?.collateralHeld,
                    periodTitle = periodTitle,
                    onClose = { showDetails = false },
                )
            }
        }
    }
    val outstandingReport = state.report
    val outstandingBreakdown = outstandingReport?.outstandingBreakdown
    if (showOutstanding && outstandingReport != null && outstandingBreakdown != null) {
        ModalBottomSheet(
            onDismissRequest = { showOutstanding = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = DS.Colors.Surface,
        ) {
            OutstandingDetailSheet(
                outstanding = outstandingReport.outstanding,
                breakdown = outstandingBreakdown,
                periodTitle = periodTitle,
                onClose = { showOutstanding = false },
                // #496: both rows open "Chưa lấy đồ"; the sheet closes first
                onOpenNotPickedUp = {
                    showOutstanding = false
                    onOpenNotPickedUp()
                },
            )
        }
    }
    if (showPicker) {
        AppDateRangePickerSheet(
            title = stringResource(R.string.overview_v2_period_custom),
            subtitle = stringResource(R.string.overview_v2_period_title),
            startLabel = stringResource(R.string.overview_v2_from),
            endLabel = stringResource(R.string.overview_v2_to),
            initialStart = range.start,
            initialEnd = range.end,
            onDismiss = { showPicker = false },
            onConfirm = { start, end ->
                showPicker = false
                viewModel.select(OverviewPeriod.Custom(if (start <= end) DayRange(start, end) else DayRange(end, start)))
            },
            maxDate = today,
        )
    }
}

@Composable
private fun RevenueSection(
    report: OverviewReport?,
    loading: Boolean,
    error: String?,
    range: DayRange,
    chart: OverviewChart,
    onChart: (OverviewChart) -> Unit,
    onDetails: () -> Unit,
    /** #494: opens the "Còn phải thu" sheet; the tile is clickable only when the API sends the breakdown */
    onOutstanding: () -> Unit,
    onRetry: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 2.dp, bottom = 16.dp)) {
        // #492 (board Tong-quan): the hero is the value of the new orders; an older API without it keeps "Thực thu"
        val orderValue = report?.totalOrderValue
        Text(
            "${stringResource(if (report != null && orderValue == null) R.string.overview_v2_collected else R.string.overview_v2_new_order_value)} · ${longRange(range)}",
            fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
            modifier = Modifier.padding(top = 12.dp, bottom = 2.dp),
        )
        when {
            report != null -> {
                val cancelled = stringResource(R.string.overview_v2_excludes_cancelled)
                if (orderValue != null) {
                    Text(formatMoneyVnd(orderValue), fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1)
                    val growth = report.orderValueGrowth?.growth
                    val previous = stringResource(R.string.overview_v2_vs_previous_period)
                    // #719: how many new orders make up the value (rent + sale, cancelled left out)
                    val orders = report.orderValueOrders?.let { stringResource(R.string.overview_v2_new_orders_count, it) }
                    Text(
                        buildAnnotatedString {
                            if (orders != null) {
                                withStyle(SpanStyle(color = DS.Colors.Text, fontWeight = FontWeight.SemiBold)) { append(orders) }
                                append(" · ")
                            }
                            if (growth != null) {
                                withStyle(SpanStyle(color = growthColor(growth))) { append("${OverviewLogic.changeText(growth)} $previous") }
                                append(" · ")
                            }
                            append(cancelled)
                        },
                        fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                    )
                } else {
                    // Older API: the previous hero, "Thực thu" and its growth; the amount still opens the detail
                    val collectedDescription = stringResource(R.string.overview_v2_collected_tile_accessibility, formatMoneyVnd(report.netRevenue))
                    Text(
                        formatMoneyVnd(report.netRevenue), fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1,
                        modifier = Modifier.clickable(onClick = onDetails).semantics { contentDescription = collectedDescription },
                    )
                    val growth = report.revenueGrowth
                    val previous = stringResource(R.string.overview_v2_vs_previous, OverviewLogic.shortRange(OverviewLogic.previous(range)))
                    Text(
                        if (growth != null) "${OverviewLogic.changeText(growth)} $previous · $cancelled" else cancelled,
                        fontSize = DS.TextSize.Secondary,
                        color = if (growth == null) DS.Colors.TextMuted else growthColor(growth),
                    )
                }
                // #492: "Thực thu" (opens the detail sheet) and "Còn phải thu", side by side
                val tiles = buildList {
                    if (orderValue != null) {
                        add(
                            TileData(
                                stringResource(R.string.overview_v2_collected), formatMoneyVnd(report.netRevenue), DS.Colors.Text,
                                sub = stringResource(R.string.overview_v2_collected_excludes_collateral),
                                onClick = onDetails,
                                description = stringResource(R.string.overview_v2_collected_tile_accessibility, formatMoneyVnd(report.netRevenue)),
                            ),
                        )
                    }
                    report.outstanding?.let {
                        val clickable = report.outstandingBreakdown != null
                        add(
                            TileData(
                                stringResource(R.string.overview_v2_outstanding), formatMoneyVnd(it), OutstandingAmber,
                                sub = stringResource(R.string.overview_v2_outstanding_sub),
                                onClick = if (clickable) onOutstanding else null,
                                description = if (clickable) stringResource(R.string.overview_v2_outstanding_tile_accessibility, formatMoneyVnd(it)) else null,
                            ),
                        )
                    }
                }
                if (tiles.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        tiles.forEach { tile -> MoneyTile(tile, Modifier.weight(1f).fillMaxHeight()) }
                        if (tiles.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                Spacer(Modifier.height(12.dp))
                V2Segmented(
                    titles = listOf(stringResource(R.string.overview_v2_chart_money), stringResource(R.string.overview_v2_chart_orders)),
                    selected = chart.ordinal,
                    onSelect = { onChart(OverviewChart.entries[it]) },
                )
                Spacer(Modifier.height(12.dp))
                val bars = OverviewLogic.bars(report, range, chart) { date -> dayLabel(date).substringBefore(' ') }
                Bars(
                    bars, Modifier.fillMaxWidth().height(110.dp),
                    stringResource(if (chart == OverviewChart.ORDERS) R.string.overview_v2_bars_orders else R.string.overview_v2_bars),
                )
            }
            error != null -> {
                Text("—", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                Text(
                    error.ifBlank { stringResource(R.string.calendar_v2_error) } + " · " + stringResource(R.string.retry),
                    fontSize = DS.TextSize.Secondary, color = V2Colors.Danger, modifier = Modifier.clickable(onClick = onRetry),
                )
            }
            loading -> Box(Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(28.dp))
            }
        }
    }
}

@Composable
private fun Bars(bars: List<OverviewBar>, modifier: Modifier, description: String) {
    val ratios = OverviewLogic.barRatios(bars)
    val labelEvery = if (bars.size <= 7) 1 else maxOf(1, (bars.size + 5) / 6)
    val gap = when {
        bars.size <= 7 -> 8.dp
        bars.size <= 14 -> 4.dp
        else -> 2.dp
    }
    Row(modifier.semantics { contentDescription = description }, horizontalArrangement = Arrangement.spacedBy(gap)) {
        bars.forEachIndexed { index, bar ->
            val last = index == bars.lastIndex
            Column(Modifier.weight(1f).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(ratios[index].coerceAtLeast(0.02).toFloat())
                            .clip(RoundedCornerShape(topStart = 5.dp, topEnd = 5.dp, bottomStart = 2.dp, bottomEnd = 2.dp))
                            .background(if (last) DS.Colors.Primary else Color(0xFFBFDBFE)),
                    )
                }
                Spacer(Modifier.height(6.dp))
                // Labels are wider than thin bars: the first grows right, the last grows left, the others both ways
                val labelAlign = when {
                    bars.size <= 7 -> Alignment.CenterHorizontally
                    index == 0 -> Alignment.Start
                    last -> Alignment.End
                    else -> Alignment.CenterHorizontally
                }
                Text(
                    if (last || (index % labelEvery == 0 && bars.lastIndex - index >= (labelEvery + 1) / 2)) bar.label else "",
                    modifier = Modifier.fillMaxWidth().wrapContentWidth(align = labelAlign, unbounded = true),
                    fontSize = DS.TextSize.Pill, maxLines = 1, softWrap = false, overflow = TextOverflow.Visible,
                    fontWeight = if (last) FontWeight.Bold else FontWeight.Normal,
                    color = if (last) DS.Colors.Text else DS.Colors.TextMuted,
                )
            }
        }
    }
}

private val OutstandingAmber = Color(0xFFB45309)

/** Green when up, red when down, muted around 0 */
private fun growthColor(growth: Double): Color = when {
    growth > 0.05 -> V2Colors.Ok
    growth < -0.05 -> V2Colors.Danger
    else -> DS.Colors.TextMuted
}

private data class TileData(
    val title: String,
    val value: String,
    val color: Color,
    val sub: String? = null,
    val onClick: (() -> Unit)? = null,
    /** Spoken instead of the merged texts when set */
    val description: String? = null,
)

@Composable
private fun MoneyTile(tile: TileData, modifier: Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(12.dp)).background(V2Colors.Section)
            .then(tile.onClick?.let { Modifier.clickable(onClick = it) } ?: Modifier)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics(mergeDescendants = true) { tile.description?.let { contentDescription = it } },
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(tile.title, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(tile.value, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = tile.color, maxLines = 1)
        tile.sub?.let { Text(it, fontSize = DS.TextSize.Pill, lineHeight = 16.sp, color = DS.Colors.TextMuted) }
    }
}

/** One label / amount line of the detail sheet; amounts are right-aligned with tabular figures */
@Composable
private fun AmountRow(label: String, amount: String, color: Color = DS.Colors.Text, bold: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp).semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val weight = if (bold) FontWeight.Bold else FontWeight.Normal
        Text(label, fontSize = DS.TextSize.Body, fontWeight = weight, color = DS.Colors.Text, modifier = Modifier.weight(1f))
        Text(
            amount, fontSize = if (bold) DS.TextSize.Name else DS.TextSize.Body,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold, color = color, textAlign = TextAlign.End,
            style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
        )
    }
}

/**
 * #492 "Thực thu" detail (board Tong-quan-giai-thich): what the amount is made of, the collateral it leaves out,
 * and what the two other tiles mean. An older API sends no breakdown: only the total and the texts.
 */
@Composable
private fun CollectedDetailSheet(report: OverviewReport, collateralHeld: Double?, periodTitle: String, onClose: () -> Unit) {
    val breakdown: CollectedBreakdown? = report.collectedBreakdown
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SheetTitle("${stringResource(R.string.overview_v2_collected)} · $periodTitle")
        Text(stringResource(R.string.overview_v2_info_body), fontSize = DS.TextSize.Body, lineHeight = 22.sp, color = Color(0xFF334155))
        Column {
            if (breakdown != null) {
                AmountRow(stringResource(R.string.overview_v2_info_deposit), "+" + formatMoneyVnd(breakdown.deposits))
                ThinDivider()
                AmountRow(stringResource(R.string.overview_v2_info_remaining), "+" + formatMoneyVnd(breakdown.pickupAndSale))
                ThinDivider()
                AmountRow(stringResource(R.string.overview_v2_info_fees), "+" + formatMoneyVnd(breakdown.fees))
                ThinDivider()
                if (breakdown.refunds > 0) {
                    AmountRow(stringResource(R.string.overview_v2_info_cancelled), "−" + formatMoneyVnd(breakdown.refunds), OutstandingAmber)
                    ThinDivider()
                }
            }
            AmountRow(stringResource(R.string.overview_v2_collected), formatMoneyVnd(report.netRevenue), bold = true)
        }
        if (collateralHeld != null) {
            Column(
                Modifier.fillMaxWidth().border(1.dp, V2Colors.Line, RoundedCornerShape(12.dp)).padding(horizontal = 14.dp, vertical = 4.dp),
            ) {
                AmountRow(stringResource(R.string.overview_v2_collateral_held), formatMoneyVnd(collateralHeld))
                Text(
                    stringResource(R.string.overview_v2_info_collateral), fontSize = 13.sp, lineHeight = 18.sp, color = DS.Colors.TextMuted,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
            }
        }
        Text(
            stringResource(R.string.overview_v2_info_note), fontSize = DS.TextSize.Secondary, lineHeight = 21.sp, color = DS.Colors.TextMuted,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(V2Colors.Section).padding(12.dp),
        )
        CloseButton(onClose)
    }
}

/** "+3.500.000" / "−1.200.000" */
private fun signedMoney(amount: Double): String = if (Math.round(amount) >= 0) "+" + formatMoneyVnd(amount) else formatMoneyVnd(amount)

/**
 * #494 a figure with a title and an optional sub-line. With [expanded] it shows a chevron (down when open) and the
 * whole row toggles through [onClick].
 */
@Composable
private fun DetailRow(
    title: String,
    sub: String?,
    amount: String,
    amountColor: Color = DS.Colors.Text,
    expanded: Boolean? = null,
    onClick: (() -> Unit)? = null,
) {
    Row(
        Modifier.fillMaxWidth()
            .then(onClick?.let { Modifier.clickable(onClick = it) } ?: Modifier)
            .heightIn(min = 48.dp).padding(vertical = 8.dp)
            .semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            sub?.let { Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted) }
        }
        Text(
            amount, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = amountColor, textAlign = TextAlign.End,
            style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
        )
        if (expanded != null) {
            Icon(
                if (expanded) Icons.Outlined.KeyboardArrowDown else Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp),
            )
        }
    }
}

@Composable
private fun CloseButton(onClose: () -> Unit) {
    Button(
        onClick = onClose,
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp).height(48.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Text, contentColor = Color.White),
    ) {
        Text(stringResource(R.string.close), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SheetTitle(text: String) {
    Text(text, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.semantics { heading() })
}

/**
 * #494 "Tiền thực nhận": all money received in the period, collateral included, split into "Thực thu" (the shop's
 * money) and "Thế chân" (held for the customer). Each part expands to its lines; the box at the bottom shows the
 * collateral still to come, which no figure above counts.
 */
@Composable
private fun ReceivedDetailSheet(
    report: OverviewReport,
    flow: CollateralFlow,
    collateralToReturn: CollateralCount?,
    collateralToCollect: CollateralCount?,
    periodTitle: String,
    onClose: () -> Unit,
) {
    var collectedOpen by remember { mutableStateOf(false) }
    var collateralOpen by remember { mutableStateOf(false) }
    val breakdown = report.collectedBreakdown
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SheetTitle("${stringResource(R.string.overview_v2_received_title)} · $periodTitle")
        // Where the number comes from, in one sentence (same rule as iOS)
        Text(stringResource(R.string.overview_v2_rule_received), fontSize = DS.TextSize.Body, lineHeight = 22.sp, color = Color(0xFF334155))
        Column {
            Text(stringResource(R.string.overview_v2_received_total), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            Text(formatMoneyVnd(flow.totalReceived(report.netRevenue)), fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1)
        }
        Column {
            ThinDivider()
            DetailRow(
                stringResource(R.string.overview_v2_collected), stringResource(R.string.overview_v2_collected_shop),
                formatMoneyVnd(report.netRevenue),
                expanded = if (breakdown != null) collectedOpen else null,
                onClick = if (breakdown != null) ({ collectedOpen = !collectedOpen }) else null,
            )
            if (breakdown != null && collectedOpen) {
                Column(Modifier.padding(start = 16.dp)) {
                    AmountRow(stringResource(R.string.overview_v2_info_deposit), "+" + formatMoneyVnd(breakdown.deposits))
                    AmountRow(stringResource(R.string.overview_v2_info_remaining), "+" + formatMoneyVnd(breakdown.pickupAndSale))
                    AmountRow(stringResource(R.string.overview_v2_info_fees), "+" + formatMoneyVnd(breakdown.fees))
                    if (breakdown.refunds > 0) {
                        AmountRow(stringResource(R.string.overview_v2_info_cancelled), "−" + formatMoneyVnd(breakdown.refunds), V2Colors.Danger)
                    }
                }
            }
            ThinDivider()
            DetailRow(
                stringResource(R.string.overview_v2_collateral), stringResource(R.string.overview_v2_collateral_sub),
                signedMoney(flow.net),
                expanded = collateralOpen,
                onClick = { collateralOpen = !collateralOpen },
            )
            if (collateralOpen) {
                Column(Modifier.padding(start = 16.dp)) {
                    AmountRow(stringResource(R.string.overview_v2_collateral_received), "+" + formatMoneyVnd(flow.received))
                    AmountRow(stringResource(R.string.overview_v2_collateral_returned), "−" + formatMoneyVnd(flow.returned), V2Colors.Danger)
                }
            }
            ThinDivider()
        }
        if (collateralToReturn != null || collateralToCollect != null) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(V2Colors.Section).padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                val upcoming = stringResource(R.string.overview_v2_collateral_upcoming)
                val upcomingNote = stringResource(R.string.overview_v2_collateral_upcoming_note)
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = DS.Colors.Text)) { append(upcoming) }
                        append(" · $upcomingNote")
                    },
                    fontSize = DS.TextSize.Pill, color = DS.Colors.TextMuted,
                )
                collateralToReturn?.let { c ->
                    DetailRow(
                        stringResource(R.string.overview_v2_collateral_to_return),
                        c.orders?.let { stringResource(R.string.overview_v2_collateral_to_return_orders, it) },
                        formatMoneyVnd(c.amount),
                    )
                }
                collateralToCollect?.let { c ->
                    DetailRow(
                        stringResource(R.string.overview_v2_collateral_to_collect),
                        c.orders?.let { stringResource(R.string.overview_v2_collateral_to_collect_orders, it) },
                        formatMoneyVnd(c.amount),
                    )
                }
            }
        }
        CloseButton(onClose)
    }
}

/** #494 "Còn phải thu": the unpaid part of the period's orders, due at pickup or already overdue */
@Composable
private fun OutstandingDetailSheet(
    outstanding: Double?,
    breakdown: OutstandingBreakdown,
    periodTitle: String,
    onClose: () -> Unit,
    onOpenNotPickedUp: () -> Unit,
) {
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SheetTitle("${stringResource(R.string.overview_v2_outstanding)} · $periodTitle")
        Text(stringResource(R.string.overview_v2_outstanding_body), fontSize = DS.TextSize.Body, lineHeight = 22.sp, color = Color(0xFF334155))
        Column {
            ThinDivider()
            DetailRow(
                stringResource(R.string.overview_v2_outstanding_at_pickup),
                stringResource(R.string.overview_v2_outstanding_at_pickup_orders, breakdown.atPickup.orders),
                formatMoneyVnd(breakdown.atPickup.amount),
                expanded = false,
                onClick = onOpenNotPickedUp,
            )
            ThinDivider()
            if (breakdown.overduePickup.orders > 0) {
                DetailRow(
                    stringResource(R.string.overview_v2_outstanding_overdue),
                    stringResource(R.string.overview_v2_outstanding_overdue_orders, breakdown.overduePickup.orders),
                    formatMoneyVnd(breakdown.overduePickup.amount),
                    amountColor = V2Colors.Danger,
                    expanded = false,
                    onClick = onOpenNotPickedUp,
                )
                ThinDivider()
            }
            AmountRow(
                stringResource(R.string.overview_v2_outstanding),
                formatMoneyVnd(outstanding ?: (breakdown.atPickup.amount + breakdown.overduePickup.amount)),
                OutstandingAmber, bold = true,
            )
        }
        CloseButton(onClose)
    }
}

/** #496 kind of the "Quá ngày lấy, khách chưa đến" row (not an `overview-orders` kind) */
private const val NO_SHOWS_KIND = "no-shows"

/** #496 a "Việc hôm nay" row: what is left today, "Đã giao d/t" under it; opens the Orders tab */
@Composable
private fun TodayTaskRow(label: String, sub: String, remaining: Int, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 8.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = DS.TextSize.Body, color = DS.Colors.Text)
            Text(sub, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
        Text(remaining.toString(), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        Chevron()
    }
    ThinDivider()
}

private data class StatRowData(val label: Int, val value: String, val color: Color, val kind: String?)

@Composable
private fun Chevron() {
    Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
}

/** #633 title of a top list, on the overview band and on "Xem tất cả" */
internal fun topTitle(kind: OverviewTopKind): Int = when (kind) {
    OverviewTopKind.PRODUCTS -> R.string.overview_v2_top_rented
    OverviewTopKind.CUSTOMERS -> R.string.overview_v2_top_customers
}

@Composable
private fun ViewAllLink(onClick: () -> Unit) {
    Text(
        stringResource(R.string.overview_v2_view_all),
        fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable(onClick = onClick).padding(horizontal = 6.dp, vertical = 4.dp),
    )
}

private val CustomerBar = Color(0xFF7C3AED)

/**
 * #633 one row of a top list (overview and "Xem tất cả"): rank, a product's photo, name and amount, then a thin bar
 * against the first row and "N lượt thuê" / "N đơn". A row without id is not tappable.
 */
@Composable
internal fun OverviewTopRowItem(row: OverviewTopRow, kind: OverviewTopKind, rank: Int? = null, onClick: (() -> Unit)?) {
    Row(
        Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 6.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        rank?.let {
            Text(
                it.toString(), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted,
                textAlign = TextAlign.Center, modifier = Modifier.size(width = 22.dp, height = 20.dp),
            )
        }
        if (kind == OverviewTopKind.PRODUCTS) ProductThumb(row.image, 44.dp, 10.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    row.name.ifBlank { "—" }, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                )
                Text(formatMoneyVnd(row.amount), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(V2Colors.Line)) {
                    Box(
                        Modifier.fillMaxWidth(row.ratio.toFloat().coerceIn(0f, 1f)).fillMaxHeight().clip(RoundedCornerShape(2.dp))
                            .background(if (kind == OverviewTopKind.PRODUCTS) DS.Colors.Primary else CustomerBar),
                    )
                }
                Text(
                    stringResource(if (kind == OverviewTopKind.PRODUCTS) R.string.overview_v2_rentals else R.string.overview_v2_customer_orders, row.count),
                    fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1,
                )
            }
        }
    }
    ThinDivider()
}

@Composable
private fun PeriodSheet(
    selected: OverviewPeriod,
    today: LocalDate,
    onClose: () -> Unit,
    onSelect: (OverviewPeriod) -> Unit,
    onCustom: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(bottom = 28.dp)) {
        Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.overview_v2_period_title), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
            IconButton(onClick = onClose) {
                Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), tint = DS.Colors.TextMuted, modifier = Modifier.size(DS.Icon.Md))
            }
        }
        ThinDivider()
        OverviewPreset.entries.forEach { preset ->
            val range = OverviewLogic.range(preset, today)
            val checked = selected == OverviewPeriod.Preset(preset)
            Row(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp)
                    .selectable(selected = checked, role = Role.RadioButton) { onSelect(OverviewPeriod.Preset(preset)) }
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(presetTitle(preset), fontSize = if (checked) DS.TextSize.Name else DS.TextSize.Body, color = DS.Colors.Text, fontWeight = if (checked) FontWeight.Bold else FontWeight.Normal)
                    Text(if (range.dayCount == 1) longRange(range) else OverviewLogic.shortRange(range), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
                RadioButton(selected = checked, onClick = null, colors = RadioButtonDefaults.colors(selectedColor = DS.Colors.Primary))
            }
            ThinDivider()
        }
        Row(
            Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable(onClick = onCustom).padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Md))
            val custom = (selected as? OverviewPeriod.Custom)?.let { "  ${OverviewLogic.shortRange(it.range)}" }.orEmpty()
            Text(stringResource(R.string.overview_v2_period_custom) + custom, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
        }
    }
}
