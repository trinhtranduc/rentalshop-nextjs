package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewChip
import com.anyrent.pos.domain.overview.OverviewChipText
import com.anyrent.pos.domain.overview.OverviewCollateralKey
import com.anyrent.pos.domain.overview.OverviewDashLogic
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewNow
import com.anyrent.pos.domain.overview.OverviewRelatedKind
import com.anyrent.pos.domain.overview.OverviewReport
import com.anyrent.pos.domain.overview.OverviewTile
import com.anyrent.pos.domain.overview.OverviewTileChip
import com.anyrent.pos.domain.overview.OverviewTileKind
import com.anyrent.pos.domain.overview.OverviewTopKind
import com.anyrent.pos.domain.overview.OverviewTopRow
import com.anyrent.pos.domain.overview.OverviewWaterfallKey
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.v2.ProductThumb
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.ui.theme.DS
import java.time.LocalDate
import kotlinx.coroutines.flow.drop

private fun dayLabel(date: LocalDate): String = formatDayShort(date)

/** "CN 27/09 – T7 03/10" (one day: "T7 03/10") */
internal fun longRange(range: DayRange): String =
    if (range.start == range.end) dayLabel(range.start) else "${dayLabel(range.start)} – ${dayLabel(range.end)}"

@Composable
private fun chipTitle(chip: OverviewChip): String = stringResource(
    when (chip) {
        OverviewChip.TODAY -> R.string.overview_dash_period_today
        OverviewChip.LAST_7 -> R.string.overview_dash_period_last7
        OverviewChip.THIS_MONTH -> R.string.overview_dash_period_this_month
        OverviewChip.CUSTOM -> R.string.overview_dash_period_custom
    },
)

@Composable
private fun tileTitle(kind: OverviewTileKind): String = stringResource(
    when (kind) {
        OverviewTileKind.ORDER_VALUE -> R.string.overview_dash_kpi_order_value
        OverviewTileKind.COLLECTED -> R.string.overview_dash_kpi_collected
        OverviewTileKind.OUTSTANDING -> R.string.overview_dash_kpi_outstanding
        OverviewTileKind.COLLATERAL -> R.string.overview_dash_kpi_collateral
    },
)

@Composable
private fun chipText(chip: OverviewTileChip): String {
    val count = chip.count ?: 0
    return when (chip.text) {
        OverviewChipText.NEW -> stringResource(R.string.overview_dash_chip_new)
        OverviewChipText.UP -> stringResource(R.string.overview_dash_chip_up, count)
        OverviewChipText.DOWN -> stringResource(R.string.overview_dash_chip_down, count)
        OverviewChipText.OVERDUE -> stringResource(R.string.overview_dash_chip_overdue, count)
        OverviewChipText.WAITING -> stringResource(R.string.overview_dash_chip_waiting, count)
        OverviewChipText.HELD -> stringResource(R.string.overview_dash_chip_held, count)
        OverviewChipText.NEW_ORDERS -> stringResource(R.string.overview_dash_chip_new_orders, count)
    }
}

@Composable
private fun ordersText(count: Int): String = pluralStringResource(R.plurals.overview_dash_orders, count, count)

/** The list behind each tile (#722 route `overview-related`) */
private fun relatedKind(kind: OverviewTileKind): OverviewRelatedKind = when (kind) {
    OverviewTileKind.ORDER_VALUE -> OverviewRelatedKind.ORDER_VALUE
    OverviewTileKind.COLLECTED -> OverviewRelatedKind.COLLECTED
    OverviewTileKind.OUTSTANDING -> OverviewRelatedKind.OUTSTANDING
    OverviewTileKind.COLLATERAL -> OverviewRelatedKind.COLLATERAL
}

/**
 * Overview tab (#374), drawn as iOS draws it (#725, iOS `OverviewV2ViewController` #616): header with the range, period
 * chips, four tiles that open their sheet, "Thực thu theo ngày", the Hôm nay card, Top sản phẩm / Top khách hàng.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewV2Screen(
    viewModel: OverviewV2ViewModel = viewModel(factory = OverviewV2ViewModel.Factory()),
    /** #388: (product id, start, end) */
    onOpenProduct: (Int, String, String) -> Unit = { _, _, _ -> },
    /** #633: (customer id, start, end), the customer's orders in the period */
    onOpenCustomer: (Int, String, String) -> Unit = { _, _, _ -> },
    /** #633: "Xem tất cả" of a top list: ([OverviewTopKind.key], start, end) */
    onOpenTopAll: (String, String, String) -> Unit = { _, _, _ -> },
    /** "Trễ hạn trả" opens the rented-out list */
    onOpenRentedOut: () -> Unit = {},
    /** "Quá ngày lấy" opens "Chưa lấy đồ" */
    onOpenNotPickedUp: () -> Unit = {},
    /** "Cần giao" / "Cần nhận trả" open the Orders tab */
    onOpenOrdersTab: () -> Unit = {},
    /** #722: "Xem các đơn liên quan" of a tile: ([OverviewRelatedKind.key], start, end) */
    onOpenRelated: (String, String, String) -> Unit = { _, _, _ -> },
) {
    val state by viewModel.state.collectAsState()
    // #674: back on screen or an order changed: quiet reload only when dirty or 10 minutes old
    LaunchedEffect(Unit) { viewModel.onShown() }
    LaunchedEffect(Unit) { OrdersChanged.version.drop(1).collect { viewModel.onShown() } }
    var sheet by remember { mutableStateOf<OverviewTileKind?>(null) }
    var showPicker by remember { mutableStateOf(false) }
    val today = viewModel.today()
    val range = viewModel.range(state)
    val chartRange = OverviewDashLogic.chartRange(state.chip, range)
    val vietnamese = LocalConfiguration.current.locales[0].language == "vi"
    val periodTitle = if (state.chip == OverviewChip.CUSTOM) OverviewLogic.shortRange(range) else chipTitle(state.chip)
    val report = state.report
    val failed = state.reportError != null && !state.loading
    val start = range.start.toString()
    val end = range.end.toString()

    PullToRefreshBox(
        isRefreshing = state.refreshing, onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize().background(OV.Page),
    ) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    stringResource(R.string.overview_v2_title), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = OV.Ink,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    longRange(range), fontSize = DS.TextSize.Secondary, color = OV.Muted, textAlign = TextAlign.End, maxLines = 1,
                    overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(bottom = 3.dp),
                )
            }
            if (state.showsRevenue) {
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).heightIn(min = DS.TouchTarget).padding(bottom = 0.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OverviewChip.entries.forEach { chip ->
                        val title = if (chip == OverviewChip.CUSTOM && state.chip == OverviewChip.CUSTOM) OverviewLogic.shortRange(range) else chipTitle(chip)
                        OVChipButton(title, chip == state.chip) {
                            when {
                                chip == OverviewChip.CUSTOM -> showPicker = true
                                chip != state.chip -> viewModel.select(chip)
                            }
                        }
                    }
                }
            }
            if (state.showsRevenue) {
                if (failed) {
                    OVCard {
                        Text(
                            state.reportError.orEmpty().ifBlank { stringResource(R.string.calendar_v2_error) } + " · " + stringResource(R.string.retry),
                            fontSize = DS.TextSize.Secondary, color = OV.Red,
                            modifier = Modifier.fillMaxWidth().clickable(role = Role.Button) { viewModel.load() },
                        )
                    }
                } else {
                    TilesGrid(report, state.now, state.loading, today, vietnamese) { kind -> if (report != null && !state.loading) sheet = kind }
                }
                ChartCard(state.chartReport, state.loading, failed, chartRange, today)
            }
            // #620: the Hôm nay counters belong to today only
            if (state.showsOperations && OverviewDashLogic.showsTodayCard(range, today)) {
                TodayCard(state.now, state.loading, onOpenOrdersTab, onOpenRentedOut, onOpenNotPickedUp)
            }
            if (state.showsRevenue && !failed) {
                OverviewTopKind.entries.forEach { kind ->
                    TopCard(
                        kind, report, state.loading, vietnamese,
                        onViewAll = { onOpenTopAll(kind.key, start, end) },
                        onOpen = { id -> (if (kind == OverviewTopKind.PRODUCTS) onOpenProduct else onOpenCustomer)(id, start, end) },
                    )
                }
            }
            if (!state.showsRevenue && !state.showsOperations) {
                Text(
                    stringResource(R.string.overview_v2_no_access), color = OV.Muted, fontSize = DS.TextSize.Body,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(24.dp),
                )
            }
        }
    }

    val open = sheet
    if (open != null && report != null) {
        ModalBottomSheet(
            onDismissRequest = { sheet = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = OV.Surface,
        ) {
            DetailSheet(
                kind = open, periodTitle = periodTitle, report = report, now = state.now,
                onClose = { sheet = null },
                onOpenOrders = {
                    sheet = null
                    onOpenRelated(relatedKind(open).key, start, end)
                },
            )
        }
    }
    if (showPicker) {
        AppDateRangePickerSheet(
            title = stringResource(R.string.overview_dash_period_custom),
            subtitle = stringResource(R.string.overview_v2_period_title),
            startLabel = stringResource(R.string.overview_v2_from),
            endLabel = stringResource(R.string.overview_v2_to),
            initialStart = range.start,
            initialEnd = range.end,
            onDismiss = { showPicker = false },
            onConfirm = { a, b ->
                showPicker = false
                viewModel.select(OverviewChip.CUSTOM, DayRange(a, b))
            },
            // #612: up to a year ahead
            maxDate = OverviewDashLogic.customMaxDay(today),
        )
    }
}

@Composable
private fun TilesGrid(
    report: OverviewReport?,
    now: OverviewNow?,
    loading: Boolean,
    today: LocalDate,
    vietnamese: Boolean,
    onTap: (OverviewTileKind) -> Unit,
) {
    val tiles = OverviewDashLogic.tiles(report, now)
    val forecast = OverviewDashLogic.forecast(report?.netRevenue, report?.series.orEmpty(), today)
    val showsLoading = loading || report == null
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        tiles.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                pair.forEach { tile -> Tile(tile, forecast.takeIf { tile.kind == OverviewTileKind.COLLECTED }, showsLoading, today, vietnamese, onTap) }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.Tile(
    tile: OverviewTile,
    forecast: com.anyrent.pos.domain.overview.OverviewForecast?,
    loading: Boolean,
    today: LocalDate,
    vietnamese: Boolean,
    onTap: (OverviewTileKind) -> Unit,
) {
    val title = tileTitle(tile.kind)
    val value = OverviewDashLogic.tileText(tile, vietnamese)
    val forecastText = forecast?.let {
        val amount = OverviewDashLogic.compact(it.forecast, vietnamese)
        if (it.until == today.toString()) stringResource(R.string.overview_dash_forecast_today, amount)
        else stringResource(R.string.overview_dash_forecast_until, amount, OverviewLogic.dayMonth(LocalDate.parse(it.until)))
    }
    val pills = listOfNotNull(tile.chip, tile.count).map { chipText(it) to it.tone }
    val description = listOfNotNull(title, value.takeIf { !loading }, forecastText, *pills.map { it.first }.toTypedArray(), stringResource(R.string.overview_dash_open_detail))
        .joinToString(", ")
    OVTile(title, value, loading, forecast, forecastText, pills, description, Modifier.weight(1f).fillMaxHeight()) { onTap(tile.kind) }
}

@Composable
private fun ChartCard(source: OverviewReport?, loading: Boolean, failed: Boolean, chartRange: DayRange, today: LocalDate) {
    OVCard {
        val bars = if (source != null && !loading) OverviewDashLogic.chartBars(source, chartRange, today) else null
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.overview_dash_chart_title), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink,
                modifier = Modifier.weight(1f).semantics { heading() }, maxLines = 1,
            )
            if (bars != null && bars.any { it.forecast > 0 }) {
                OVLegend(stringResource(R.string.overview_dash_chart_collected), hatched = false)
                OVLegend(stringResource(R.string.overview_dash_chart_forecast), hatched = true)
            }
        }
        when {
            bars != null && bars.all { it.value == 0.0 && it.forecast == 0.0 } -> Box(Modifier.fillMaxWidth().heightIn(min = 120.dp), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.overview_dash_chart_empty), fontSize = DS.TextSize.Secondary, color = OV.Muted, textAlign = TextAlign.Center)
            }
            bars != null -> OVDayChart(
                bars,
                todayText = stringResource(R.string.overview_dash_chart_today),
                collectedText = stringResource(R.string.overview_dash_chart_collected),
                forecastText = stringResource(R.string.overview_dash_chart_forecast),
                totalText = stringResource(R.string.overview_dash_chart_total),
                label = { bar -> if (bar.isDay) formatDayShort(LocalDate.parse(bar.key)) else bar.key },
                axis = { bar -> if (bar.isDay) OverviewLogic.dayMonth(LocalDate.parse(bar.key)) else bar.key },
            )
            failed -> Text("—", fontSize = DS.TextSize.Body, color = OV.Muted)
            else -> Box(Modifier.fillMaxWidth().height(190.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
            }
        }
    }
}

@Composable
private fun TodayCard(now: OverviewNow?, loading: Boolean, onOrdersTab: () -> Unit, onLate: () -> Unit, onNoShows: () -> Unit) {
    OVCard {
        Text(
            stringResource(R.string.overview_dash_today_title), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink,
            modifier = Modifier.semantics { heading() },
        )
        val tasks = OverviewDashLogic.todayTasks(now)
        if (now == null || tasks == null) {
            if (loading) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
            else Text("—", fontSize = DS.TextSize.Body, color = OV.Muted)
            return@OVCard
        }
        val (pickups, returns) = tasks
        val late = now.lateReturns
        val noShows = now.noShows ?: 0
        val pickupTitle = stringResource(R.string.overview_dash_today_pickups)
        val returnTitle = stringResource(R.string.overview_dash_today_returns)
        val lateTitle = stringResource(R.string.overview_dash_today_overdue)
        val noShowTitle = stringResource(R.string.overview_dash_today_no_shows)
        val pickupsDone = stringResource(R.string.overview_v2_pickups_done, pickups.done, pickups.total)
        val returnsDone = stringResource(R.string.overview_v2_returns_done, returns.done, returns.total)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OVCounter(pickupTitle, OverviewDashLogic.doneOfTotal(pickups), OV.Ink, OV.Blue, "$pickupTitle: $pickupsDone", Modifier.weight(1f).fillMaxHeight(), onOrdersTab)
                OVCounter(returnTitle, OverviewDashLogic.doneOfTotal(returns), OV.Ink, OV.Violet, "$returnTitle: $returnsDone", Modifier.weight(1f).fillMaxHeight(), onOrdersTab)
            }
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OVCounter(lateTitle, "$late", if (late > 0) OV.Red else OV.Ink, OV.Red, "$lateTitle: $late", Modifier.weight(1f).fillMaxHeight(), onLate)
                OVCounter(noShowTitle, "$noShows", if (noShows > 0) OV.Amber else OV.Ink, OV.Amber, "$noShowTitle: $noShows", Modifier.weight(1f).fillMaxHeight(), onNoShows)
            }
        }
        now.tomorrow?.let {
            Text(stringResource(R.string.overview_dash_today_tomorrow, it.pickups, it.returns), fontSize = DS.TextSize.Pill, color = OV.Muted)
        }
    }
}

@Composable
private fun TopCard(
    kind: OverviewTopKind,
    report: OverviewReport?,
    loading: Boolean,
    vietnamese: Boolean,
    onViewAll: () -> Unit,
    onOpen: (Int) -> Unit,
) {
    val products = kind == OverviewTopKind.PRODUCTS
    val title = stringResource(if (products) R.string.overview_dash_top_products else R.string.overview_dash_top_customers)
    val rows = report?.takeIf { !loading }?.let { OverviewLogic.topRows(it, kind) }
    OVCard(spacing = if (rows.isNullOrEmpty()) 10 else 4) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink, modifier = Modifier.weight(1f).semantics { heading() })
            if (!rows.isNullOrEmpty()) {
                Text(
                    stringResource(R.string.overview_dash_top_view_all), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = OV.Blue,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable(role = Role.Button, onClick = onViewAll).padding(horizontal = 4.dp, vertical = 6.dp),
                )
            }
        }
        when {
            rows == null -> CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
            rows.isEmpty() -> Text(stringResource(R.string.overview_dash_top_empty), fontSize = DS.TextSize.Secondary, color = OV.Muted)
            else -> rows.forEach { row ->
                val subtitle = pluralStringResource(if (products) R.plurals.overview_dash_top_rentals else R.plurals.overview_dash_orders, row.count, row.count)
                OVTopRow(
                    row.name, OverviewDashLogic.compact(row.amount, vietnamese), subtitle, row.ratio, if (products) OV.Blue else OV.Violet,
                    onClick = row.id?.let { id -> { onOpen(id) } },
                )
            }
        }
    }
}

// Detail sheet (iOS `OverviewDetailSheet`)

@Composable
private fun DetailSheet(
    kind: OverviewTileKind,
    periodTitle: String,
    report: OverviewReport,
    now: OverviewNow?,
    onClose: () -> Unit,
    onOpenOrders: () -> Unit,
) {
    val tile = OverviewDashLogic.tiles(report, now).first { it.kind == kind }
    val value = OverviewDashLogic.tileText(tile, vietnamese = true, compact = false)
    val title = tileTitle(kind)
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 18.dp, end = 18.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f).semantics(mergeDescendants = true) { heading() }, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("$title · $periodTitle", fontSize = DS.TextSize.Secondary, color = OV.Ink2)
                Text(value, fontSize = 26.sp, fontWeight = FontWeight.Bold, color = OV.Ink, maxLines = 1)
            }
            val close = stringResource(R.string.overview_dash_detail_close)
            Box(
                Modifier.size(DS.TouchTarget).clip(RoundedCornerShape(12.dp)).background(OV.Track)
                    .clickable(role = Role.Button, onClick = onClose).semantics { contentDescription = close },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Close, contentDescription = null, tint = OV.Ink, modifier = Modifier.size(20.dp))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                stringResource(
                    when (kind) {
                        OverviewTileKind.ORDER_VALUE -> R.string.overview_dash_rule_order_value
                        OverviewTileKind.COLLECTED -> R.string.overview_dash_rule_collected
                        OverviewTileKind.OUTSTANDING -> R.string.overview_dash_rule_outstanding
                        OverviewTileKind.COLLATERAL -> R.string.overview_dash_rule_collateral
                    },
                ),
                fontSize = DS.TextSize.Secondary, color = OV.Ink2,
            )
            when (kind) {
                OverviewTileKind.ORDER_VALUE -> OrderValueBody(report)
                OverviewTileKind.COLLECTED -> CollectedBody(report)
                OverviewTileKind.OUTSTANDING -> OutstandingBody(report)
                OverviewTileKind.COLLATERAL -> CollateralBody(report, now)
            }
        }
        Text(
            stringResource(R.string.overview_dash_detail_view_orders), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = OV.Link,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable(role = Role.Button, onClick = onOpenOrders).heightIn(min = DS.TouchTarget).padding(vertical = 12.dp),
        )
    }
}

@Composable
private fun EmptyBody() = Text(stringResource(R.string.overview_dash_detail_empty), fontSize = DS.TextSize.Secondary, color = OV.Muted)

@Composable
private fun OrderValueBody(report: OverviewReport) {
    // #716: the orders behind the money (created in the period, cancelled left out), not orderCounts.new
    val count = report.orderValueOrders ?: report.newOrders
    OVLegendRow(
        OV.Ink, stringResource(R.string.overview_dash_detail_new_orders), count?.let { ordersText(it) } ?: "—",
        report.totalOrderValue?.let(OverviewDashLogic::money) ?: "—",
    )
    report.orderValueByType?.let { split ->
        val (rent, sale) = OverviewDashLogic.split(split.rent, split.sale)
        OVStackedBar(listOf(rent.share to OV.Blue, sale.share to OV.Violet))
        OVLegendRow(OV.Blue, stringResource(R.string.overview_dash_detail_rent), ordersText(rent.orders), OverviewDashLogic.money(rent.amount))
        OVLegendRow(OV.Violet, stringResource(R.string.overview_dash_detail_sale), ordersText(sale.orders), OverviewDashLogic.money(sale.amount))
    }
    OverviewDashLogic.growthChip(report.orderValueGrowth?.growth)?.let { chip ->
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            OVPill(chipText(chip), chip.tone)
            Text(stringResource(R.string.overview_dash_vs_previous_period), fontSize = DS.TextSize.Pill, color = OV.Muted)
        }
    }
}

@Composable
private fun CollectedBody(report: OverviewReport) {
    val parts = report.collectedBreakdown ?: return EmptyBody()
    // #708: with cashCollected the rows end with collateral received − handed back, so they add up to the tile
    val collateral = if (report.cashCollected != null) report.collateralFlow?.net else null
    val total = if (collateral != null) report.cashCollected ?: report.netRevenue else report.netRevenue
    OverviewDashLogic.waterfall(parts, total, collateral).forEach { row ->
        val name = stringResource(
            when (row.key) {
                OverviewWaterfallKey.DEPOSITS -> R.string.overview_dash_money_deposits
                OverviewWaterfallKey.PICKUP_AND_SALE -> R.string.overview_dash_money_pickup_and_sale
                OverviewWaterfallKey.FEES -> R.string.overview_dash_money_fees
                OverviewWaterfallKey.REFUNDS -> R.string.overview_dash_money_refunds
                OverviewWaterfallKey.COLLATERAL -> R.string.overview_dash_money_collateral_net
                OverviewWaterfallKey.TOTAL -> R.string.overview_dash_kpi_collected
            },
        )
        val color = if (row.isTotal) OV.Total else if (row.amount < 0) OV.Red else OV.Blue
        val value = if (row.isTotal) OverviewDashLogic.money(row.amount) else OverviewDashLogic.signedMoney(row.amount)
        OVBarRow(name, null, value, row.isTotal) { OVTrackBar(row.left, row.width, color, false, it) }
    }
}

@Composable
private fun OutstandingBody(report: OverviewReport) {
    val parts = report.outstandingBreakdown ?: return EmptyBody()
    val (atPickup, overdue) = OverviewDashLogic.split(parts.atPickup, parts.overduePickup)
    OVStackedBar(listOf(atPickup.share to OV.Blue, overdue.share to OV.Amber))
    OVLegendRow(OV.Blue, stringResource(R.string.overview_dash_money_at_pickup), ordersText(atPickup.orders), OverviewDashLogic.money(atPickup.amount))
    OVLegendRow(OV.Amber, stringResource(R.string.overview_dash_money_overdue_pickup), ordersText(overdue.orders), OverviewDashLogic.money(overdue.amount))
}

@Composable
private fun CollateralBody(report: OverviewReport, now: OverviewNow?) {
    val rows = OverviewDashLogic.collateralRows(report.collateralFlow, now)
    if (rows.isEmpty()) return EmptyBody()
    rows.forEach { row ->
        val name = stringResource(
            when (row.key) {
                OverviewCollateralKey.RECEIVED -> R.string.overview_dash_detail_received
                OverviewCollateralKey.RETURNED -> R.string.overview_dash_detail_returned
                OverviewCollateralKey.TO_COLLECT -> R.string.overview_dash_detail_to_collect
                OverviewCollateralKey.TO_RETURN -> R.string.overview_dash_detail_to_return
            },
        )
        val color = if (row.key == OverviewCollateralKey.RECEIVED || row.key == OverviewCollateralKey.TO_COLLECT) OV.Green else OV.Violet
        OVBarRow(name, row.orders?.let { ordersText(it) }, OverviewDashLogic.money(row.amount), false) {
            OVTrackBar(0.0, row.width, color, row.upcoming, it)
        }
    }
    if (rows.any { it.upcoming }) {
        Text(stringResource(R.string.overview_dash_detail_hatch_note), fontSize = DS.TextSize.Pill, color = OV.Muted)
    }
}

// "Xem tất cả" (#633) keeps its own rows

/** #633 title of a top list on "Xem tất cả" */
internal fun topTitle(kind: OverviewTopKind): Int = when (kind) {
    OverviewTopKind.PRODUCTS -> R.string.overview_v2_top_rented
    OverviewTopKind.CUSTOMERS -> R.string.overview_v2_top_customers
}

private val CustomerBar = Color(0xFF7C3AED)

/**
 * #633 one row of "Xem tất cả": rank, a product's photo, name and amount, then a thin bar against the first row and
 * "N lượt thuê" / "N đơn". A row without id is not tappable.
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
