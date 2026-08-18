package com.anyrent.pos.ui.orders

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.KeyboardReturn
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Cancel
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
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Surface
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.cache.OfflineCache
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.payment.PaymentPolicy
import com.anyrent.pos.ui.payment.PaymentViewModel
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenu
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppNumericPadSheet
import com.anyrent.pos.ui.common.AppSearchField
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppSheetHeader
import com.anyrent.pos.ui.common.StatusBadge
import com.anyrent.pos.ui.common.SectionLabel
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.MaskedPhoneRow
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.formatDisplayDate
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToNotesJpegBytes
import com.anyrent.pos.ui.common.formatDisplayDateTime
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.MAX_NOTE_IMAGES
import com.anyrent.pos.ui.common.nextOrderStatuses
import com.anyrent.pos.ui.common.orderLinePricingText
import com.anyrent.pos.ui.navigation.MainTabRouter
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
    startDate: String? = null,
    endDate: String? = null,
    sortByPickup: Boolean = false,
    snapshotKind: String? = null,
): Result<ApiClient.PageResult<OrderSummary>> {
    val api = ApiClient.get()
    val snapshotStatus = snapshotIncomeStatus(snapshotKind)
    if (snapshotStatus != null && !startDate.isNullOrBlank() && !endDate.isNullOrBlank()) {
        return api.searchIncomeOrders(
            startDate = startDate,
            endDate = endDate,
            status = snapshotStatus,
            page = page,
        )
    }
    // iOS OrderListViewModel: SALE always sorts by createdAt; RENT uses pickup or createdAt.
    val sortBy = when {
        orderType.equals("SALE", ignoreCase = true) -> "createdAt"
        sortByPickup -> "pickupPlanAt"
        else -> "createdAt"
    }
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
                startDate = startDate,
                endDate = endDate,
                sortBy = sortBy,
                sortOrder = "desc",
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
                startDate = startDate,
                endDate = endDate,
                sortBy = sortBy,
                sortOrder = "desc",
            )
    }
}

private fun snapshotIncomeStatus(kind: String?): String? {
    return when (kind?.lowercase()) {
        "new", "pickup", "return", "cancelled" -> kind.lowercase()
        else -> null
    }
}

/** Clamp status to values valid for the selected order type (iOS availableStatuses). */
private fun statusForOrderType(status: String?, orderType: String?): String? {
    if (status.isNullOrBlank()) return null
    return when (orderType?.uppercase()) {
        "SALE" -> status.takeIf { it == "COMPLETED" || it == "CANCELLED" }
        "RENT" -> status.takeIf {
            it in setOf("RESERVED", "PICKUPED", "RETURNED", "CANCELLED")
        }
        else -> status
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    onOpenOrder: (Int) -> Unit,
    onOrderCheck: () -> Unit,
    onCameraScan: () -> Unit = {},
    /** iOS trailing swipe “Update Order” — load into cart for RENT+RESERVED / SALE+COMPLETED. */
    onEditOrder: (Int) -> Unit = {},
    productId: Int? = null,
    customerId: Int? = null,
    initialStatus: String? = null,
    snapshotKind: String? = null,
    startDate: String? = null,
    endDate: String? = null,
    filteredTitle: String? = null,
    onBack: (() -> Unit)? = null,
) {
    var draftQuery by remember { mutableStateOf("") }
    var appliedQuery by remember { mutableStateOf("") }
    var status by remember { mutableStateOf(initialStatus) }
    val isSnapshotList = remember(snapshotKind) { snapshotIncomeStatus(snapshotKind) != null }
    val filteredMode = productId != null || customerId != null || initialStatus != null || isSnapshotList
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
    // iOS rentDefault = pickup (get_date); SALE always uses createdAt.
    var sortByPickup by remember { mutableStateOf(!isSnapshotList) }
    val scope = rememberCoroutineScope()
    val orderListState = rememberLazyListState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val isSaleTab = orderType.equals("SALE", ignoreCase = true)

    fun refresh(fromPull: Boolean = false) {
        val requestedQuery = appliedQuery.trim()
        val effectiveStatus = if (isSnapshotList) null else statusForOrderType(status, orderType)
        val effectiveSortByPickup = if (isSaleTab || isSnapshotList) false else sortByPickup
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            offline = false
            page = 1
            val result = withContext(Dispatchers.IO) {
                fetchScopedOrders(
                    page = 1,
                    q = requestedQuery.ifBlank { null },
                    status = effectiveStatus,
                    orderType = orderType,
                    productId = productId,
                    customerId = customerId,
                    startDate = startDate,
                    endDate = endDate,
                    sortByPickup = effectiveSortByPickup,
                    snapshotKind = snapshotKind,
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
                    .filter { order ->
                        orderType == null || order.orderType.equals(orderType, ignoreCase = true)
                    }
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
        val effectiveStatus = if (isSnapshotList) null else statusForOrderType(status, orderType)
        val effectiveSortByPickup = if (isSaleTab || isSnapshotList) false else sortByPickup
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                fetchScopedOrders(
                    page = next,
                    q = requestedQuery.ifBlank { null },
                    status = effectiveStatus,
                    orderType = orderType,
                    productId = productId,
                    customerId = customerId,
                    startDate = startDate,
                    endDate = endDate,
                    sortByPickup = effectiveSortByPickup,
                    snapshotKind = snapshotKind,
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

    // After create-order success: MainTabRouter switches to this tab and asks for a reload.
    LaunchedEffect(Unit) {
        if (filteredMode) return@LaunchedEffect
        MainTabRouter.refreshOrders.collect { refresh() }
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
                    if (customerId != null) {
                        Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                    } else {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                        )
                    }
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
                            RoundedCornerShape(16.dp),
                        )
                        .padding(3.dp),
                ) {
                    listOf("RENT" to R.string.orders_rent, "SALE" to R.string.orders_sale).forEach { (value, label) ->
                        val selected = orderType == value
                        androidx.compose.material3.Surface(
                            color = if (selected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                Color.Transparent
                            },
                            shape = RoundedCornerShape(13.dp),
                            modifier = Modifier.clickable {
                                if (orderType == value) return@clickable
                                orderType = value
                                // Drop rent-only statuses when entering SALE (and reverse).
                                status = statusForOrderType(status, value)
                                // iOS: SALE always sorts by createdAt; RENT default = pickup.
                                sortByPickup = value != "SALE"
                                filterExpanded = false
                            },
                        ) {
                            Text(
                                stringResource(label),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp),
                                color = if (selected) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                style = MaterialTheme.typography.bodyMedium,
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
                    // iOS SaleViewController hides the filter/sort button on SALE.
                    if (!isSaleTab) {
                        IconButton(onClick = { filterExpanded = true }) {
                            Icon(
                                Icons.Default.FilterList,
                                contentDescription = stringResource(R.string.filter_orders),
                            )
                        }
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
                        val sortedOrders = if (!isSaleTab && sortByPickup) {
                            orders.sortedByDescending { it.pickupPlanAt.orEmpty() }
                        } else {
                            orders.sortedByDescending { it.createdAt.orEmpty() }
                        }
                        items(sortedOrders, key = { it.id }) { order ->
                            OrderListCard(
                                order = order,
                                onClick = { onOpenOrder(order.id) },
                                onSwipeEdit = if (canSwipeEditOrder(order)) {
                                    { onEditOrder(order.id) }
                                } else {
                                    null
                                },
                            )
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

    if (filterExpanded && !isSaleTab) {
        OrderFilterSheet(
            currentStatus = status,
            currentSortByPickup = sortByPickup,
            orderType = orderType ?: "RENT",
            onDismiss = { filterExpanded = false },
            onApply = { nextStatus, nextSortByPickup ->
                status = statusForOrderType(nextStatus, orderType)
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
    var draftStatus by remember(currentStatus) { mutableStateOf(currentStatus) }
    var draftSortByPickup by remember(currentSortByPickup) { mutableStateOf(currentSortByPickup) }
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
                        .background(
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.32f),
                            RoundedCornerShape(2.5.dp),
                        ),
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(Modifier.fillMaxWidth()) {
            AppSheetHeader(
                title = stringResource(R.string.order_filter),
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
            if (orderType != "SALE") {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    listOf(false to R.string.sort_book_date, true to R.string.sort_pickup_date).forEach { (value, label) ->
                        AppFilterChip(
                            label = stringResource(label),
                            selected = draftSortByPickup == value,
                            onClick = { draftSortByPickup = value },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                statuses.chunked(2).forEach { row ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        row.forEach { (value, label) ->
                            AppFilterChip(
                                label = stringResource(label),
                                selected = draftStatus == value,
                                onClick = { draftStatus = value },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
            AppPrimaryButton(
                text = stringResource(R.string.confirm),
                onClick = {
                    onApply(
                        draftStatus,
                        if (orderType == "SALE") false else draftSortByPickup,
                    )
                },
            )
            }
        }
    }
}

@Composable
private fun OrderListCard(
    order: OrderSummary,
    onClick: () -> Unit,
    onSwipeEdit: (() -> Unit)? = null,
) {
    val isRent = order.orderType.equals("RENT", ignoreCase = true)
    var phoneRevealed by remember(order.id) { mutableStateOf(false) }
    val phone = order.customerPhone?.trim().orEmpty()
    val card = @Composable {
        AppCard(
            modifier = Modifier.fillMaxWidth(),
            onClick = onClick,
            shape = RoundedCornerShape(10.dp),
        ) {
            Column(
                Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Header: order # + status
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "#${order.orderNumber.trim().removePrefix("#")}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    StatusBadge(order.status)
                }

                // Customer + masked phone left; total + item count stacked on the right
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Column(
                        Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            order.customerName ?: "—",
                            style = MaterialTheme.typography.titleSmall,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (phone.isNotEmpty()) {
                            MaskedPhoneRow(
                                phone = phone,
                                revealed = phoneRevealed,
                                onToggle = { phoneRevealed = !phoneRevealed },
                            )
                        }
                    }
                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            formatMoney(order.totalAmount),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                        )
                        Text(
                            stringResource(R.string.item_count, order.itemCount),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // Date metrics only — roomy 3-col (rent) or single (sale)
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OrderMetric(
                        icon = Icons.Default.CalendarMonth,
                        label = stringResource(R.string.sort_book_date),
                        value = formatOrderCreatedDate(order.createdAt),
                        highlighted = !isRent,
                        modifier = Modifier.weight(1f),
                    )
                    if (isRent) {
                        OrderMetric(
                            icon = Icons.Default.ArrowCircleUp,
                            label = stringResource(R.string.sort_pickup_date),
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
                    }
                }
            }
        }
    }

    if (onSwipeEdit == null) {
        card()
        return
    }

    // iOS SaleViewController trailing swipe → “UPDATE ORDER”
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onSwipeEdit()
            }
            false
        },
    )
    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        enableDismissFromEndToStart = true,
        backgroundContent = {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(10.dp))
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Text(
                    stringResource(R.string.swipe_update_order).uppercase(),
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        },
        content = { card() },
    )
}

/** iOS: admin/merchant/outletAdmin + (RENT+RESERVED | SALE+COMPLETED). */
private fun canSwipeEditOrder(order: OrderSummary): Boolean {
    if (!PermissionManager.canManageOrders()) return false
    val type = order.orderType.uppercase()
    val status = order.status.uppercase()
    return when (type) {
        "RENT" -> status == "RESERVED"
        "SALE" -> status == "COMPLETED"
        else -> false
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
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(13.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            value.ifBlank { "—" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (highlighted) FontWeight.SemiBold else FontWeight.Medium,
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
    // Picker lives on the detail screen so ModalBottomSheet dismiss during gallery
    // does not dispose the ActivityResult launcher (images would never attach).
    var notesSelectedImages by remember { mutableStateOf<List<java.io.File>>(emptyList()) }
    var notesPickingImages by remember { mutableStateOf(false) }
    // Coil model (URL String or File) for full-screen note image preview.
    var previewNoteImage by remember { mutableStateOf<Any?>(null) }
    var showCollateralEditor by remember { mutableStateOf(false) }
    var collateralDraft by remember { mutableStateOf("") }
    var showSecurityEditor by remember { mutableStateOf(false) }
    var securityDraft by remember { mutableStateOf("0") }
    var showMoreActions by remember { mutableStateOf(false) }
    var showCancelConfirm by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showPaymentSheet by remember { mutableStateOf(false) }
    var pendingNextStatus by remember { mutableStateOf<String?>(null) }
    var statusSubmitting by remember { mutableStateOf(false) }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val notesImagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        notesPickingImages = false
        showNotesEditor = true
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        // Copy while the picker grant is still valid — later openInputStream often fails.
        scope.launch {
            val existingCount = detail?.notesImages?.size ?: 0
            val slots = (MAX_NOTE_IMAGES - existingCount - notesSelectedImages.size).coerceAtLeast(0)
            val copied = withContext(Dispatchers.IO) {
                uris.take(slots).mapNotNull { uri ->
                    runCatching { context.copyUriToCacheFile(uri) }.getOrNull()
                }
            }
            if (copied.isEmpty() && uris.isNotEmpty()) {
                actionMessage = "Could not read selected image"
            } else {
                notesSelectedImages = notesSelectedImages + copied
            }
        }
    }
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
                // iOS: Cancel never sits on the primary row — only under ⋯.
                val nextStatus = nextOrderStatuses(
                    current.summary.orderType,
                    current.summary.status,
                ).firstOrNull { it != "CANCELLED" }
                val showCancelMore = canCancelOrder(
                    current.summary.orderType,
                    current.summary.status,
                )
                val showDelete = canDeleteCancelledOrder(current.summary.status)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .navigationBarsPadding()
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
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                        ) {
                            Icon(
                                if (status == "RETURNED") Icons.Default.KeyboardReturn
                                else Icons.Default.Inventory2,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                if (status == "RETURNED") stringResource(R.string.return_order)
                                else stringResource(R.string.pickup_order),
                                maxLines = 1,
                                softWrap = false,
                                overflow = TextOverflow.Ellipsis,
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
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                    ) {
                        Icon(
                            Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.print),
                            maxLines = 1,
                            softWrap = false,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    // iOS: Delete is a primary footer action for cancelled orders.
                    if (showDelete) {
                        OutlinedButton(
                            onClick = { showDeleteConfirm = true },
                            modifier = Modifier.weight(1f).height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                        ) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                stringResource(R.string.delete),
                                maxLines = 1,
                                softWrap = false,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    // iOS: ⋯ only when Cancel is available; menu = Cancel (destructive).
                    if (showCancelMore) {
                        Box {
                            IconButton(
                                onClick = { showMoreActions = true },
                                modifier = Modifier
                                    .size(56.dp)
                                    .background(
                                        MaterialTheme.colorScheme.surfaceVariant,
                                        RoundedCornerShape(12.dp),
                                    ),
                            ) {
                                Icon(
                                    Icons.Default.MoreHoriz,
                                    contentDescription = stringResource(R.string.more_options),
                                )
                            }
                            AppOverflowMenu(
                                expanded = showMoreActions,
                                onDismiss = { showMoreActions = false },
                                actions = listOf(
                                    AppMenuAction(
                                        label = stringResource(R.string.cancel_order),
                                        icon = Icons.Default.Cancel,
                                        destructive = true,
                                        onClick = { showCancelConfirm = true },
                                    ),
                                ),
                            )
                        }
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
                            // iOS PreviewViewController: tappable Ready Deliver checkbox for RENT orders.
                            if (order.summary.orderType.equals("RENT", ignoreCase = true)) {
                                val ready = order.summary.isReadyToDeliver
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            scope.launch {
                                                val next = !ready
                                                detail = order.copy(
                                                    summary = order.summary.copy(isReadyToDeliver = next),
                                                )
                                                val result = withContext(Dispatchers.IO) {
                                                    ApiParity.setReadyToDeliver(order.summary.id, next)
                                                }
                                                result.onFailure {
                                                    detail = order.copy(
                                                        summary = order.summary.copy(isReadyToDeliver = ready),
                                                    )
                                                    actionMessage = it.message
                                                }.onSuccess { load() }
                                            }
                                        }
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        stringResource(R.string.ready_to_deliver),
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                    Checkbox(
                                        checked = ready,
                                        onCheckedChange = { next ->
                                            scope.launch {
                                                detail = order.copy(
                                                    summary = order.summary.copy(isReadyToDeliver = next),
                                                )
                                                val result = withContext(Dispatchers.IO) {
                                                    ApiParity.setReadyToDeliver(order.summary.id, next)
                                                }
                                                result.onFailure {
                                                    detail = order.copy(
                                                        summary = order.summary.copy(isReadyToDeliver = ready),
                                                    )
                                                    actionMessage = it.message
                                                }.onSuccess { load() }
                                            }
                                        },
                                    )
                                }
                            } else {
                                DetailRow(
                                    stringResource(R.string.ready_to_deliver),
                                    if (order.summary.isReadyToDeliver) "✓" else "□",
                                    valueColor = MaterialTheme.colorScheme.primary,
                                )
                            }
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
                                    val imageUrl = item.imageUrl?.takeIf { it.isNotBlank() }
                                    if (imageUrl != null) {
                                        AsyncImage(
                                            model = imageUrl,
                                            contentDescription = item.productName,
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop,
                                        )
                                    } else {
                                        Icon(
                                            Icons.Default.Inventory2,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.outline,
                                        )
                                    }
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        item.productName?.takeIf {
                                            it.isNotBlank() && !it.equals("null", ignoreCase = true)
                                        } ?: stringResource(R.string.unknown_product),
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                    // iOS ProductPreviewCell: DAILY shows
                                    // "qty × price /rental day × N day"
                                    Text(
                                        orderLinePricingText(
                                            quantity = item.quantity,
                                            unitPrice = item.unitPrice,
                                            pricingType = item.pricingType,
                                            rentalDays = item.rentalDays,
                                            orderType = order.summary.orderType,
                                        ),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    item.note?.takeIf {
                                        it.isNotBlank() && !it.equals("null", ignoreCase = true)
                                    }?.let { note ->
                                        Text(
                                            note,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                Text(
                                    formatMoney(item.totalPrice),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
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
                            .clickable {
                                notesSelectedImages.forEach { runCatching { it.delete() } }
                                notesSelectedImages = emptyList()
                                showNotesEditor = true
                            },
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(
                                    stringResource(R.string.notes),
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Normal,
                                )
                                Text("›", color = MaterialTheme.colorScheme.outline)
                            }
                            Text(
                                notes.ifBlank { stringResource(R.string.tap_to_add) },
                                color = if (notes.isBlank()) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (order.notesImages.isNotEmpty()) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    order.notesImages.take(MAX_NOTE_IMAGES).forEach { url ->
                                        AsyncImage(
                                            model = url,
                                            contentDescription = stringResource(R.string.notes),
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(64.dp)
                                                .background(
                                                    MaterialTheme.colorScheme.surfaceVariant,
                                                    RoundedCornerShape(8.dp),
                                                )
                                                // Child clickable wins over the card's open-editor tap.
                                                .clickable { previewNoteImage = url },
                                        )
                                    }
                                }
                            }
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
                paymentViewModel.clearQr()
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
            qr = paymentState.qr,
            loadingQr = paymentState.loadingQr,
            onShowQr = paymentViewModel::loadQr,
            onClearQr = paymentViewModel::clearQr,
        )
    }

    // iOS PreviewViewController: Cancel / Delete confirm before mutating.
    if (showCancelConfirm && detail != null) {
        AppAlertConfirm(
            title = stringResource(R.string.cancel_order),
            message = stringResource(R.string.cancel_order_confirmation),
            confirmLabel = stringResource(R.string.confirm),
            destructive = true,
            onConfirm = {
                showCancelConfirm = false
                scope.launch {
                    statusSubmitting = true
                    withContext(Dispatchers.IO) {
                        ApiClient.get().updateOrderStatus(orderId, "CANCELLED")
                    }.onFailure { actionMessage = it.message }
                    statusSubmitting = false
                    load()
                }
            },
            onDismiss = { showCancelConfirm = false },
        )
    }

    if (showDeleteConfirm && detail != null) {
        AppAlertConfirm(
            title = stringResource(R.string.delete_order),
            message = stringResource(R.string.delete_order_confirmation),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            onConfirm = {
                showDeleteConfirm = false
                scope.launch {
                    withContext(Dispatchers.IO) {
                        ApiParity.deleteOrder(orderId)
                    }.onSuccess {
                        onBack()
                    }.onFailure { actionMessage = it.message }
                }
            },
            onDismiss = { showDeleteConfirm = false },
        )
    }

    if (showNotesEditor && detail != null) {
        OrderNotesEditorSheet(
            orderId = orderId,
            initialNotes = notes,
            existingImages = detail!!.notesImages,
            selectedImages = notesSelectedImages,
            onSelectedImagesChange = { notesSelectedImages = it },
            onPickImages = {
                val existingCount = detail?.notesImages?.size ?: 0
                val slots = (MAX_NOTE_IMAGES - existingCount - notesSelectedImages.size).coerceAtLeast(0)
                if (slots > 0) {
                    notesPickingImages = true
                    notesImagePicker.launch("image/*")
                }
            },
            onPreviewImage = { previewNoteImage = it },
            onDismiss = {
                if (!notesPickingImages) {
                    showNotesEditor = false
                    notesSelectedImages.forEach { runCatching { it.delete() } }
                    notesSelectedImages = emptyList()
                }
            },
            onSaved = {
                showNotesEditor = false
                notesSelectedImages.forEach { runCatching { it.delete() } }
                notesSelectedImages = emptyList()
                load()
            },
        )
    }

    previewNoteImage?.let { model ->
        FullScreenImagePreview(
            model = model,
            onDismiss = { previewNoteImage = null },
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
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Normal,
        )
        Text(
            value,
            modifier = Modifier.weight(1f).padding(start = 16.dp),
            style = MaterialTheme.typography.bodyLarge,
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
    AppNumericPadSheet(
        title = title,
        rawValue = value,
        onRawValueChange = onValueChange,
        onDismiss = onDismiss,
        onConfirm = onConfirm,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderNotesEditorSheet(
    orderId: Int,
    initialNotes: String,
    existingImages: List<String>,
    selectedImages: List<java.io.File>,
    onSelectedImagesChange: (List<java.io.File>) -> Unit,
    onPickImages: () -> Unit,
    onPreviewImage: (Any) -> Unit,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
) {
    var text by remember(initialNotes) { mutableStateOf(initialNotes) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val canAddMore = existingImages.size + selectedImages.size < MAX_NOTE_IMAGES

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        dragHandle = {
            Box(
                Modifier.padding(top = 8.dp).fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(width = 36.dp, height = 5.dp)
                        .background(
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.32f),
                            RoundedCornerShape(2.5.dp),
                        ),
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(Modifier.fillMaxWidth()) {
            AppSheetHeader(title = stringResource(R.string.order_notes))
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
                    .padding(top = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
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
                    onClick = { if (canAddMore) onPickImages() },
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(
                            Icons.Default.AddPhotoAlternate,
                            contentDescription = null,
                            tint = if (canAddMore) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
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
                    existingImages.take(MAX_NOTE_IMAGES).forEach { url ->
                        AsyncImage(
                            model = url,
                            contentDescription = stringResource(R.string.notes),
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(86.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(10.dp),
                                )
                                .clickable { onPreviewImage(url) },
                        )
                    }
                    selectedImages.forEach { file ->
                        Box {
                            AsyncImage(
                                model = file,
                                contentDescription = stringResource(R.string.notes),
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(86.dp)
                                    .background(
                                        MaterialTheme.colorScheme.surfaceVariant,
                                        RoundedCornerShape(10.dp),
                                    )
                                    .clickable { onPreviewImage(file) },
                            )
                            IconButton(
                                onClick = {
                                    runCatching { file.delete() }
                                    onSelectedImagesChange(selectedImages - file)
                                },
                                modifier = Modifier.align(Alignment.TopEnd).size(36.dp),
                            ) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.delete))
                            }
                        }
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                AppPrimaryButton(
                    text = stringResource(R.string.save_notes),
                    loading = saving,
                    onClick = {
                        saving = true
                        error = null
                        scope.launch {
                            val result = withContext(Dispatchers.IO) {
                                runCatching {
                                    val bytes = selectedImages.map { file ->
                                        // iOS: UIImageJPEGRepresentation(img, 0.8); then budget if API 200KB.
                                        val jpeg = fileToNotesJpegBytes(file)
                                        android.util.Log.i(
                                            "AnyRentUpload",
                                            "notes jpeg file=${file.name} raw=${file.length()} jpeg=${jpeg.size}",
                                        )
                                        jpeg
                                    }
                                    ApiParity.updateOrderDetails(
                                        id = orderId,
                                        notes = text.trim(),
                                        noteImages = bytes,
                                        existingNoteImageUrls = existingImages,
                                    ).getOrThrow()
                                }
                            }
                            saving = false
                            result.onSuccess { onSaved() }.onFailure { error = it.message }
                        }
                    },
                )
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
