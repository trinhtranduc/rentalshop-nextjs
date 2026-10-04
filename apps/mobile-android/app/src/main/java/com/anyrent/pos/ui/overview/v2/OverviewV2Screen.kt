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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewBar
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewPeriod
import com.anyrent.pos.domain.overview.OverviewPreset
import com.anyrent.pos.domain.overview.OverviewReport
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.v2.ProductThumb
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS
import java.time.LocalDate
import java.time.ZoneId

private fun dayLabel(date: LocalDate): String =
    formatDayShort(date.atStartOfDay(ZoneId.systemDefault()).plusHours(12).toInstant())

/** "CN 27/09 – T7 03/10" (one day: "T7 03/10") */
private fun longRange(range: DayRange): String =
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
fun OverviewV2Screen(viewModel: OverviewV2ViewModel = viewModel(factory = OverviewV2ViewModel.Factory())) {
    val state by viewModel.state.collectAsState()
    var showSheet by remember { mutableStateOf(false) }
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
            Text(stringResource(R.string.overview_v2_title), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
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
                    Text(periodTitle, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                }
            }
        }
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = viewModel::refresh, modifier = Modifier.fillMaxSize()) {
            LazyColumn(Modifier.fillMaxSize()) {
                if (state.showsRevenue) {
                    item(key = "revenue") {
                        Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
                        RevenueSection(state.report, state.loading, state.reportError, range, onRetry = viewModel::load)
                    }
                }
                val stats = buildList {
                    state.report?.newOrders?.takeIf { state.showsRevenue }?.let { add(Triple(R.string.overview_v2_new_orders, it.toString(), DS.Colors.Text)) }
                    state.now?.rentedOut?.let { add(Triple(R.string.overview_v2_rented_out, it.toString(), DS.Colors.Text)) }
                    state.now?.takeIf { state.showsOperations }?.let {
                        add(Triple(R.string.overview_v2_late_returns, it.lateReturns.toString(), if (it.lateReturns > 0) V2Colors.Danger else DS.Colors.Text))
                    }
                    state.now?.collateralHeld?.let { add(Triple(R.string.overview_v2_collateral_held, formatMoneyVnd(it), DS.Colors.Text)) }
                }
                if (stats.isNotEmpty()) {
                    item(key = "orders-band") { SectionBand(stringResource(R.string.overview_v2_orders)) }
                    items(stats, key = { it.first }) { (label, value, color) ->
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 48.dp).padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(stringResource(label), fontSize = 15.sp, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = color)
                        }
                        ThinDivider()
                    }
                }
                val top = state.report?.topProducts.orEmpty()
                if (state.showsRevenue && top.isNotEmpty()) {
                    item(key = "top-band") { SectionBand(stringResource(R.string.overview_v2_top_rented)) }
                    items(top, key = { "top-${it.id}-${it.name}" }) { TopRow(it) }
                }
                if (!state.showsRevenue && !state.showsOperations) {
                    item(key = "no-access") {
                        Text(
                            stringResource(R.string.overview_v2_no_access), color = DS.Colors.TextMuted, fontSize = 15.sp,
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
private fun RevenueSection(report: OverviewReport?, loading: Boolean, error: String?, range: DayRange, onRetry: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 16.dp)) {
        Text("${stringResource(R.string.overview_v2_net_revenue)} · ${longRange(range)}", fontSize = 13.sp, color = DS.Colors.TextMuted)
        when {
            report != null -> {
                Text(formatMoneyVnd(report.netRevenue), fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                val cancelled = stringResource(R.string.overview_v2_excludes_cancelled)
                val growth = report.revenueGrowth
                val previous = stringResource(R.string.overview_v2_vs_previous, OverviewLogic.shortRange(OverviewLogic.previous(range)))
                Text(
                    if (growth != null) "${OverviewLogic.changeText(growth)} $previous · $cancelled" else cancelled,
                    fontSize = 13.sp,
                    color = when {
                        growth == null -> DS.Colors.TextMuted
                        growth > 0.05 -> V2Colors.Ok
                        growth < -0.05 -> V2Colors.Danger
                        else -> DS.Colors.TextMuted
                    },
                )
                Spacer(Modifier.height(12.dp))
                val bars = OverviewLogic.bars(report, range) { date -> dayLabel(date).substringBefore(' ') }
                Bars(bars, Modifier.fillMaxWidth().height(110.dp))
            }
            error != null -> {
                Text("—", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                Text(
                    error.ifBlank { stringResource(R.string.calendar_v2_error) } + " · " + stringResource(R.string.retry),
                    fontSize = 13.sp, color = V2Colors.Danger, modifier = Modifier.clickable(onClick = onRetry),
                )
            }
            loading -> Box(Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(28.dp))
            }
        }
    }
}

@Composable
private fun Bars(bars: List<OverviewBar>, modifier: Modifier) {
    val ratios = OverviewLogic.barRatios(bars)
    val labelEvery = if (bars.size <= 7) 1 else maxOf(1, (bars.size + 5) / 6)
    val gap = when {
        bars.size <= 7 -> 8.dp
        bars.size <= 14 -> 4.dp
        else -> 2.dp
    }
    val description = stringResource(R.string.overview_v2_bars)
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
                Text(
                    if (index % labelEvery == 0 || last) bar.label else "",
                    fontSize = 11.sp, maxLines = 1, softWrap = false, overflow = TextOverflow.Visible,
                    fontWeight = if (last) FontWeight.Bold else FontWeight.Normal,
                    color = if (last) DS.Colors.Text else DS.Colors.TextMuted,
                )
            }
        }
    }
}

@Composable
private fun TopRow(product: OverviewReport.TopProduct) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProductThumb(product.image, 44.dp, 10.dp)
        Column(Modifier.weight(1f)) {
            Text(product.name, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(stringResource(R.string.overview_v2_rentals, product.rentalCount), fontSize = 13.sp, color = DS.Colors.TextMuted)
        }
        Text(formatMoneyVnd(product.totalRevenue), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
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
                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close), tint = DS.Colors.TextMuted)
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
                    Text(presetTitle(preset), fontSize = 15.sp, color = DS.Colors.Text, fontWeight = if (checked) FontWeight.Bold else FontWeight.Normal)
                    Text(if (range.dayCount == 1) longRange(range) else OverviewLogic.shortRange(range), fontSize = 13.sp, color = DS.Colors.TextMuted)
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
            Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(20.dp))
            val custom = (selected as? OverviewPeriod.Custom)?.let { "  ${OverviewLogic.shortRange(it.range)}" }.orEmpty()
            Text(stringResource(R.string.overview_v2_period_custom) + custom, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
        }
    }
}
