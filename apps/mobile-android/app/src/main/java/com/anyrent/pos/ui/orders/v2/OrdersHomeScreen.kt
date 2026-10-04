package com.anyrent.pos.ui.orders.v2

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSearchField
import com.anyrent.pos.ui.common.AppSheetHeader
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.OrderStatusStyle
import com.anyrent.pos.ui.common.StatusBadge
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.common.maskedPhoneNumber
import com.anyrent.pos.ui.navigation.MainTabRouter
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.flow.distinctUntilChanged

/**
 * Redesigned orders tab (#371), shown when the `newOrders` feature is on:
 * "Việc cần làm" | "Tất cả đơn" (rent) | "Đơn bán", and one search across rent and sale.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun OrdersHomeScreen(onOpenOrder: (Int) -> Unit) {
    val app = LocalContext.current.applicationContext as AnyRentApp
    val viewModel: OrdersHomeViewModel = viewModel(
        factory = remember { OrdersHomeViewModel.Factory(app.container.todayWorkRepository) },
    )
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var showFilter by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    LaunchedEffect(Unit) { viewModel.onShown() }
    // After create-order success: MainTabRouter switches to this tab and asks for a reload
    LaunchedEffect(Unit) { MainTabRouter.refreshOrders.collect { viewModel.reload(keepRows = true) } }
    LaunchedEffect(state.segment, state.isSearching) { listState.scrollToItem(0) }
    // Next page when the last rows show
    LaunchedEffect(listState) {
        snapshotFlow {
            val info = listState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 5
        }.distinctUntilChanged().collect { nearEnd -> if (nearEnd) viewModel.loadMore() }
    }

    val segments = OrdersSegment.entries.filter { it != OrdersSegment.TODAY || state.todayAvailable }
    val call: (String) -> Unit = { phone ->
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Background)) {
        Row(
            Modifier.fillMaxWidth().padding(start = DS.Spacing.lg, end = DS.Spacing.sm, top = DS.Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppSearchField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                placeholder = stringResource(R.string.order_search_hint),
                onClear = { viewModel.onQueryChange("") },
                modifier = Modifier.weight(1f),
            )
            if (!state.isSearching && state.segment == OrdersSegment.RENT) {
                IconButton(onClick = { showFilter = true }, modifier = Modifier.size(DS.TouchTarget)) {
                    Icon(
                        Icons.Default.FilterList,
                        contentDescription = stringResource(R.string.order_filter),
                        tint = if (state.filter.isDefault) DS.Colors.Text else DS.Colors.Primary,
                    )
                }
            } else {
                Spacer(Modifier.size(DS.Spacing.sm))
            }
        }
        if (!state.isSearching) {
            TabRow(
                selectedTabIndex = segments.indexOf(state.segment).coerceAtLeast(0),
                containerColor = DS.Colors.Background,
                contentColor = DS.Colors.Primary,
                modifier = Modifier.padding(top = DS.Spacing.xs),
            ) {
                segments.forEach { segment ->
                    Tab(
                        selected = segment == state.segment,
                        onClick = { viewModel.select(segment) },
                        text = {
                            Text(
                                stringResource(segment.titleRes()),
                                fontWeight = if (segment == state.segment) FontWeight.Bold else FontWeight.Medium,
                                color = if (segment == state.segment) DS.Colors.Text else DS.Colors.TextMuted,
                                maxLines = 1,
                            )
                        },
                    )
                }
            }
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.reload(fromPull = true) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            when {
                state.loading -> LoadingBox()
                state.error != null -> StateMessage(
                    message = state.error.orEmpty().ifBlank { stringResource(R.string.something_went_wrong) },
                    onRetry = { viewModel.reload() },
                )
                state.sections.isEmpty() -> StateMessage(
                    message = stringResource(
                        if (state.isSearching || state.segment != OrdersSegment.TODAY) R.string.empty_orders
                        else R.string.nothing_to_do_today,
                    ),
                )
                else -> LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(bottom = DS.Spacing.lg),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    state.sections.forEach { section ->
                        if (section.kind != SectionKind.PLAIN) {
                            stickyHeader(key = "header-${section.key}") { SectionHeader(section) }
                        } else {
                            item(key = "top-${section.key}") { Spacer(Modifier.height(DS.Spacing.sm)) }
                        }
                        items(section.rows, key = { "${section.key}-${it.key}" }) { row ->
                            OrderRowCard(
                                row = row,
                                showsType = state.isSearching,
                                onClick = { onOpenOrder(row.orderId) },
                                onCall = call,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showFilter) {
        RentFilterSheet(
            initial = state.filter,
            onApply = {
                viewModel.applyFilter(it)
                showFilter = false
            },
            onDismiss = { showFilter = false },
        )
    }
}

private fun OrdersSegment.titleRes(): Int = when (this) {
    OrdersSegment.TODAY -> R.string.orders_to_do
    OrdersSegment.RENT -> R.string.orders_all
    OrdersSegment.SALE -> R.string.orders_sale
}

@Composable
private fun SectionHeader(section: OrdersSection) {
    val title = when (section.kind) {
        SectionKind.LATE -> stringResource(R.string.orders_section_late)
        SectionKind.TODAY -> stringResource(R.string.orders_section_today)
        SectionKind.TOMORROW -> stringResource(R.string.orders_section_tomorrow)
        else -> section.dayLabel.orEmpty()
    }
    Text(
        "${title.uppercase()} · ${section.rows.size}",
        modifier = Modifier
            .fillMaxWidth()
            .background(DS.Colors.Background)
            .padding(start = DS.Spacing.lg + DS.Spacing.xs, end = DS.Spacing.lg, top = DS.Spacing.md, bottom = DS.Spacing.xs),
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = if (section.kind == SectionKind.LATE) DS.Status.Late.text else DS.Colors.TextMuted,
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OrderRowCard(row: OrdersRow, showsType: Boolean, onClick: () -> Unit, onCall: (String) -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(DS.Radius.card),
        color = DS.Colors.Surface,
        border = BorderStroke(1.dp, DS.Colors.Border),
        modifier = Modifier.fillMaxWidth().padding(horizontal = DS.Spacing.lg, vertical = DS.Spacing.xs),
    ) {
        Column(Modifier.padding(DS.Spacing.md), verticalArrangement = Arrangement.spacedBy(DS.Spacing.sm)) {
            when (row) {
                is OrdersRow.Work -> WorkRowContent(row.row, row.kind, onCall)
                is OrdersRow.Order -> OrderRowContent(row, showsType, onCall)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TopLine(orderNumber: String, pills: @Composable () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            "#$orderNumber",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = DS.Colors.Text,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(DS.Spacing.xs)) { pills() }
    }
}

@Composable
private fun WorkRowContent(work: TodayWorkRow, kind: WorkKind, onCall: (String) -> Unit) {
    TopLine(work.orderNumber) {
        if (work.lateDays > 0) Pill(stringResource(R.string.orders_late_days, work.lateDays), DS.Status.Late)
        if (kind == WorkKind.HAND_OVER && !work.isReadyToDeliver) {
            Pill(stringResource(R.string.orders_not_prepared), DS.Status.Waiting)
        }
        if (kind == WorkKind.HAND_OVER) {
            Pill(stringResource(R.string.orders_hand_over), DS.Status.HandOver)
        } else {
            Pill(stringResource(R.string.orders_take_back), DS.Status.Return)
        }
    }
    CustomerLine(work.customerName, work.customerPhone, onCall)
    if (work.productNames.isNotBlank()) {
        Text(
            work.productNames,
            style = MaterialTheme.typography.bodySmall,
            color = DS.Colors.TextMuted,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
    val planned = if (kind == WorkKind.HAND_OVER) work.pickupPlanAt else work.returnPlanAt
    val (amount, color) = when {
        work.refundDue > 0 -> stringResource(R.string.orders_refund, formatMoneyVnd(work.refundDue)) to DS.Status.Return.text
        work.amountDue > 0 -> stringResource(R.string.orders_collect, formatMoneyVnd(work.amountDue)) to DS.Colors.Text
        else -> null to DS.Colors.Text
    }
    BottomLine(planned?.let { formatDayShort(it) }.orEmpty(), amount, color)
}

@Composable
private fun OrderRowContent(row: OrdersRow.Order, showsType: Boolean, onCall: (String) -> Unit) {
    val order = row.order
    val isRent = order.orderType.equals("RENT", ignoreCase = true)
    TopLine(order.orderNumber) {
        if (showsType) {
            Pill(
                stringResource(if (isRent) R.string.rent else R.string.sale),
                DS.Pill(DS.Colors.TextMuted, DS.Colors.Divider),
            )
        }
        if (row.lateDays > 0) Pill(stringResource(R.string.orders_late_days, row.lateDays), DS.Status.Late)
        StatusBadge(order.status)
    }
    CustomerLine(order.customerName, order.customerPhone, onCall)
    Text(
        stringResource(R.string.item_count, order.itemCount),
        style = MaterialTheme.typography.bodySmall,
        color = DS.Colors.TextMuted,
    )
    val date = if (isRent) {
        val from = OrdersHomeLogic.parseInstant(order.pickupPlanAt)?.let { formatDayShort(it) } ?: "—"
        val to = OrdersHomeLogic.parseInstant(order.returnPlanAt)?.let { formatDayShort(it) } ?: "—"
        "$from → $to"
    } else {
        OrdersHomeLogic.parseInstant(order.createdAt)?.let { formatDayShort(it) }.orEmpty()
    }
    BottomLine(date, formatMoneyVnd(order.totalAmount), DS.Colors.Text)
}

@Composable
private fun CustomerLine(name: String?, phone: String?, onCall: (String) -> Unit) {
    val trimmedPhone = phone?.filterNot { it.isWhitespace() }.orEmpty()
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                name?.takeIf { it.isNotBlank() } ?: "N/A",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = DS.Colors.Text,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (trimmedPhone.isNotEmpty()) {
                Text(
                    maskedPhoneNumber(trimmedPhone),
                    style = MaterialTheme.typography.bodySmall,
                    color = DS.Colors.TextMuted,
                )
            }
        }
        if (trimmedPhone.isNotEmpty()) {
            val label = stringResource(R.string.call_customer)
            IconButton(
                onClick = { onCall(trimmedPhone) },
                modifier = Modifier
                    .size(DS.TouchTarget)
                    .background(DS.Status.HandOver.fill, CircleShape)
                    .semantics { contentDescription = label },
            ) {
                Icon(Icons.Default.Phone, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun BottomLine(date: String, amount: String?, amountColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            date,
            style = MaterialTheme.typography.bodySmall,
            color = DS.Colors.TextMuted,
            modifier = Modifier.weight(1f),
        )
        if (amount != null) {
            Text(amount, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = amountColor)
        }
    }
}

@Composable
private fun Pill(text: String, colors: DS.Pill) {
    Box(
        Modifier
            .background(colors.fill, RoundedCornerShape(DS.Radius.pill))
            .padding(horizontal = 9.dp, vertical = 4.dp),
    ) {
        Text(text, color = colors.text, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

@Composable
private fun StateMessage(message: String, onRetry: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxSize().padding(DS.Spacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = MaterialTheme.typography.bodyLarge, color = DS.Colors.TextMuted)
        if (onRetry != null) {
            TextButton(onClick = onRetry, modifier = Modifier.height(DS.TouchTarget)) {
                Text(stringResource(R.string.retry), fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RentFilterSheet(initial: RentOrdersFilter, onApply: (RentOrdersFilter) -> Unit, onDismiss: () -> Unit) {
    var filter by remember { mutableStateOf(initial) }
    val statuses = listOf(null, "RESERVED", "PICKUPED", "RETURNED", "CANCELLED")
    AppFormSheet(onDismiss = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = DS.Spacing.lg).padding(bottom = DS.Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(DS.Spacing.md),
        ) {
            AppSheetHeader(stringResource(R.string.order_filter))
            Text(stringResource(R.string.status_filter), color = DS.Colors.TextMuted, fontWeight = FontWeight.Medium)
            ChipGrid(statuses) { status ->
                AppFilterChip(
                    label = status?.let { OrderStatusStyle.labelRes(it)?.let { res -> stringResource(res) } }
                        ?: stringResource(R.string.all),
                    selected = filter.status == status,
                    onClick = { filter = filter.copy(status = status) },
                    modifier = Modifier.weight(1f),
                )
            }
            Text(stringResource(R.string.sort_by), color = DS.Colors.TextMuted, fontWeight = FontWeight.Medium)
            ChipGrid(listOf(true, false)) { byPickup ->
                AppFilterChip(
                    label = stringResource(if (byPickup) R.string.sort_pickup_date else R.string.sort_book_date),
                    selected = filter.sortByPickup == byPickup,
                    onClick = { filter = filter.copy(sortByPickup = byPickup) },
                    modifier = Modifier.weight(1f),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(DS.Spacing.md)) {
                TextButton(onClick = { filter = RentOrdersFilter() }) { Text(stringResource(R.string.reset)) }
                AppPrimaryButton(text = stringResource(R.string.confirm), onClick = { onApply(filter) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

/** Three chips per row */
@Composable
private fun <T> ChipGrid(values: List<T>, chip: @Composable androidx.compose.foundation.layout.RowScope.(T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(DS.Spacing.sm)) {
        values.chunked(3).forEach { line ->
            Row(horizontalArrangement = Arrangement.spacedBy(DS.Spacing.sm)) {
                line.forEach { chip(it) }
                repeat(3 - line.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}
