package com.anyrent.pos.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.RankingCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import androidx.compose.ui.Modifier
import org.json.JSONObject
import kotlin.math.max

private data class AnalyticsChartPoint(
    val label: String,
    val revenue: Double,
    val orders: Double,
)

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
    var topProducts by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var topCustomers by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var periodDays by remember { mutableIntStateOf(30) }
    var refreshTick by remember { mutableIntStateOf(0) }
    var chartPoints by remember { mutableStateOf<List<AnalyticsChartPoint>>(emptyList()) }
    var chartsExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val end = remember(periodDays, refreshTick) { LocalDate.now() }
    val start = remember(periodDays, refreshTick) {
        if (periodDays <= 1) end else end.minusDays((periodDays - 1).toLong())
    }

    LaunchedEffect(periodDays, refreshTick) {
        scope.launch {
            loading = true
            error = null
            val overview = withContext(Dispatchers.IO) {
                ApiClient.get().analyticsOverview(start.toString(), end.toString())
            }
            overview.onSuccess {
                topProducts = it.first
                topCustomers = it.second
            }.onFailure { if (error == null) error = it.message }

            val period = withContext(Dispatchers.IO) {
                ApiParity.analyticsPeriod(start.toString(), end.toString())
            }
            period.onSuccess { data ->
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

                val orderCounts = data.optJSONObject("operational")
                    ?.optJSONObject("orderCounts")
                reservedOrders = orderCounts?.optInt("new") ?: 0
                activeOrders = orderCounts?.optInt("pickup") ?: 0
                completedOrders = orderCounts?.optInt("return") ?: 0
                cancelledOrders = orderCounts?.optInt("cancelled") ?: 0
            }.onFailure {
                error = it.message
                if (periodDays <= 1) {
                    withContext(Dispatchers.IO) { ApiClient.get().todayMetrics() }
                        .onSuccess { today ->
                            periodOrders = today.totalOrders
                            periodRevenue = today.totalRevenue
                            activeOrders = today.activeRentals
                            completedOrders = today.completedOrders
                        }
                }
            }
            loading = false
        }
    }

    when {
        loading && periodOrders == 0 && topProducts.isEmpty() -> LoadingBox()
        error != null && periodOrders == 0 && topProducts.isEmpty() -> EmptyOrError(error!!)
        else -> Column(
            Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                listOf(
                    1 to R.string.period_today,
                    7 to R.string.period_7d,
                    30 to R.string.period_30d,
                ).forEach { (days, label) ->
                    PeriodControl(
                        selected = periodDays == days,
                        onClick = { periodDays = days },
                    ) {
                        Text(stringResource(label))
                    }
                }
                PeriodControl(
                    selected = periodDays == 365,
                    onClick = { periodDays = 365 },
                ) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(LocalDate.now().year.toString())
                }
                Surface(
                    onClick = { refreshTick++ },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = stringResource(R.string.refresh),
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(12.dp).size(24.dp),
                    )
                }
            }
            Column(
                Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                AppCard(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            HeroMetric(
                                stringResource(R.string.period_revenue),
                                formatMoney(periodRevenue),
                                MaterialTheme.colorScheme.primary,
                                Modifier.weight(1f),
                                alignment = Alignment.Start,
                            )
                            HeroMetric(
                                stringResource(R.string.period_orders),
                                formatQuantity(periodOrders),
                                Color(0xFFF39A1B),
                                Modifier.weight(1f),
                                alignment = Alignment.End,
                            )
                        }
                        if (revenueGrowth != null || orderGrowth != null) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                GrowthMetric(
                                    stringResource(R.string.revenue_growth),
                                    revenueGrowth,
                                    Modifier.weight(1f),
                                )
                                GrowthMetric(
                                    stringResource(R.string.order_growth),
                                    orderGrowth,
                                    Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }

                AppCard(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            stringResource(R.string.operational_snapshot),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            stringResource(R.string.operational_snapshot_subtitle),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(Modifier.fillMaxWidth()) {
                            SnapshotMetric(
                                stringResource(R.string.reserved),
                                reservedOrders,
                                Color(0xFF5B68C8),
                                Icons.Default.Bookmark,
                                Modifier.weight(1f),
                            )
                            SnapshotMetric(
                                stringResource(R.string.in_progress),
                                activeOrders,
                                Color(0xFFF39A1B),
                                Icons.Default.DirectionsWalk,
                                Modifier.weight(1f),
                            )
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Row(Modifier.fillMaxWidth()) {
                            SnapshotMetric(
                                stringResource(R.string.completed),
                                completedOrders,
                                Color(0xFF177A3F),
                                Icons.Default.CheckCircle,
                                Modifier.weight(1f),
                            )
                            SnapshotMetric(
                                stringResource(R.string.cancelled),
                                cancelledOrders,
                                Color(0xFF991B1B),
                                Icons.Default.Cancel,
                                Modifier.weight(1f),
                            )
                        }
                    }
                }

                AppCard(Modifier.fillMaxWidth()) {
                    Column {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { chartsExpanded = !chartsExpanded }
                                .padding(horizontal = 16.dp, vertical = 20.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            Icon(
                                Icons.Default.ShowChart,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(R.string.charts), style = MaterialTheme.typography.titleLarge)
                                Text(
                                    if (chartsExpanded) stringResource(R.string.swipe_charts)
                                    else stringResource(R.string.show_charts),
                                    color = if (chartsExpanded) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(if (chartsExpanded) "⌃" else "›", style = MaterialTheme.typography.headlineSmall)
                        }
                        if (chartsExpanded) {
                            Column(
                                Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(18.dp),
                            ) {
                                AnalyticsLineChart(
                                    title = stringResource(R.string.revenue),
                                    points = chartPoints.map { it.revenue },
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                AnalyticsLineChart(
                                    title = stringResource(R.string.order_count),
                                    points = chartPoints.map { it.orders },
                                    color = Color(0xFFF39A1B),
                                )
                            }
                        }
                    }
                }

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
private fun PeriodControl(
    selected: Boolean,
    onClick: () -> Unit,
    content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            1.dp,
            if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
            else MaterialTheme.colorScheme.outlineVariant,
        ),
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}

@Composable
private fun AnalyticsLineChart(title: String, points: List<Double>, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        Canvas(Modifier.fillMaxWidth().height(170.dp)) {
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
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
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
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = color,
            maxLines = 1,
        )
    }
}

@Composable
private fun GrowthMetric(
    label: String,
    growth: Double?,
    modifier: Modifier = Modifier,
) {
    val value = growth ?: 0.0
    val color = when {
        value > 0 -> Color(0xFF177A3F)
        value < 0 -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            "${if (value > 0) "+" else ""}${String.format("%.1f", value)}%",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = color,
        )
    }
}

@Composable
private fun SnapshotMetric(
    label: String,
    count: Int,
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
            formatQuantity(count),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
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
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Normal,
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
        Text(formatMoney(item.value), fontWeight = FontWeight.SemiBold, color = accent)
        Icon(
            Icons.Default.ListAlt,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
        )
    }
}
