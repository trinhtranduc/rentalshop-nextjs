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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.overview.NotPickedUpLogic
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.ui.orders.v2.NotPickedUpOrderRow
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import kotlinx.coroutines.flow.drop

private val OverdueBand = Color(0xFFFEF2F2)
private val OverdueText = Color(0xFFB91C1C)
private val UpcomingBand = Color(0xFFF8FAFC)
private val UpcomingText = Color(0xFF334155)

/** Pages of 100 (API limit ≤ 500); a shop rarely has more than a few hundred orders waiting for pickup */
private const val PAGE_SIZE = 100
private const val MAX_PAGES = 20

/** Every RENT order not picked up yet (`GET /api/orders?orderType=RENT&status=RESERVED`), soonest pickup first */
private fun loadNotPickedUp(): Result<List<OrderSummary>> = runCatching {
    val api = ApiClient.get()
    val all = mutableListOf<OrderSummary>()
    var page = 1
    while (page <= MAX_PAGES) {
        val result = api.searchOrders(
            page = page, limit = PAGE_SIZE, status = "RESERVED", orderType = "RENT",
            sortBy = "pickupPlanAt", sortOrder = "asc",
        ).getOrThrow()
        all += result.items
        if (!result.hasMore || result.items.isEmpty()) break
        page += 1
    }
    all
}

/**
 * #496 "Chưa lấy đồ · N" (board DT-chua-lay): "QUÁ NGÀY LẤY, CHƯA THU · n" (pickup day before today, Vietnam civil
 * day) then "SẼ THU KHI KHÁCH LẤY ĐỒ · n", each by planned pickup ascending. A tap opens the order.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotPickedUpScreen(onOpenOrder: (Int) -> Unit, onBack: () -> Unit) {
    // #674: the list lives in a view model, so back from an order it stays; it reloads only when dirty or stale
    val viewModel: DrillDownOrdersViewModel = viewModel(
        factory = remember { DrillDownOrdersViewModel.Factory { withContext(Dispatchers.IO) { loadNotPickedUp() } } },
    )
    val listState by viewModel.state.collectAsState()
    val orders = listState.orders
    val error = listState.error
    val refreshing = listState.refreshing
    LaunchedEffect(Unit) { viewModel.onShown() }
    LaunchedEffect(Unit) { OrdersChanged.version.drop(1).collect { viewModel.onShown() } }

    val now = Instant.now()
    val groups = orders?.let { NotPickedUpLogic.groups(it, now) }
    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(
                if (groups != null) stringResource(R.string.not_picked_up_title, groups.total) else stringResource(R.string.not_picked_up),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
        }
        HorizontalDivider(color = DS.Colors.Border)
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = viewModel::refresh,
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                groups == null && error == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
                }
                groups == null -> CenteredText(error.orEmpty().ifBlank { stringResource(R.string.calendar_v2_error) })
                groups.total == 0 -> CenteredText(stringResource(R.string.empty_orders))
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    val sections = listOf(
                        Triple("overdue", groups.overdue, true),
                        Triple("upcoming", groups.upcoming, false),
                    ).filter { it.second.isNotEmpty() }
                    sections.forEach { (key, rows, overdue) ->
                        item(key = "band-$key") {
                            Band(
                                stringResource(if (overdue) R.string.not_picked_up_overdue else R.string.not_picked_up_upcoming, rows.size),
                                overdue,
                            )
                        }
                        items(rows, key = { "$key-${it.id}" }) { order ->
                            NotPickedUpOrderRow(
                                order,
                                overdueDays = if (overdue) NotPickedUpLogic.overdueDays(order, now) else 0,
                                onClick = { onOpenOrder(order.id) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Band(title: String, overdue: Boolean) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            title.uppercase(),
            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold,
            color = if (overdue) OverdueText else UpcomingText,
            modifier = Modifier.fillMaxWidth().background(if (overdue) OverdueBand else UpcomingBand)
                .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp)
                .semantics { heading() },
        )
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
    }
}

@Composable
private fun CenteredText(text: String) {
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
