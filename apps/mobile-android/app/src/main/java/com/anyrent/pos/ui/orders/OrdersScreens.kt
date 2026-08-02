package com.anyrent.pos.ui.orders

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ArrowCircleUp
import androidx.compose.material.icons.filled.ArrowCircleDown
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.KeyboardReturn
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.viewmodel.compose.viewModel
import android.net.Uri
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.cache.OfflineCache
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.payment.PaymentPolicy
import com.anyrent.pos.ui.payment.PaymentViewModel
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppCloseIconButton
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSearchField
import com.anyrent.pos.ui.common.StatusBadge
import com.anyrent.pos.ui.common.SectionLabel
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.formatDisplayDate
import com.anyrent.pos.ui.common.formatDisplayDateTime
import com.anyrent.pos.ui.common.nextOrderStatuses
import com.anyrent.pos.print.ThermalPrinter

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged
import coil.compose.AsyncImage

/**
 * Routes entity-scoped order lists to the correct API so we never accidentally
 * request the unfiltered `/api/orders` feed.
 *
 * - Customer → `GET /api/customers/{id}/orders` (dedicated, role-scoped)
 * - Product  → `GET /api/orders?productId=` (same as web `getOrdersByProduct`)
 * - Text search on a customer list falls back to `/api/orders?customerId=&q=`
 *   because the dedicated endpoint does not accept `q`.
 */
private fun fetchScopedOrders(
    page: Int,
    q: String?,
    status: String?,
    orderType: String?,
    productId: Int?,
    customerId: Int?,
): Result<ApiClient.PageResult<OrderSummary>> {
    val api = ApiClient.get()
    return when {
        customerId != null && customerId > 0 && q.isNullOrBlank() && status.isNullOrBlank() ->
            api.searchCustomerOrders(customerId = customerId, page = page)
        customerId != null && customerId > 0 ->
            api.searchOrders(
                page = page,
                q = q,
                status = status,
                orderType = null,
                customerId = customerId,
            )
        productId != null && productId > 0 ->
            api.searchProductOrders(
                productId = productId,
                page = page,
                q = q,
                status = status,
            )
        else ->
            api.searchOrders(
                page = page,
                q = q,
                status = status,
                orderType = orderType,
            )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    onOpenOrder: (Int) -> Unit,
    onOrderCheck: () -> Unit,
    onCameraScan: () -> Unit = {},
    productId: Int? = null,
    customerId: Int? = null,
    filteredTitle: String? = null,
    onBack: (() -> Unit)? = null,
) {
    var draftQuery by remember { mutableStateOf("") }
    var appliedQuery by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    val filteredMode = productId != null || customerId != null
    var orderType by remember { mutableStateOf<String?>(if (filteredMode) null else "RENT") }
    var orders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var offline by remember { mutableStateOf(false) }
    var filterExpanded by remember { mutableStateOf(false) }
    var sortByPickup by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()
    val orderListState = rememberLazyListState()
    val context = androidx.compose.ui.platform.LocalContext.current

    fun refresh(fromPull: Boolean = false) {
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            offline = false
            page = 1
            val result = withContext(Dispatchers.IO) {
                fetchScopedOrders(
                    page = 1,
                    q = requestedQuery.ifBlank { null },
                    status = status,
                    orderType = orderType,
                    productId = productId,
                    customerId = customerId,
                )
            }
            if (appliedQuery.trim() != requestedQuery) return@launch
            loading = false
            refreshing = false
            result.onSuccess {
                orders = it.items
                hasMore = it.hasMore
                // Only cache the main (unfiltered) order feed — filtered feeds must not
                // overwrite / be restored as the global list.
                if (!filteredMode) {
                    OfflineCache.get(context).saveOrders(it.items)
                }
            }.onFailure {
                hasMore = false
                if (filteredMode) {
                    error = it.message
                    return@onFailure
                }
                val cached = OfflineCache.get(context).loadOrders()
                if (cached.isNotEmpty()) {
                    orders = cached
                    offline = true
                } else {
                    error = it.message
                }
            }
        }
    }

    fun loadMore() {
        if (!hasMore || loadingMore) return
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                fetchScopedOrders(
                    page = next,
                    q = requestedQuery.ifBlank { null },
                    status = status,
                    orderType = orderType,
                    productId = productId,
                    customerId = customerId,
                )
            }
            loadingMore = false
            if (appliedQuery.trim() != requestedQuery) return@launch
            result.onSuccess {
                orders = orders + it.items
                page = next
                hasMore = it.hasMore
            }
        }
    }

    LaunchedEffect(orderListState, hasMore, loadingMore) {
        snapshotFlow {
            val info = orderListState.layoutInfo
            val lastVisible = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            lastVisible >= info.totalItemsCount - 3
        }.distinctUntilChanged().collect { nearEnd ->
            if (nearEnd && hasMore && !loadingMore) loadMore()
        }
    }

    // Filter/type changes reload immediately; text search waits for keyboard Search.
    LaunchedEffect(status, orderType, appliedQuery) {
        refresh()
    }

    Column(
        Modifier
            .fillMaxSize()
            .then(if (filteredMode) Modifier.statusBarsPadding() else Modifier)
            .background(MaterialTheme.colorScheme.background),
    ) {
        if (filteredMode) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { onBack?.invoke() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                }
                Text(
                    filteredTitle ?: stringResource(R.string.orders),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Column(
            Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (!filteredMode) Row(
                    Modifier
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            MaterialTheme.shapes.small,
                        )
                        .padding(3.dp),
                ) {
                    listOf("RENT" to R.string.rent, "SALE" to R.string.sale).forEach { (value, label) ->
                        androidx.compose.material3.Surface(
                            color = if (orderType == value) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                Color.Transparent
                            },
                            shape = MaterialTheme.shapes.small,
                            modifier = Modifier.clickable { orderType = value },
                        ) {
                            Text(
                                stringResource(label),
                                modifier = Modifier.padding(horizontal = 18.dp, vertical = 9.dp),
                                color = if (orderType == value) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                if (!filteredMode) Row {
                    IconButton(onClick = onCameraScan) {
                        Icon(
                            Icons.Default.QrCodeScanner,
                            contentDescription = stringResource(R.string.camera_scan),
                        )
                    }
                    IconButton(onClick = { filterExpanded = true }) {
                        Icon(
                            Icons.Default.FilterList,
                            contentDescription = stringResource(R.string.filter_orders),
                        )
                    }
                }
            }
            AppSearchField(
                value = draftQuery,
                onValueChange = { draftQuery = it },
                placeholder = stringResource(R.string.order_search_hint),
                onSearch = {
                    appliedQuery = draftQuery.trim()
                },
                onClear = {
                    draftQuery = ""
                    appliedQuery = ""
                },
            )
        }
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { refresh(fromPull = true) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            Column(Modifier.fillMaxSize()) {
                if (offline) {
                    Text(
                        stringResource(R.string.offline_cache),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
                when {
                    loading -> LoadingBox()
                    error != null -> EmptyOrError(error!!)
                    orders.isEmpty() -> EmptyOrError(stringResource(R.string.empty_orders))
                    else -> LazyColumn(
                        state = orderListState,
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val sortedOrders = if (sortByPickup) {
                            orders.sortedByDescending { it.pickupPlanAt.orEmpty() }
                        } else {
                            orders.sortedByDescending { it.createdAt.orEmpty() }
                        }
                        items(sortedOrders, key = { it.id }) { order ->
                            OrderListCard(order = order, onClick = { onOpenOrder(order.id) })
                        }
                        if (loadingMore) {
                            item {
                                Box(
                                    Modifier.fillMaxWidth().padding(12.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (filterExpanded) {
        OrderFilterSheet(
            currentStatus = status,
            currentSortByPickup = sortByPickup,
            orderType = orderType ?: "RENT",
            onDismiss = { filterExpanded = false },
            onApply = { nextStatus, nextSortByPickup ->
                status = nextStatus
                sortByPickup = nextSortByPickup
                filterExpanded = false
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderFilterSheet(
    currentStatus: String?,
    currentSortByPickup: Boolean,
    orderType: String,
    onDismiss: () -> Unit,
    onApply: (String?, Boolean) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var draftStatus by remember(currentStatus) { mutableStateOf(currentStatus) }
    var draftSortByPickup by remember(currentSortByPickup) { mutableStateOf(currentSortByPickup) }
    // iOS OrderFilterViewController.availableStatuses — rent vs sale status sets differ
    val statuses = if (orderType == "SALE") {
        listOf(
            null to R.string.all,
            "COMPLETED" to R.string.status_completed,
            "CANCELLED" to R.string.status_cancelled,
        )
    } else {
        listOf(
            null to R.string.all,
            "RESERVED" to R.string.status_reserved,
            "PICKUPED" to R.string.status_pickuped,
            "RETURNED" to R.string.status_returned,
            "CANCELLED" to R.string.status_cancelled,
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(
                    Modifier.weight(1f).padding(end = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        stringResource(R.string.order_filter),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 18.sp,
                            lineHeight = 24.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    Text(
                        "${if (orderType == "RENT") stringResource(R.string.rent) else stringResource(R.string.sale)} · " +
                            stringResource(if (draftSortByPickup) R.string.pickup_date else R.string.book_date),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AppCloseIconButton(
                    onClick = onDismiss,
                    contentDescription = stringResource(R.string.close),
                )
            }

            Text(
                stringResource(R.string.sort_by).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium,
                letterSpacing = 0.6.sp,
            )
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                listOf(false to R.string.book_date, true to R.string.pickup_date).forEach { (value, label) ->
                    AppFilterChip(
                        label = stringResource(label),
                        selected = draftSortByPickup == value,
                        onClick = { draftSortByPickup = value },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Text(
                stringResource(R.string.status_filter).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium,
                letterSpacing = 0.6.sp,
            )
            // Flow-style rows: wrap chips like iOS statusFlowContainer
            statuses.chunked(3).forEach { rowStatuses ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    rowStatuses.forEach { (value, label) ->
                        AppFilterChip(
                            label = stringResource(label),
                            selected = draftStatus == value,
                            onClick = { draftStatus = value },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    repeat(3 - rowStatuses.size) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TextButton(
                    onClick = {
                        draftStatus = null
                        draftSortByPickup = true
                        onApply(null, true)
                    },
                    modifier = Modifier.height(50.dp),
                ) {
                    Text(
                        stringResource(R.string.reset),
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AppPrimaryButton(
                    text = stringResource(R.string.apply),
                    onClick = { onApply(draftStatus, draftSortByPickup) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun OrderListCard(
    order: OrderSummary,
    onClick: () -> Unit,
) {
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
    ) {
        Column(
            Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    "#${order.orderNumber.trim().removePrefix("#")}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                StatusBadge(order.status)
            }
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    order.customerName ?: "—",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    stringResource(R.string.item_count, order.itemCount),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(Modifier.fillMaxWidth()) {
                OrderMetric(
                    icon = Icons.Default.CalendarMonth,
                    label = stringResource(R.string.book_date),
                    value = formatOrderCreatedDate(order.createdAt),
                    modifier = Modifier.weight(1f),
                )
                OrderMetric(
                    icon = Icons.Default.ArrowCircleUp,
                    label = stringResource(R.string.pickup_date),
                    value = formatOrderListDate(order.pickupPlanAt),
                    highlighted = true,
                    modifier = Modifier.weight(1f),
                )
                OrderMetric(
                    icon = Icons.Default.ArrowCircleDown,
                    label = stringResource(R.string.return_date),
                    value = formatOrderListDate(order.returnPlanAt),
                    modifier = Modifier.weight(1f),
                )
                OrderMetric(
                    icon = Icons.Default.Payments,
                    label = stringResource(R.string.total),
                    value = formatMoney(order.totalAmount),
                    highlighted = true,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/** Match iOS order list cell `dateInString()` → `dd/MM/yy` (book / pickup / return). */
private fun formatOrderListDate(value: String?): String = formatDisplayDate(value)

private fun formatOrderCreatedDate(value: String?): String = formatDisplayDate(value)

private fun formatOrderDetailCreatedDate(value: String?): String = formatDisplayDateTime(value)

@Composable
private fun OrderMetric(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
) {
    val color = if (highlighted) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
    Column(modifier.padding(end = 5.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            value.ifBlank { "—" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (highlighted) FontWeight.Bold else FontWeight.Medium,
            color = if (highlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(orderId: Int, onBack: () -> Unit) {
    var detail by remember { mutableStateOf<OrderDetail?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var notes by remember { mutableStateOf("") }
    var showNotesEditor by remember { mutableStateOf(false) }
    var showCollateralEditor by remember { mutableStateOf(false) }
    var collateralDraft by remember { mutableStateOf("") }
    var showSecurityEditor by remember { mutableStateOf(false) }
    var securityDraft by remember { mutableStateOf("0") }
    var showMoreActions by remember { mutableStateOf(false) }
    var showPaymentSheet by remember { mutableStateOf(false) }
    var pendingNextStatus by remember { mutableStateOf<String?>(null) }
    var statusSubmitting by remember { mutableStateOf(false) }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val printerPrefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    val app = context.applicationContext as AnyRentApp
    val paymentFactory = remember { PaymentViewModel.Factory(app.container.paymentRepository) }
    val paymentViewModel: PaymentViewModel = viewModel(
        key = "order-detail-payment-$orderId",
        factory = paymentFactory,
    )
    val paymentState by paymentViewModel.state.collectAsState()

    fun load() {
        scope.launch {
            loading = true
            val result = withContext(Dispatchers.IO) { ApiClient.get().getOrder(orderId) }
            loading = false
            result.onSuccess {
                detail = it
                notes = it.summary.notes.orEmpty()
                collateralDraft = it.collateralDetails.orEmpty()
                securityDraft = it.securityDeposit.toLong().toString()
                paymentViewModel.setOrder(it)
            }.onFailure { error = it.message }
        }
    }

    LaunchedEffect(orderId) { load() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        detail?.summary?.orderNumber ?: stringResource(R.string.order_detail),
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                        )
                    }
                },
                actions = {
                    detail?.let { current ->
                        IconButton(
                            onClick = {
                                scope.launch {
                                    runCatching {
                                        shareOrderReceipt(context, current)
                                    }.onFailure { actionMessage = it.message }
                                }
                            },
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = stringResource(R.string.share_order),
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = {
            detail?.let { current ->
                val nextStatus = nextOrderStatuses(
                    current.summary.orderType,
                    current.summary.status,
                ).firstOrNull()
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    nextStatus?.let { status ->
                        Button(
                            onClick = {
                                val order = current
                                paymentViewModel.clearError()
                                paymentViewModel.setOrder(order)
                                val showSheet =
                                    (status == "PICKUPED" || status == "RETURNED") &&
                                        PaymentPolicy.actionFor(order) != null
                                if (showSheet) {
                                    pendingNextStatus = status
                                    showPaymentSheet = true
                                } else {
                                    scope.launch {
                                        statusSubmitting = true
                                        withContext(Dispatchers.IO) {
                                            ApiClient.get().updateOrderStatus(orderId, status)
                                        }
                                        statusSubmitting = false
                                        load()
                                    }
                                }
                            },
                            enabled = !statusSubmitting && !paymentState.submitting,
                            modifier = Modifier.weight(1.15f).height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(
                                if (status == "RETURNED") Icons.Default.KeyboardReturn
                                else Icons.Default.Inventory2,
                                contentDescription = null,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (status == "RETURNED") stringResource(R.string.return_order)
                                else stringResource(R.string.pickup_order),
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = {
                            val config = ThermalPrinter.configFromPrefs(printerPrefs)
                            scope.launch {
                                val result = withContext(Dispatchers.IO) {
                                    ThermalPrinter.printOrder(config, current)
                                }
                                actionMessage = when (result) {
                                    is ThermalPrinter.Result.Success -> "Printed"
                                    is ThermalPrinter.Result.Failure -> result.message
                                }
                            }
                        },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.print))
                    }
                    IconButton(
                        onClick = { showMoreActions = true },
                        modifier = Modifier
                            .size(56.dp)
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant,
                                RoundedCornerShape(12.dp),
                            ),
                    ) {
                        Icon(Icons.Default.MoreHoriz, contentDescription = stringResource(R.string.more_options))
                    }
                }
            }
        },
    ) { padding ->
        when {
            loading -> LoadingBox()
            error != null -> EmptyOrError(error!!)
            detail == null -> EmptyOrError("Not found")
            else -> {
                val order = detail!!
                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(vertical = 20.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    SectionLabel(stringResource(R.string.information))
                    AppCard(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    ) {
                        Column {
                            DetailRow(
                                stringResource(R.string.name),
                                order.summary.customerName ?: "—",
                                emphasized = true,
                            )
                            HorizontalDivider(
                                modifier = Modifier.padding(start = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant,
                            )
                            DetailRow(
                                stringResource(R.string.phone),
                                order.summary.customerPhone ?: "—",
                                valueColor = MaterialTheme.colorScheme.primary,
                            )
                            HorizontalDivider(
                                modifier = Modifier.padding(start = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant,
                            )
                            DetailRow(
                                stringResource(R.string.created_by),
                                order.summary.createdByName?.takeIf { it.isNotBlank() }
                                    ?: "N/A",
                            )
                        }
                    }

                    SectionLabel(stringResource(R.string.date_information))
                    AppCard(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    ) {
                        Column {
                            DetailRow(
                                stringResource(R.string.create_date),
                                formatOrderDetailCreatedDate(order.summary.createdAt),
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.pickup_date),
                                formatOrderListDate(order.summary.pickupPlanAt),
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.return_date),
                                formatOrderListDate(order.summary.returnPlanAt),
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.ready_to_deliver),
                                if (order.summary.isReadyToDeliver) "✓" else "□",
                                valueColor = MaterialTheme.colorScheme.primary,
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.deposit),
                                formatMoney(order.summary.depositAmount),
                                emphasized = true,
                                valueColor = Color(0xFFE88A19),
                            )
                        }
                    }

                    SectionLabel(stringResource(R.string.products))
                    order.items.forEach { item ->
                        AppCard(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        ) {
                            Row(
                                Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                Box(
                                    Modifier
                                        .size(64.dp)
                                        .background(
                                            MaterialTheme.colorScheme.surfaceVariant,
                                            MaterialTheme.shapes.small,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Default.Inventory2,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.outline,
                                    )
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        item.productName?.takeIf {
                                            it.isNotBlank() && !it.equals("null", ignoreCase = true)
                                        } ?: stringResource(R.string.unknown_product),
                                        style = MaterialTheme.typography.bodyLarge.copy(
                                            fontSize = 18.sp,
                                            lineHeight = 23.sp,
                                            fontWeight = FontWeight.Normal,
                                        ),
                                    )
                                    Text(
                                        "${formatQuantity(item.quantity)} × ${formatMoney(item.unitPrice)}",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Text(
                                    formatMoney(item.totalPrice),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                            }
                        }
                    }

                    SectionLabel(stringResource(R.string.deposit_collateral_details))
                    AppCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                        Column {
                            DetailRow(
                                stringResource(R.string.collateral),
                                order.collateralDetails?.takeIf { it.isNotBlank() }
                                    ?.takeIf { !it.equals("null", ignoreCase = true) }
                                    ?: stringResource(R.string.tap_to_edit),
                                valueColor = MaterialTheme.colorScheme.primary,
                                onClick = { showCollateralEditor = true },
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.security_deposit),
                                if (order.securityDeposit > 0) formatMoney(order.securityDeposit)
                                else stringResource(R.string.tap_to_edit),
                                valueColor = MaterialTheme.colorScheme.primary,
                                onClick = {
                                    securityDraft = order.securityDeposit.toLong().toString()
                                    showSecurityEditor = true
                                },
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.damage_fee),
                                if (order.damageFee > 0) formatMoney(order.damageFee) else "0",
                                valueColor = if (order.damageFee > 0) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }
                    }

                    SectionLabel(stringResource(R.string.notes))
                    AppCard(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .clickable { showNotesEditor = true },
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(
                                    stringResource(R.string.notes),
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Normal,
                                    ),
                                )
                                Text("›", color = MaterialTheme.colorScheme.outline)
                            }
                            Text(
                                notes.ifBlank { stringResource(R.string.tap_to_add) },
                                color = if (notes.isBlank()) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    val subtotal = order.items.sumOf { it.totalPrice }
                    val discountAmount = (subtotal - order.summary.totalAmount).coerceAtLeast(0.0)
                    SectionLabel(stringResource(R.string.summary))
                    AppCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                        Column {
                            DetailRow(
                                stringResource(R.string.subtotal),
                                formatMoney(subtotal),
                                emphasized = true,
                                valueColor = MaterialTheme.colorScheme.onSurface,
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.discount),
                                formatMoney(discountAmount),
                                emphasized = true,
                                valueColor = MaterialTheme.colorScheme.onSurface,
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                            DetailRow(
                                stringResource(R.string.grand_total),
                                formatMoney(order.summary.totalAmount),
                                emphasized = true,
                                valueColor = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                    actionMessage?.let {
                        Text(
                            it,
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }
        }
    }

    if (showPaymentSheet && paymentState.action != null) {
        PaymentCollectionSheet(
            action = paymentState.action!!,
            selectedMethod = paymentState.selectedMethod,
            submitting = paymentState.submitting || statusSubmitting,
            error = paymentState.error,
            onMethodSelected = paymentViewModel::selectMethod,
            onDismiss = {
                showPaymentSheet = false
                pendingNextStatus = null
            },
            onConfirm = {
                val next = pendingNextStatus
                paymentViewModel.submit {
                    if (next == null) {
                        showPaymentSheet = false
                        return@submit
                    }
                    scope.launch {
                        statusSubmitting = true
                        runCatching {
                            withContext(Dispatchers.IO) {
                                ApiClient.get().updateOrderStatus(orderId, next)
                            }
                        }.onFailure { actionMessage = it.message }
                        statusSubmitting = false
                        showPaymentSheet = false
                        pendingNextStatus = null
                        load()
                    }
                }
            },
        )
    }

    if (showMoreActions && detail != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showMoreActions = false },
            sheetState = sheetState,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = 28.dp),
            ) {
                Text(
                    stringResource(R.string.order_actions),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.headlineSmall,
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text(stringResource(R.string.notes)) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                )
                Button(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                ApiClient.get().updateOrderNotes(orderId, notes)
                            }
                            showMoreActions = false
                            load()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    shape = RoundedCornerShape(12.dp),
                ) { Text(stringResource(R.string.save_notes)) }
                OrderActionPanel(
                    detail = detail!!,
                    onReload = {
                        showMoreActions = false
                        load()
                    },
                    onDeleted = onBack,
                )
            }
        }
    }

    if (showNotesEditor && detail != null) {
        OrderNotesEditorSheet(
            orderId = orderId,
            initialNotes = notes,
            existingImages = detail!!.notesImages,
            onDismiss = { showNotesEditor = false },
            onSaved = {
                showNotesEditor = false
                load()
            },
        )
    }

    if (showCollateralEditor) {
        ModalBottomSheet(
            onDismissRequest = { showCollateralEditor = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = Color.White,
        ) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    stringResource(R.string.edit_collateral),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                OutlinedTextField(
                    value = collateralDraft,
                    onValueChange = { collateralDraft = it },
                    label = { Text(stringResource(R.string.collateral)) },
                    minLines = 3,
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(
                    onClick = {
                        scope.launch {
                            val result = withContext(Dispatchers.IO) {
                                ApiParity.updateOrderDetails(
                                    id = orderId,
                                    collateralDetails = collateralDraft.trim(),
                                )
                            }
                            result.onSuccess {
                                showCollateralEditor = false
                                load()
                            }.onFailure { actionMessage = it.message }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(12.dp),
                ) { Text(stringResource(R.string.save)) }
            }
        }
    }

    if (showSecurityEditor) {
        OrderMoneyEditorSheet(
            title = stringResource(R.string.security_deposit),
            value = securityDraft,
            onValueChange = { securityDraft = it },
            onDismiss = { showSecurityEditor = false },
            onConfirm = {
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiParity.updateOrderDetails(
                            id = orderId,
                            securityDeposit = securityDraft.toDoubleOrNull() ?: 0.0,
                        )
                    }
                    result.onSuccess {
                        showSecurityEditor = false
                        load()
                    }.onFailure { actionMessage = it.message }
                }
            },
        )
    }
}

@Composable
private fun DetailRow(
    label: String,
    value: String,
    emphasized: Boolean = false,
    valueColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    onClick: (() -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 15.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyLarge.copy(
                fontSize = 17.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.Normal,
            ),
        )
        Text(
            value,
            modifier = Modifier.weight(1f).padding(start = 16.dp),
            style = MaterialTheme.typography.bodyLarge.copy(
                fontSize = 17.sp,
                lineHeight = 22.sp,
            ),
            fontWeight = if (emphasized) FontWeight.SemiBold else FontWeight.Normal,
            color = valueColor,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderMoneyEditorSheet(
    title: String,
    value: String,
    onValueChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
    ) {
        Column(
            Modifier.fillMaxWidth().padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(title, style = MaterialTheme.typography.titleLarge)
                Text(
                    formatMoney(value.toDoubleOrNull() ?: 0.0),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(Modifier.fillMaxWidth()) {
                listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("0", "000", "⌫"),
                ).forEach { keys ->
                    Row(Modifier.fillMaxWidth()) {
                        keys.forEach { key ->
                            androidx.compose.material3.Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(58.dp)
                                    .clickable {
                                        val next = when (key) {
                                            "⌫" -> value.dropLast(1).ifBlank { "0" }
                                            else -> if (value == "0") key else value + key
                                        }
                                        onValueChange(next.take(12))
                                    },
                                shape = androidx.compose.ui.graphics.RectangleShape,
                                color = Color.White,
                                border = androidx.compose.foundation.BorderStroke(
                                    0.5.dp,
                                    MaterialTheme.colorScheme.outlineVariant,
                                ),
                            ) {
                                Box(
                                    Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(key, style = MaterialTheme.typography.titleLarge)
                                }
                            }
                        }
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TextButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.cancel))
                }
                Button(
                    onClick = onConfirm,
                    modifier = Modifier.weight(2f).height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text(stringResource(R.string.confirm), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderNotesEditorSheet(
    orderId: Int,
    initialNotes: String,
    existingImages: List<String>,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
) {
    var text by remember(initialNotes) { mutableStateOf(initialNotes) }
    var selectedImages by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val imagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        val remaining = (3 - existingImages.size).coerceAtLeast(0)
        selectedImages = (selectedImages + uris).distinct().take(remaining)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.order_notes),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = stringResource(R.string.close),
                    )
                }
            }
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text(stringResource(R.string.notes)) },
                placeholder = { Text(stringResource(R.string.add_notes_hint)) },
                minLines = 6,
                modifier = Modifier.fillMaxWidth(),
            )
            AppCard(
                Modifier.fillMaxWidth(),
                onClick = { imagePicker.launch("image/*") },
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        Icons.Default.AddPhotoAlternate,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column {
                        Text(stringResource(R.string.add_photos), fontWeight = FontWeight.SemiBold)
                        Text(
                            stringResource(R.string.add_photos_limit),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                existingImages.take(3).forEach { url ->
                    AsyncImage(
                        model = url,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(86.dp).background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            RoundedCornerShape(10.dp),
                        ),
                    )
                }
                selectedImages.forEach { uri ->
                    Box {
                        AsyncImage(
                            model = uri,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(86.dp).background(
                                MaterialTheme.colorScheme.surfaceVariant,
                                RoundedCornerShape(10.dp),
                            ),
                        )
                        IconButton(
                            onClick = { selectedImages = selectedImages - uri },
                            modifier = Modifier.align(Alignment.TopEnd).size(36.dp),
                        ) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.delete))
                        }
                    }
                }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                enabled = !saving,
                onClick = {
                    saving = true
                    error = null
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            runCatching {
                                val bytes = selectedImages.map { uri ->
                                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                                        ?: error("Could not read selected image")
                                }
                                ApiParity.updateOrderDetails(
                                    id = orderId,
                                    notes = text.trim(),
                                    noteImages = bytes,
                                ).getOrThrow()
                            }
                        }
                        saving = false
                        result.onSuccess { onSaved() }.onFailure { error = it.message }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (saving) {
                    CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                } else {
                    Text(stringResource(R.string.save_notes), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FindOrderScreen(onBack: () -> Unit, onOpenOrder: (Int) -> Unit) {
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.find_order)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.order_check_hint))
            OutlinedTextField(
                value = code,
                onValueChange = { code = it },
                label = { Text(stringResource(R.string.order_number)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            ApiClient.get().findOrderByNumber(code.trim())
                        }
                        loading = false
                        result.onSuccess { onOpenOrder(it.summary.id) }
                            .onFailure { error = it.message }
                    }
                },
                enabled = !loading && code.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.search)) }
        }
    }
}
