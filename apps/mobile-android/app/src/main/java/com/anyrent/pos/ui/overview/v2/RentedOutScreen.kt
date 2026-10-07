package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.overview.RentedOutLogic
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.orders.v2.OrderListRow
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val LateBand = Color(0xFFFEF2F2)
private val LateText = Color(0xFFB91C1C)
private val OnTimeBand = Color(0xFFF8FAFC)
private val OnTimeText = Color(0xFF334155)

/** Pages of 100 (API limit ≤ 500); a shop rarely has more than a few hundred rentals out */
private const val PAGE_SIZE = 100
private const val MAX_PAGES = 20

/** Every RENT order still out (`GET /api/orders?status=PICKUPED&orderType=RENT`), soonest return first */
private fun loadRentedOut(): Result<List<OrderSummary>> = runCatching {
    val api = ApiClient.get()
    val all = mutableListOf<OrderSummary>()
    var page = 1
    while (page <= MAX_PAGES) {
        val result = api.searchOrders(
            page = page, limit = PAGE_SIZE, status = "PICKUPED", orderType = "RENT",
            sortBy = "returnPlanAt", sortOrder = "asc",
        ).getOrThrow()
        all += result.items
        if (!result.hasMore || result.items.isEmpty()) break
        page += 1
    }
    all
}

/**
 * #484 "Đang cho thuê · N" (board DT-dang-thue): no header card, "TRỄ HẠN TRẢ · n" first, then "CÒN HẠN · n", each by
 * planned return ascending. Rows are the Orders tab "Tất cả" rows; a tap opens the order like the Orders tab.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RentedOutScreen(onOpenOrder: (Int) -> Unit, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var orders by remember { mutableStateOf<List<OrderSummary>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }

    suspend fun load() {
        withContext(Dispatchers.IO) { loadRentedOut() }
            .onSuccess { orders = it; error = null }
            .onFailure { error = it.message ?: "" }
    }

    LaunchedEffect(Unit) { load() }

    val groups = orders?.let { RentedOutLogic.groups(it) }
    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(
                if (groups != null) stringResource(R.string.rented_out_title, groups.total) else stringResource(R.string.overview_v2_rented_out),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
        }
        HorizontalDivider(color = DS.Colors.Border)
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = {
                refreshing = true
                scope.launch {
                    load()
                    refreshing = false
                }
            },
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                groups == null && error == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
                }
                groups == null -> CenteredMessage(error.orEmpty().ifBlank { stringResource(R.string.calendar_v2_error) })
                groups.total == 0 -> CenteredMessage(stringResource(R.string.empty_orders))
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    val sections = listOf(
                        Triple("late", groups.late, true),
                        Triple("on-time", groups.onTime, false),
                    ).filter { it.second.isNotEmpty() }
                    sections.forEach { (key, rows, late) ->
                        item(key = "band-$key") {
                            GroupBand(
                                stringResource(if (late) R.string.rented_out_late else R.string.rented_out_on_time, rows.size),
                                late,
                            )
                        }
                        // Late days of the row tag in shop days, same as the grouping
                        items(OrdersHomeLogic.orderRows(rows, zone = RentedOutLogic.shopZone), key = { "$key-${it.key}" }) { row ->
                            OrderListRow(row, onClick = { onOpenOrder(row.orderId) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupBand(title: String, late: Boolean) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            title.uppercase(),
            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold,
            color = if (late) LateText else OnTimeText,
            modifier = Modifier.fillMaxWidth().background(if (late) LateBand else OnTimeBand)
                .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp)
                .semantics { heading() },
        )
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
    }
}

@Composable
private fun CenteredMessage(text: String) {
    // Scrollable so the pull-to-refresh gesture still works on an empty or failed list
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Text(
                text, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(40.dp),
            )
        }
    }
}
