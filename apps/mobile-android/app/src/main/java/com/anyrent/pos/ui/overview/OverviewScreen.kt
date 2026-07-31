package com.anyrent.pos.ui.overview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.RankingItem
import com.anyrent.pos.data.model.TodayMetrics
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.layout.Row

@Composable
fun OverviewScreen() {
    var metrics by remember { mutableStateOf<TodayMetrics?>(null) }
    var topProducts by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var topCustomers by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var periodDays by remember { mutableStateOf(30) }
    var growthText by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(periodDays) {
        scope.launch {
            loading = true
            val end = LocalDate.now()
            val start = end.minusDays(periodDays.toLong())
            val today = withContext(Dispatchers.IO) { ApiClient.get().todayMetrics() }
            val overview = withContext(Dispatchers.IO) {
                ApiClient.get().analyticsOverview(start.toString(), end.toString())
            }
            loading = false
            today.onSuccess { metrics = it }.onFailure { error = it.message }
            overview.onSuccess {
                topProducts = it.first
                topCustomers = it.second
            }
            val period = withContext(Dispatchers.IO) {
                com.anyrent.pos.data.ApiParity.analyticsPeriod(start.toString(), end.toString())
            }
            period.onSuccess { data ->
                val growth = data.optJSONObject("growth")
                growthText = growth?.optString("revenueGrowth")?.takeIf { it.isNotBlank() }
                    ?: growth?.optDouble("revenue", Double.NaN)?.takeIf { !it.isNaN() }?.let { "Growth: $it" }
            }
        }
    }

    when {
        loading -> LoadingBox()
        error != null && metrics == null -> EmptyOrError(error!!)
        else -> Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.overview), style = MaterialTheme.typography.headlineSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(1 to R.string.period_today, 7 to R.string.period_7d, 30 to R.string.period_30d, 365 to R.string.period_year).forEach { (days, label) ->
                    FilterChip(selected = periodDays == days, onClick = { periodDays = days }, label = { Text(stringResource(label)) })
                }
            }
            metrics?.let { m ->
                Metric("Orders today", m.totalOrders.toString())
                Metric("Active rentals", m.activeRentals.toString())
                Metric("Completed", m.completedOrders.toString())
                Metric("Revenue", formatMoney(m.totalRevenue))
                Metric("Stock", "${m.availableStock}/${m.totalStock} (renting ${m.rentingStock})")
                growthText?.let { Metric("Growth", it) }
            }
            Text(stringResource(R.string.top_products), style = MaterialTheme.typography.titleMedium)
            topProducts.forEach { Text("${it.name} — ${formatMoney(it.value)}") }
            Text(stringResource(R.string.top_customers), style = MaterialTheme.typography.titleMedium)
            topCustomers.forEach { Text("${it.name} — ${formatMoney(it.value)}") }
        }
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleLarge)
    }
}
