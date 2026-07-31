package com.anyrent.pos.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.cache.OfflineCache
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    onOpenCart: () -> Unit,
    onOpenInbox: () -> Unit,
    onOpenBarcode: () -> Unit,
    onManageProducts: () -> Unit,
    onEditProduct: (Int) -> Unit = {},
) {
    var query by remember { mutableStateOf("") }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var unread by remember { mutableIntStateOf(0) }
    var offline by remember { mutableStateOf(false) }
    var availabilityProduct by remember { mutableStateOf<Product?>(null) }
    val cartCount = CartStore.lines.collectAsState().value.sumOf { it.quantity }
    val orderType by CartStore.orderType.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            offline = false
            page = 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchProducts(page = 1, q = query.ifBlank { null })
            }
            val count = withContext(Dispatchers.IO) {
                ApiClient.get().getUnreadCount().getOrDefault(0)
            }
            unread = count
            loading = false
            result.onSuccess {
                products = it.items
                hasMore = it.hasMore
                OfflineCache.get(context).saveProducts(it.items)
            }.onFailure {
                hasMore = false
                val cached = OfflineCache.get(context).loadProducts()
                if (cached.isNotEmpty()) {
                    products = cached
                    offline = true
                } else error = it.message
            }
        }
    }

    fun loadMore() {
        if (!hasMore || loadingMore) return
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchProducts(page = next, q = query.ifBlank { null })
            }
            loadingMore = false
            result.onSuccess {
                products = products + it.items
                page = next
                hasMore = it.hasMore
            }
        }
    }

    LaunchedEffect(Unit) { refresh() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.home)) },
                actions = {
                    IconButton(onClick = onOpenBarcode) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = null)
                    }
                    IconButton(onClick = onOpenInbox) {
                        BadgedBox(badge = {
                            if (unread > 0) Badge { Text(unread.toString()) }
                        }) {
                            Icon(Icons.Default.Notifications, contentDescription = null)
                        }
                    }
                    IconButton(onClick = onOpenCart) {
                        BadgedBox(badge = {
                            if (cartCount > 0) Badge { Text(cartCount.toString()) }
                        }) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = null)
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            if (PermissionManager.canManageProducts()) {
                FloatingActionButton(onClick = onManageProducts) {
                    Icon(Icons.Default.Add, contentDescription = null)
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = orderType == "RENT",
                    onClick = { CartStore.setOrderType("RENT") },
                    label = { Text("RENT") },
                )
                FilterChip(
                    selected = orderType == "SALE",
                    onClick = { CartStore.setOrderType("SALE") },
                    label = { Text("SALE") },
                )
            }
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text(stringResource(R.string.search_products)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Button(onClick = { refresh() }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.search))
            }
            if (offline) Text(stringResource(R.string.offline_cache), color = MaterialTheme.colorScheme.secondary)
            when {
                loading -> LoadingBox()
                error != null -> EmptyOrError(error!!)
                products.isEmpty() -> EmptyOrError(stringResource(R.string.empty_products))
                else -> LazyColumn(
                    contentPadding = PaddingValues(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(products, key = { it.id }) { product ->
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .combinedClickable(
                                    onClick = {
                                        if (orderType == "RENT") {
                                            availabilityProduct = product
                                        } else {
                                            CartStore.addProduct(product)
                                        }
                                    },
                                    onLongClick = { onEditProduct(product.id) },
                                )
                                .padding(12.dp)
                        ) {
                            Text(product.name, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Avail ${product.available} · Rent ${formatMoney(product.rentPrice)}" +
                                    (product.salePrice?.let { " · Sale ${formatMoney(it)}" } ?: "")
                            )
                            product.barcode?.let { Text("Barcode: $it", style = MaterialTheme.typography.labelSmall) }
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
        availabilityProduct?.let { p ->
            AvailabilitySheet(
                product = p,
                onDismiss = { availabilityProduct = null },
                onAddAnyway = {},
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(onBack: () -> Unit, onPickCustomer: () -> Unit, onCreated: (Int) -> Unit) {
    val lines by CartStore.lines.collectAsState()
    val customer by CartStore.customer.collectAsState()
    val orderType by CartStore.orderType.collectAsState()
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.cart)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    IconButton(onClick = { CartStore.clear() }) {
                        Text("Clear")
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("$orderType · ${stringResource(R.string.total)}: ${formatMoney(CartStore.totalAmount)}")
            Text(
                customer?.displayName ?: stringResource(R.string.no_customer),
                modifier = Modifier.clickable(onClick = onPickCustomer),
            )
            Button(onClick = onPickCustomer) { Text(stringResource(R.string.pick_customer)) }
            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(lines, key = { it.product.id }) { line ->
                    Column(Modifier.fillMaxWidth().padding(8.dp)) {
                        Text(line.product.name)
                        Text("Qty ${line.quantity} · Days ${line.rentalDays} · ${formatMoney(line.lineTotal)}")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { CartStore.updateQuantity(line.product.id, line.quantity - 1) }) { Text("-") }
                            Button(onClick = { CartStore.updateQuantity(line.product.id, line.quantity + 1) }) { Text("+") }
                            if (orderType == "RENT") {
                                Button(onClick = { CartStore.updateRentalDays(line.product.id, line.rentalDays + 1) }) { Text("+day") }
                            }
                        }
                    }
                }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    if (lines.isEmpty()) {
                        error = "Cart is empty"
                        return@Button
                    }
                    loading = true
                    error = null
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            ApiClient.get().createOrder(
                                orderType = orderType,
                                customerId = customer?.id,
                                lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
                                totalAmount = CartStore.totalAmount,
                                rentalDays = lines.maxOfOrNull { it.rentalDays } ?: 1,
                            )
                        }
                        loading = false
                        result.onSuccess {
                            CartStore.clear()
                            onCreated(it.id)
                        }.onFailure { error = it.message }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.create_order))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarcodeScanScreen(onBack: () -> Unit) {
    // Camera ML Kit can replace this later; manual entry covers Phase 3 barcode path.
    var code by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.barcode_scan)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.barcode_hint))
            OutlinedTextField(
                value = code,
                onValueChange = { code = it },
                label = { Text(stringResource(R.string.barcode)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            ApiClient.get().findProductByBarcode(code.trim())
                        }
                        result.onSuccess {
                            CartStore.addProduct(it)
                            message = "Added ${it.name}"
                            error = null
                        }.onFailure {
                            error = it.message
                            message = null
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.add_to_cart)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductManageScreen(onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var rentPrice by remember { mutableStateOf("") }
    var salePrice by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("1") }
    var barcode by remember { mutableStateOf("") }
    var deposit by remember { mutableStateOf("0") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.new_product)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(stringResource(R.string.name)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = barcode, onValueChange = { barcode = it }, label = { Text(stringResource(R.string.barcode)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = rentPrice, onValueChange = { rentPrice = it }, label = { Text(stringResource(R.string.rent_price)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = salePrice, onValueChange = { salePrice = it }, label = { Text("Sale price") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = deposit, onValueChange = { deposit = it }, label = { Text(stringResource(R.string.deposit)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = stock, onValueChange = { stock = it }, label = { Text(stringResource(R.string.stock)) }, modifier = Modifier.fillMaxWidth())
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    val price = rentPrice.toDoubleOrNull()
                    val qty = stock.toIntOrNull()
                    if (name.isBlank() || price == null || qty == null) {
                        error = "Invalid input"
                        return@Button
                    }
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            com.anyrent.pos.data.ApiParity.createProductFull(
                                name = name,
                                rentPrice = price,
                                salePrice = salePrice.toDoubleOrNull(),
                                stock = qty,
                                barcode = barcode.ifBlank { null },
                                deposit = deposit.toDoubleOrNull() ?: 0.0,
                                imageFile = null,
                            )
                        }
                        result.onSuccess {
                            message = "Created ${it.name}"
                            error = null
                        }.onFailure { error = it.message }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.save)) }
        }
    }
}
