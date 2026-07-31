package com.anyrent.pos.ui.orders

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.cache.OfflineCache
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.nextOrderStatuses

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    onOpenOrder: (Int) -> Unit,
    onOrderCheck: () -> Unit,
    onCameraScan: () -> Unit = {},
) {
    var query by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var orderType by remember { mutableStateOf<String?>(null) }
    var orders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var offline by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            offline = false
            page = 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchOrders(page = 1, q = query.ifBlank { null }, status = status, orderType = orderType)
            }
            loading = false
            result.onSuccess {
                orders = it.items
                hasMore = it.hasMore
                OfflineCache.get(context).saveOrders(it.items)
            }.onFailure {
                hasMore = false
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
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchOrders(page = next, q = query.ifBlank { null }, status = status, orderType = orderType)
            }
            loadingMore = false
            result.onSuccess {
                orders = orders + it.items
                page = next
                hasMore = it.hasMore
            }
        }
    }

    LaunchedEffect(status, orderType) { refresh() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(stringResource(R.string.orders), style = MaterialTheme.typography.headlineSmall)
            IconButton(onClick = onCameraScan) {
                Icon(Icons.Default.QrCodeScanner, contentDescription = stringResource(R.string.camera_scan))
            }
            IconButton(onClick = onOrderCheck) {
                Text("Check")
            }
        }
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text(stringResource(R.string.search)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "All", "RESERVED" to "Reserved", "PICKUPED" to "Pickup", "RETURNED" to "Returned", "COMPLETED" to "Done").forEach { (value, label) ->
                FilterChip(selected = status == value, onClick = { status = value }, label = { Text(label) })
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "All types", "RENT" to "Rent", "SALE" to "Sale").forEach { (value, label) ->
                FilterChip(selected = orderType == value, onClick = { orderType = value }, label = { Text(label) })
            }
        }
        Button(onClick = { refresh() }, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.search))
        }
        if (offline) {
            Text(stringResource(R.string.offline_cache), color = MaterialTheme.colorScheme.secondary)
        }
        when {
            loading -> LoadingBox()
            error != null -> EmptyOrError(error!!)
            orders.isEmpty() -> EmptyOrError(stringResource(R.string.empty_orders))
            else -> LazyColumn(
                contentPadding = PaddingValues(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(orders, key = { it.id }) { order ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onOpenOrder(order.id) }
                            .padding(12.dp)
                    ) {
                        Text(order.orderNumber, style = MaterialTheme.typography.titleMedium)
                        Text("${order.orderType} · ${order.status}")
                        Text(order.customerName ?: "—")
                        Text(formatMoney(order.totalAmount), style = MaterialTheme.typography.bodyLarge)
                    }
                }
                if (hasMore) {
                    item {
                        Button(
                            onClick = { loadMore() },
                            enabled = !loadingMore,
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(stringResource(R.string.load_more)) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(orderId: Int, onBack: () -> Unit) {
    var detail by remember { mutableStateOf<OrderDetail?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var notes by remember { mutableStateOf("") }
    var paymentAmount by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            val result = withContext(Dispatchers.IO) { ApiClient.get().getOrder(orderId) }
            loading = false
            result.onSuccess {
                detail = it
                notes = it.summary.notes.orEmpty()
            }.onFailure { error = it.message }
        }
    }

    LaunchedEffect(orderId) { load() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(detail?.summary?.orderNumber ?: stringResource(R.string.order_detail)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
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
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("${order.summary.orderType} · ${order.summary.status}")
                    Text(order.summary.customerName ?: "—")
                    Text("${stringResource(R.string.total)}: ${formatMoney(order.summary.totalAmount)}")
                    Text("${stringResource(R.string.deposit)}: ${formatMoney(order.summary.depositAmount)}")
                    Text(stringResource(R.string.items), style = MaterialTheme.typography.titleMedium)
                    order.items.forEach { item ->
                        Text("${item.productName ?: "#${item.productId}"} × ${item.quantity} — ${formatMoney(item.totalPrice)}")
                    }
                    OrderActionPanel(
                    detail = order,
                    onReload = { load() },
                    onDeleted = onBack,
                )
                OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text(stringResource(R.string.notes)) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                ApiClient.get().updateOrderNotes(orderId, notes)
                            }
                            load()
                        }
                    }) { Text(stringResource(R.string.save_notes)) }
                    OutlinedTextField(
                        value = paymentAmount,
                        onValueChange = { paymentAmount = it },
                        label = { Text(stringResource(R.string.payment_amount)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Button(onClick = {
                        val amount = paymentAmount.toDoubleOrNull() ?: return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                ApiClient.get().recordPayment(orderId, amount)
                            }
                            load()
                        }
                    }) { Text(stringResource(R.string.record_payment)) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCheckScreen(onBack: () -> Unit, onOpenOrder: (Int) -> Unit) {
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_check)) },
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
