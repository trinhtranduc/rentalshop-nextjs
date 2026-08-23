package com.anyrent.pos.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.model.RankingItem
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatDisplayDate
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSheetHeader
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.RankingCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import androidx.compose.ui.Modifier
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max

/** iOS Define.swift status / deposit tints for Operational Snapshot. */
private val SnapshotReservedTint = Color(0xFFDC2626)
private val SnapshotActiveTint = Color(0xFFC2410C)
private val SnapshotCompletedTint = Color(0xFF166534)
private val SnapshotCancelledTint = Color(0xFF7F1D1D)
private val SnapshotDepositHeldTint = Color(0xFF1D4EFD)
private val SnapshotDepositDueTint = Color(0xFFF19920)

private data class AnalyticsChartPoint(
    val label: String,
    val revenue: Double,
    val orders: Double,
)

private enum class PerformanceMode { REVENUE, GROWTH, ORDERS }

private enum class OverviewPeriod {
    TODAY, D7, D30, D90, D180, ALL, CUSTOM
}

private val OverviewDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

private fun OverviewPeriod.range(customStart: LocalDate?, customEnd: LocalDate?): Pair<LocalDate, LocalDate> {
    val end = LocalDate.now()
    return when (this) {
        OverviewPeriod.TODAY -> end to end
        OverviewPeriod.D7 -> end.minusDays(6) to end
        OverviewPeriod.D30 -> end.minusDays(29) to end
        OverviewPeriod.D90 -> end.minusDays(89) to end
        OverviewPeriod.D180 -> end.minusDays(179) to end
        OverviewPeriod.ALL -> end.minusYears(10) to end
        OverviewPeriod.CUSTOM -> (customStart ?: end) to (customEnd ?: end)
    }
}

@Composable
private fun OverviewPeriod.label(customStart: LocalDate?, customEnd: LocalDate?): String = when (this) {
    OverviewPeriod.TODAY -> stringResource(R.string.period_today)
    OverviewPeriod.D7 -> stringResource(R.string.period_7d)
    OverviewPeriod.D30 -> stringResource(R.string.period_30d)
    OverviewPeriod.D90 -> stringResource(R.string.period_90d)
    OverviewPeriod.D180 -> stringResource(R.string.period_180d)
    OverviewPeriod.ALL -> stringResource(R.string.period_all_time)
    OverviewPeriod.CUSTOM -> if (customStart != null && customEnd != null) {
        "${customStart.format(OverviewDateFormatter)} – ${customEnd.format(OverviewDateFormatter)}"
    } else {
        stringResource(R.string.period_custom)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewScreen(
    onViewProductOrders: (RankingItem) -> Unit = {},
    onViewCustomerOrders: (RankingItem) -> Unit = {},
) {
    var periodOrders by remember { mutableIntStateOf(0) }
    var periodRevenue by remember { mutableStateOf(0.0) }
    var revenueGrowth by remember { mutableStateOf<Double?>(null) }
    var orderGrowth by remember { mutableStateOf<Double?>(null) }
    var reservedOrders by remember { mutableIntStateOf(0) }
    var activeOrders by remember { mutableIntStateOf(0) }
    var completedOrders by remember { mutableIntStateOf(0) }
    var cancelledOrders by remember { mutableIntStateOf(0) }
    var hasOperationalSnapshot by remember { mutableStateOf(false) }
    var depositHeld by remember { mutableDoubleStateOf(0.0) }
    var depositDue by remember { mutableDoubleStateOf(0.0) }
    var topProducts by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var topCustomers by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var period by remember { mutableStateOf(OverviewPeriod.TODAY) }
    var customStart by remember { mutableStateOf<LocalDate?>(null) }
    var customEnd by remember { mutableStateOf<LocalDate?>(null) }
    var showDateSheet by remember { mutableStateOf(false) }
    var refreshTick by remember { mutableIntStateOf(0) }
    var chartPoints by remember { mutableStateOf<List<AnalyticsChartPoint>>(emptyList()) }
    var performanceMode by remember { mutableStateOf(PerformanceMode.REVENUE) }
    val scope = rememberCoroutineScope()
    val (start, end) = remember(period, customStart, customEnd, refreshTick) {
        period.range(customStart, customEnd)
    }

    LaunchedEffect(period, customStart, customEnd, refreshTick) {
        scope.launch {
            loading = true
            error = null

            val periodResult = withContext(Dispatchers.IO) {
                ApiParity.analyticsPeriod(start.toString(), end.toString())
            }
            periodResult.onSuccess { data ->
                chartPoints = parseChartPoints(data)
                val revenue = data.optJSONObject("revenue")
                periodRevenue = revenue?.optDouble("totalActualRevenue")
                    ?.takeIf { !it.isNaN() }
                    ?: revenue?.optDouble("totalRevenue")?.takeIf { !it.isNaN() }
                    ?: 0.0
                periodOrders = revenue?.optInt("totalOrders") ?: 0

                val growth = data.optJSONObject("growth")
                revenueGrowth = growth?.optJSONObject("revenue")
                    ?.optDouble("growth")
                    ?.takeIf { !it.isNaN() }
                orderGrowth = growth?.optJSONObject("orders")
                    ?.optDouble("growth")
                    ?.takeIf { !it.isNaN() }

                val operational = data.optJSONObject("operational")
                val orderCounts = operational?.optJSONObject("orderCounts")
                hasOperationalSnapshot = orderCounts != null
                reservedOrders = orderCounts?.optInt("new") ?: 0
                activeOrders = orderCounts?.optInt("pickup") ?: 0
                completedOrders = orderCounts?.optInt("return") ?: 0
                cancelledOrders = orderCounts?.optInt("cancelled") ?: 0
                depositHeld = operational
                    ?.optDouble("totalCollateral")
                    ?.takeIf { !it.isNaN() }
                    ?: 0.0
                depositDue = operational
                    ?.optDouble("totalCollateralPlanExpectedToRefund")
                    ?.takeIf { !it.isNaN() }
                    ?: operational?.optDouble("totalCollateralPlan")?.takeIf { !it.isNaN() }
                    ?: 0.0

                // Prefer rankings from period (includes product image)
                val products = data.optJSONArray("topProducts")
                val customers = data.optJSONArray("topCustomers")
                if (products != null) {
                    topProducts = ApiClient.get().parseRankingsArray(products)
                }
                if (customers != null) {
                    topCustomers = ApiClient.get().parseRankingsArray(customers)
                }
            }.onFailure {
                hasOperationalSnapshot = false
                depositHeld = 0.0
                depositDue = 0.0
                error = it.message
                if (period == OverviewPeriod.TODAY) {
                    withContext(Dispatchers.IO) { ApiClient.get().todayMetrics() }
                        .onSuccess { today ->
                            periodOrders = today.totalOrders
                            periodRevenue = today.totalRevenue
                            activeOrders = today.activeRentals
                            completedOrders = today.completedOrders
                        }
                }
                // Fallback rankings from legacy overview
                withContext(Dispatchers.IO) {
                    ApiClient.get().analyticsOverview(start.toString(), end.toString())
                }.onSuccess {
                    topProducts = it.first
                    topCustomers = it.second
                }
            }
            loading = false
        }
    }

    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OverviewDatePill(
                    title = period.label(customStart, customEnd),
                    onClick = { showDateSheet = true },
                )
                Spacer(Modifier.weight(1f))
                Surface(
                    onClick = { refreshTick++ },
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = stringResource(R.string.refresh),
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(10.dp).size(20.dp),
                    )
                }
            }
            when {
                loading && periodOrders == 0 && topProducts.isEmpty() -> {
                    Box(Modifier.weight(1f).fillMaxWidth()) { LoadingBox() }
                }
                error != null && periodOrders == 0 && topProducts.isEmpty() -> {
                    Box(Modifier.weight(1f).fillMaxWidth()) { EmptyOrError(error!!) }
                }
                else -> Column(
                Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                AppCard(Modifier.fillMaxWidth()) {
                    val growthValue = when (performanceMode) {
                        PerformanceMode.ORDERS -> orderGrowth
                        else -> revenueGrowth
                    }
                    val heroLabel = when (performanceMode) {
                        PerformanceMode.REVENUE -> stringResource(R.string.period_revenue)
                        PerformanceMode.GROWTH -> stringResource(R.string.growth_percent)
                        PerformanceMode.ORDERS -> stringResource(R.string.period_orders)
                    }
                    val heroValue = when (performanceMode) {
                        PerformanceMode.REVENUE -> formatMoney(periodRevenue)
                        PerformanceMode.GROWTH -> formatGrowthPercent(revenueGrowth)
                        PerformanceMode.ORDERS -> formatQuantity(periodOrders)
                    }
                    val heroColor = when (performanceMode) {
                        PerformanceMode.REVENUE -> MaterialTheme.colorScheme.primary
                        PerformanceMode.GROWTH -> growthTint(revenueGrowth)
                        PerformanceMode.ORDERS -> Color(0xFFF39A1B)
                    }
                    val chartPointsForMode = when (performanceMode) {
                        PerformanceMode.ORDERS -> chartPoints.map { it.orders }
                        else -> chartPoints.map { it.revenue }
                    }
                    val chartColor = when (performanceMode) {
                        PerformanceMode.ORDERS -> Color(0xFFF39A1B)
                        PerformanceMode.GROWTH -> growthTint(revenueGrowth)
                        PerformanceMode.REVENUE -> MaterialTheme.colorScheme.primary
                    }

                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            stringResource(R.string.performance),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            PerformanceMode.REVENUE,
                            PerformanceMode.GROWTH,
                            PerformanceMode.ORDERS,
                        ).forEach { mode ->
                                val label = when (mode) {
                                    PerformanceMode.REVENUE -> stringResource(R.string.revenue)
                                    PerformanceMode.GROWTH -> stringResource(R.string.growth_percent)
                                    PerformanceMode.ORDERS -> stringResource(R.string.period_orders)
                                }
                                val selected = performanceMode == mode
                                Surface(
                                    onClick = { performanceMode = mode },
                                    modifier = Modifier.weight(1f).height(32.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.background
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    border = BorderStroke(
                                        1.5.dp,
                                        if (selected) MaterialTheme.colorScheme.onSurface
                                        else Color.Transparent,
                                    ),
                                ) {
                                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        Text(
                                            label,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                        )
                                    }
                                }
                            }
                        }
                        HeroMetric(
                            heroLabel,
                            heroValue,
                            heroColor,
                            Modifier.fillMaxWidth(),
                            alignment = Alignment.Start,
                        )
                        if (growthValue != null) {
                            Text(
                                if (performanceMode == PerformanceMode.GROWTH) {
                                    stringResource(R.string.vs_previous_period)
                                } else {
                                    "${formatGrowthPercent(growthValue)}  ${stringResource(R.string.vs_previous_period)}"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = growthTint(growthValue),
                            )
                        }
                        AnalyticsLineChart(
                            title = null,
                            points = chartPointsForMode,
                            color = chartColor,
                        )
                        if (period != OverviewPeriod.TODAY) {
                            Text(
                                stringResource(R.string.swipe_charts),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }

                AppCard(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // iOS insight card: gauge icon + title / subtitle
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Icon(
                                Icons.Default.Speed,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 2.dp).size(20.dp),
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(
                                    stringResource(R.string.operational_snapshot),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    stringResource(R.string.operational_snapshot_subtitle),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Row(Modifier.fillMaxWidth()) {
                            SnapshotMetric(
                                label = stringResource(R.string.snapshot_new_rentals),
                                value = snapshotCountText(reservedOrders, hasOperationalSnapshot),
                                tint = SnapshotReservedTint,
                                icon = Icons.Default.Bookmark,
                                modifier = Modifier.weight(1f),
                            )
                            SnapshotMetric(
                                label = stringResource(R.string.in_progress),
                                value = snapshotCountText(activeOrders, hasOperationalSnapshot),
                                tint = SnapshotActiveTint,
                                icon = Icons.AutoMirrored.Filled.DirectionsWalk,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        Row(Modifier.fillMaxWidth()) {
                            SnapshotMetric(
                                label = stringResource(R.string.completed),
                                value = snapshotCountText(completedOrders, hasOperationalSnapshot),
                                tint = SnapshotCompletedTint,
                                icon = Icons.Default.CheckCircle,
                                modifier = Modifier.weight(1f),
                            )
                            SnapshotMetric(
                                label = stringResource(R.string.cancelled),
                                value = snapshotCountText(cancelledOrders, hasOperationalSnapshot),
                                tint = SnapshotCancelledTint,
                                icon = Icons.Default.Cancel,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        // iOS: deposit metrics for Today / 7d / 30d only (hidden for year)
                        if (period == OverviewPeriod.TODAY || period == OverviewPeriod.D7 || period == OverviewPeriod.D30) {
                            Row(Modifier.fillMaxWidth()) {
                                SnapshotMetric(
                                    label = stringResource(R.string.deposit_held),
                                    value = if (hasOperationalSnapshot) formatMoney(depositHeld) else "—",
                                    tint = SnapshotDepositHeldTint,
                                    icon = Icons.Default.Lock,
                                    modifier = Modifier.weight(1f),
                                )
                                SnapshotMetric(
                                    label = stringResource(R.string.deposit_due),
                                    value = if (hasOperationalSnapshot) formatMoney(depositDue) else "—",
                                    tint = SnapshotDepositDueTint,
                                    icon = Icons.AutoMirrored.Filled.Undo,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }

                if (start != end) {
                    RankingCard(
                        title = stringResource(R.string.top_products),
                        subtitle = stringResource(R.string.top_products_subtitle),
                        icon = Icons.Default.Inventory2,
                    ) {
                        if (topProducts.isEmpty()) {
                            Text("—", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            topProducts.take(3).forEachIndexed { index, item ->
                                RankingRow(
                                    index + 1,
                                    item,
                                    MaterialTheme.colorScheme.primary,
                                    showThumbnail = true,
                                    onClick = { onViewProductOrders(item) },
                                )
                                if (index < topProducts.take(3).lastIndex) {
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                }
                            }
                        }
                    }

                    RankingCard(
                        title = stringResource(R.string.top_customers),
                        subtitle = stringResource(R.string.top_customers_subtitle),
                        icon = Icons.Default.Groups,
                    ) {
                        if (topCustomers.isEmpty()) {
                            Text("—", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            topCustomers.take(3).forEachIndexed { index, item ->
                                RankingRow(
                                    index + 1,
                                    item,
                                    Color(0xFFE88A19),
                                    onClick = { onViewCustomerOrders(item) },
                                )
                                if (index < topCustomers.take(3).lastIndex) {
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                }
                            }
                        }
                    }
                }
            }
            }
    }

    if (showDateSheet) {
        OverviewDateFilterSheet(
            selected = period,
            customStart = customStart,
            customEnd = customEnd,
            onDismiss = { showDateSheet = false },
            onConfirm = { next, startDate, endDate ->
                period = next
                customStart = startDate
                customEnd = endDate
                showDateSheet = false
            },
        )
    }
}

private fun parseChartPoints(data: JSONObject): List<AnalyticsChartPoint> {
    val array = data.optJSONArray("series") ?: return emptyList()
    return (0 until array.length()).mapNotNull { index ->
        val item = array.optJSONObject(index) ?: return@mapNotNull null
        val rawLabel = item.optString("day")
            .ifBlank { item.optString("date") }
            .ifBlank { item.optString("month") }
        val formatted = formatDisplayDate(rawLabel.takeIf { it.isNotBlank() })
        AnalyticsChartPoint(
            // Prefer dd/MM/yy when API sends a day; keep month tokens as-is
            label = if (formatted != "N/A") formatted else rawLabel,
            revenue = item.optDouble("realIncome", 0.0) + item.optDouble("futureIncome", 0.0),
            orders = item.optDouble("orderCount", 0.0),
        )
    }
}

@Composable
private fun OverviewDatePill(title: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Default.CalendarMonth,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurface,
            )
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Icon(
                Icons.Default.ExpandMore,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OverviewDateFilterSheet(
    selected: OverviewPeriod,
    customStart: LocalDate?,
    customEnd: LocalDate?,
    onDismiss: () -> Unit,
    onConfirm: (OverviewPeriod, LocalDate?, LocalDate?) -> Unit,
) {
    var draft by remember { mutableStateOf(selected) }
    var draftStart by remember { mutableStateOf(customStart) }
    var draftEnd by remember { mutableStateOf(customEnd) }
    var showRangePicker by remember { mutableStateOf(false) }
    val canConfirm = draft != OverviewPeriod.CUSTOM || (draftStart != null && draftEnd != null)
    val presets = listOf(
        OverviewPeriod.TODAY,
        OverviewPeriod.D7,
        OverviewPeriod.D30,
        OverviewPeriod.D90,
        OverviewPeriod.D180,
        OverviewPeriod.CUSTOM,
    )
    val today = remember { LocalDate.now() }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(
            skipPartiallyExpanded = false,
            confirmValueChange = { it != SheetValue.Expanded },
        ),
        dragHandle = {
            Box(
                Modifier.padding(top = 8.dp).fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(width = 36.dp, height = 5.dp)
                        .clip(RoundedCornerShape(2.5.dp))
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.32f)),
                )
            }
        },
    ) {
        Column(Modifier.fillMaxWidth()) {
            AppSheetHeader(
                title = stringResource(R.string.date_range_filter_title),
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                presets.chunked(2).forEach { row ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        row.forEach { item ->
                            val isSelected = draft == item
                            Surface(
                                onClick = {
                                    draft = item
                                    if (item == OverviewPeriod.CUSTOM) {
                                        showRangePicker = true
                                    }
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) {
                                    MaterialTheme.colorScheme.surface
                                } else {
                                    MaterialTheme.colorScheme.surfaceVariant
                                },
                                border = BorderStroke(
                                    1.5.dp,
                                    if (isSelected) MaterialTheme.colorScheme.onSurface
                                    else Color.Transparent,
                                ),
                            ) {
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text(
                                        item.label(null, null),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
            if (draft == OverviewPeriod.CUSTOM) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OverviewDateField(
                        title = stringResource(R.string.date_range_from),
                        value = draftStart?.format(OverviewDateFormatter),
                        active = draftStart == null,
                        placeholder = stringResource(R.string.select_date),
                        onClick = { showRangePicker = true },
                        modifier = Modifier.weight(1f),
                    )
                    OverviewDateField(
                        title = stringResource(R.string.date_range_to),
                        value = draftEnd?.format(OverviewDateFormatter),
                        active = draftStart != null && draftEnd == null,
                        placeholder = "--",
                        onClick = { showRangePicker = true },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            AppPrimaryButton(
                text = stringResource(R.string.confirm),
                onClick = { onConfirm(draft, draftStart, draftEnd) },
                enabled = canConfirm,
            )
            }
        }
    }

    if (showRangePicker) {
        AppDateRangePickerSheet(
            title = stringResource(R.string.date_range_filter_title),
            subtitle = stringResource(R.string.period_custom),
            startLabel = stringResource(R.string.date_range_from),
            endLabel = stringResource(R.string.date_range_to),
            initialStart = draftStart,
            initialEnd = draftEnd,
            minDate = today.minusYears(10),
            maxDate = today,
            onDismiss = { showRangePicker = false },
            onConfirm = { start, end ->
                draftStart = start
                draftEnd = end
                draft = OverviewPeriod.CUSTOM
                showRangePicker = false
            },
        )
    }
}

@Composable
private fun OverviewDateField(
    title: String,
    value: String?,
    active: Boolean,
    placeholder: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(10.dp),
        color = if (active) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(
            1.5.dp,
            if (active) MaterialTheme.colorScheme.onSurface else Color.Transparent,
        ),
    ) {
        Column(
            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                value ?: placeholder,
                style = MaterialTheme.typography.bodyMedium,
                color = if (value == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

private fun formatGrowthPercent(growth: Double?): String {
    val value = growth ?: return "—"
    val prefix = when {
        value > 0 -> "↑"
        value < 0 -> "↓"
        else -> "→"
    }
    val absolute = kotlin.math.abs(value)
    val formatted = if (absolute % 1.0 == 0.0) {
        String.format("%.0f", absolute)
    } else {
        String.format("%.1f", absolute)
    }
    return "$prefix$formatted%"
}

@Composable
private fun growthTint(growth: Double?): Color {
    val value = growth ?: 0.0
    return when {
        value > 0 -> Color(0xFF177A3F)
        value < 0 -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

@Composable
private fun AnalyticsLineChart(title: String?, points: List<Double>, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (!title.isNullOrBlank()) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        }
        Canvas(Modifier.fillMaxWidth().height(180.dp)) {
            val values = if (points.isEmpty()) listOf(0.0, 0.0) else points
            val maximum = max(values.maxOrNull() ?: 0.0, 1.0)
            repeat(4) { line ->
                val y = size.height * line / 3f
                drawLine(
                    color = Color.LightGray.copy(alpha = 0.45f),
                    start = androidx.compose.ui.geometry.Offset(0f, y),
                    end = androidx.compose.ui.geometry.Offset(size.width, y),
                    strokeWidth = 1f,
                )
            }
            val path = Path()
            values.forEachIndexed { index, value ->
                val x = if (values.size == 1) 0f else size.width * index / (values.size - 1f)
                val y = size.height - (size.height * (value / maximum).toFloat())
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                drawCircle(color, radius = 6f, center = androidx.compose.ui.geometry.Offset(x, y))
            }
            drawPath(path, color = color, style = Stroke(width = 5f))
        }
    }
}

@Composable
private fun Metric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun HeroMetric(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier,
    alignment: Alignment.Horizontal = Alignment.Start,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = alignment,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = color,
            maxLines = 1,
        )
    }
}

private fun snapshotCountText(count: Int, hasData: Boolean): String =
    if (hasData) formatQuantity(count) else "—"

@Composable
private fun SnapshotMetric(
    label: String,
    value: String,
    tint: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(14.dp),
            )
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun RankingRow(
    rank: Int,
    item: RankingItem,
    accent: Color,
    showThumbnail: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = item.id != null, onClick = onClick)
            .padding(vertical = 9.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showThumbnail) {
            Box(Modifier.size(52.dp)) {
                Box(
                    Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                    )
                    item.imageUrl?.let { imageUrl ->
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = item.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
                Box(
                    Modifier
                        .size(22.dp)
                        .align(Alignment.BottomEnd)
                        .background(accent, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        rank.toString(),
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        } else {
            Box(
                Modifier.size(38.dp).background(accent.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(rank.toString(), color = accent, fontWeight = FontWeight.Bold)
            }
        }
        Column(Modifier.weight(1f)) {
            Text(
                item.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
            )
            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (showThumbnail) {
                val metadata = listOfNotNull(
                    item.category?.takeIf { it.isNotBlank() },
                    item.rentalCount?.let {
                        stringResource(R.string.rental_count_short, it)
                    },
                ).joinToString(" • ")
                if (metadata.isNotBlank()) {
                    Text(
                        metadata,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                item.note?.takeIf { it.isNotBlank() }?.let { note ->
                    Text(
                        note,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
            }
        }
        Text(
            formatMoney(item.value),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = accent,
        )
        Icon(
            Icons.Default.ListAlt,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
        )
    }
}
