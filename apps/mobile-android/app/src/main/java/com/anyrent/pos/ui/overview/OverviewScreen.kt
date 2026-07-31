package com.anyrent.pos.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.model.RankingItem
import com.anyrent.pos.data.model.TodayMetrics
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import androidx.compose.ui.Modifier

@Composable
fun OverviewScreen() {
    var metrics by remember { mutableStateOf<TodayMetrics?>(null) }
    var periodOrders by remember { mutableIntStateOf(0) }
    var periodRevenue by remember { mutableStateOf(0.0) }
    var growthText by remember { mutableStateOf<String?>(null) }
    var topProducts by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var topCustomers by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var periodDays by remember { mutableIntStateOf(30) }
    var refreshTick by remember { mutableIntStateOf(0) }
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

            if (periodDays <= 1) {
                val today = withContext(Dispatchers.IO) { ApiClient.get().todayMetrics() }
                today.onSuccess {
                    metrics = it
                    periodOrders = it.totalOrders
                    periodRevenue = it.totalRevenue
                }.onFailure { error = it.message }
                growthText = null
            } else {
                metrics = null
                val period = withContext(Dispatchers.IO) {
                    ApiParity.analyticsPeriod(start.toString(), end.toString())
                }
                period.onSuccess { data ->
                    val revenue = data.optJSONObject("revenue")
                    periodRevenue = revenue?.optDouble("totalActualRevenue")
                        ?.takeIf { !it.isNaN() && it > 0 }
                        ?: revenue?.optDouble("totalRevenue")?.takeIf { !it.isNaN() }
                        ?: 0.0
                    periodOrders = revenue?.optInt("totalOrders") ?: 0
                    val growth = data.optJSONObject("growth")
                    growthText = when {
                        growth == null -> null
                        growth.has("revenueGrowthPercent") ->
                            String.format("%.1f%%", growth.optDouble("revenueGrowthPercent"))
                        growth.has("revenueGrowth") -> {
                            val v = growth.opt("revenueGrowth")
                            v?.toString()
                        }
                        growth.has("revenue") -> String.format("%.1f%%", growth.optDouble("revenue"))
                        else -> null
                    }
                }.onFailure { error = it.message }
            }
            loading = false
        }
    }

    when {
        loading && metrics == null && periodOrders == 0 && topProducts.isEmpty() -> LoadingBox()
        error != null && metrics == null && periodOrders == 0 && topProducts.isEmpty() -> EmptyOrError(error!!)
        else -> Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.overview), style = MaterialTheme.typography.headlineSmall)
                IconButton(onClick = { refreshTick++ }) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    1 to R.string.period_today,
                    7 to R.string.period_7d,
                    30 to R.string.period_30d,
                    365 to R.string.period_year,
                ).forEach { (days, label) ->
                    FilterChip(
                        selected = periodDays == days,
                        onClick = { periodDays = days },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
            Text(
                stringResource(R.string.period_range, start.toString(), end.toString()),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Column(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Metric(stringResource(R.string.period_orders), periodOrders.toString())
                Metric(stringResource(R.string.period_revenue), formatMoney(periodRevenue))
                growthText?.let { Metric(stringResource(R.string.period_growth), it) }
                if (periodDays <= 1) {
                    metrics?.let { m ->
                        Metric("Active rentals", m.activeRentals.toString())
                        Metric("Stock", "${m.availableStock}/${m.totalStock}")
                    }
                }
            }

            Text(stringResource(R.string.top_products), style = MaterialTheme.typography.titleMedium)
            if (topProducts.isEmpty()) {
                Text("—", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                topProducts.forEach { RankingRow(it) }
            }
            Text(stringResource(R.string.top_customers), style = MaterialTheme.typography.titleMedium)
            if (topCustomers.isEmpty()) {
                Text("—", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                topCustomers.forEach { RankingRow(it) }
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Column(Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun RankingRow(item: RankingItem) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(Modifier.weight(1f)) {
            Text(item.name, fontWeight = FontWeight.Medium)
            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Text(formatMoney(item.value), fontWeight = FontWeight.SemiBold)
    }
}
