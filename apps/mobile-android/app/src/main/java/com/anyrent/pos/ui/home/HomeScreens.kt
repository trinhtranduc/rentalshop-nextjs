package com.anyrent.pos.ui.home

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Image
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ImageSearch
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
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
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Surface
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.cache.OfflineCache
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.availability.AvailabilityScreen
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import com.anyrent.pos.ui.common.AppSearchField
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.orders.OrderDetailScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    onOpenCart: () -> Unit,
    onOpenInbox: () -> Unit,
    onCheckProductAvailability: (Int) -> Unit = {},
) {
    var draftQuery by remember { mutableStateOf("") }
    var appliedQuery by remember { mutableStateOf("") }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var unread by remember { mutableIntStateOf(0) }
    var offline by remember { mutableStateOf(false) }
    var availabilityProduct by remember { mutableStateOf<Product?>(null) }
    var deleteProduct by remember { mutableStateOf<Product?>(null) }
    var deleting by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    // null = closed; Product? null inside a wrapper: use Pair or sealed
    // showNewProduct + editingProduct: editingProduct non-null = edit, showNewProduct = new
    var productEditor by remember { mutableStateOf<Product?>(null) }
    var showNewProduct by remember { mutableStateOf(false) }
    var showBarcodeScan by remember { mutableStateOf(false) }
    var showImageSearch by remember { mutableStateOf(false) }
    // Calendar overlay sits ON TOP of image-search (sibling Dialog). Closing it must not
    // tear down the camera Dialog or the match-results sheet underneath.
    var imageSearchAvailabilityProduct by remember { mutableStateOf<Product?>(null) }
    var imageSearchOrderId by remember { mutableStateOf<Int?>(null) }
    val cartCount = CartStore.lines.collectAsState().value.sumOf { it.quantity }
    val scope = rememberCoroutineScope()
    val productListState = rememberLazyListState()
    val context = LocalContext.current

    fun refresh(fromPull: Boolean = false) {
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            offline = false
            page = 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchProducts(page = 1, q = requestedQuery.ifBlank { null })
            }
            val count = withContext(Dispatchers.IO) {
                ApiClient.get().getUnreadCount().getOrDefault(0)
            }
            unread = count
            if (appliedQuery.trim() != requestedQuery) return@launch
            loading = false
            refreshing = false
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
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchProducts(page = next, q = requestedQuery.ifBlank { null })
            }
            loadingMore = false
            if (appliedQuery.trim() != requestedQuery) return@launch
            result.onSuccess {
                products = products + it.items
                page = next
                hasMore = it.hasMore
            }
        }
    }

    fun requestImageSearchUpdate(product: Product) {
        if (product.imageUrl.isNullOrBlank()) {
            Toast.makeText(context, R.string.image_search_no_photos, Toast.LENGTH_LONG).show()
            return
        }
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().syncProductEmbeddings(product.id)
            }
            result.onSuccess {
                Toast.makeText(context, R.string.image_search_queued, Toast.LENGTH_LONG).show()
            }.onFailure { e ->
                Toast.makeText(
                    context,
                    e.message?.takeIf { it.isNotBlank() }
                        ?: context.getString(R.string.image_search_failed),
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    LaunchedEffect(productListState, hasMore, loadingMore) {
        snapshotFlow {
            val info = productListState.layoutInfo
            val lastVisible = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            lastVisible >= info.totalItemsCount - 3
        }.distinctUntilChanged().collect { nearEnd ->
            if (nearEnd && hasMore && !loadingMore) loadMore()
        }
    }

    // Initial load only — search runs when the user presses the keyboard Search key.
    LaunchedEffect(Unit) {
        refresh()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        // Nested under MainTabs (which already pads for the bottom NavigationBar +
        // system gesture bar). Default Scaffold insets would add that bottom gap again.
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        floatingActionButton = {
            ImageSearchFab(onClick = { showImageSearch = true })
        },
        topBar = {
            CenterAlignedTopAppBar(
                windowInsets = WindowInsets(0, 0, 0, 0),
                title = {
                    Text(
                        stringResource(R.string.home),
                        // iOS MainViewController: setupCustomNavigationBar Bold 20
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    Row {
                        if (PermissionManager.canManageProducts()) {
                            IconButton(onClick = {
                                productEditor = null
                                showNewProduct = true
                            }) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = stringResource(R.string.new_product),
                                )
                            }
                        }
                        IconButton(onClick = { showBarcodeScan = true }) {
                            Icon(
                                Icons.Default.QrCodeScanner,
                                contentDescription = stringResource(R.string.camera_scan),
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onOpenInbox) {
                        BadgedBox(badge = {
                            if (unread > 0) Badge { Text(unread.toString()) }
                        }) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = stringResource(R.string.notifications),
                            )
                        }
                    }
                    IconButton(onClick = onOpenCart) {
                        BadgedBox(badge = {
                            if (cartCount > 0) Badge { Text(cartCount.toString()) }
                        }) {
                            Icon(
                                Icons.Default.ShoppingCart,
                                contentDescription = stringResource(R.string.cart),
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { refresh(fromPull = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            Column(Modifier.fillMaxSize()) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    AppSearchField(
                        value = draftQuery,
                        onValueChange = { draftQuery = it },
                        placeholder = stringResource(R.string.search_products),
                        onSearch = {
                            appliedQuery = draftQuery.trim()
                            refresh()
                        },
                        onClear = {
                            draftQuery = ""
                            appliedQuery = ""
                            refresh()
                        },
                    )
                }
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
                    products.isEmpty() -> EmptyOrError(stringResource(R.string.empty_products))
                    else -> LazyColumn(
                        state = productListState,
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(products, key = { it.id }) { product ->
                            ProductCard(
                                product = product,
                                onClick = { CartStore.addProduct(product) },
                                onEdit = {
                                    productEditor = product
                                    showNewProduct = false
                                },
                                onDelete = { deleteProduct = product },
                                onCheckAvailability = { onCheckProductAvailability(product.id) },
                                onSyncImageSearch = { requestImageSearchUpdate(product) },
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
        availabilityProduct?.let { p ->
            AvailabilitySheet(
                product = p,
                onDismiss = { availabilityProduct = null },
                onAddAnyway = {},
            )
        }
        if (showNewProduct || productEditor != null) {
            AppFormSheet(
                onDismiss = {
                    showNewProduct = false
                    productEditor = null
                },
                fullScreen = true,
            ) {
                ProductFormScreen(
                    initial = productEditor,
                    onBack = {
                        showNewProduct = false
                        productEditor = null
                    },
                    onSaved = { saved ->
                        val wasEditing = productEditor != null
                        showNewProduct = false
                        productEditor = null
                        if (wasEditing) {
                            products = products.map { if (it.id == saved.id) saved else it }
                        } else {
                            // New product: prepend without full-list loading flash
                            products = listOf(saved) + products.filterNot { it.id == saved.id }
                        }
                    },
                )
            }
        }
        // Barcode stays as a page sheet; product add/edit is full screen.
        if (showBarcodeScan) {
            AppFormSheet(onDismiss = { showBarcodeScan = false }) {
                CameraBarcodeScreen(
                    mode = BarcodeMode.PRODUCT,
                    onBack = { showBarcodeScan = false },
                    embeddedInSheet = true,
                )
            }
        }
        if (showImageSearch) {
            Dialog(
                onDismissRequest = {
                    showImageSearch = false
                    imageSearchAvailabilityProduct = null
                    imageSearchOrderId = null
                },
                properties = DialogProperties(
                    usePlatformDefaultWidth = false,
                    dismissOnBackPress = imageSearchAvailabilityProduct == null &&
                        imageSearchOrderId == null,
                    dismissOnClickOutside = false,
                ),
            ) {
                ImageSearchScreen(
                    onDismiss = {
                        showImageSearch = false
                        imageSearchAvailabilityProduct = null
                        imageSearchOrderId = null
                    },
                    onCheckAvailability = { product ->
                        imageSearchAvailabilityProduct = product
                    },
                )
            }
        }
        if (showImageSearch) {
            imageSearchAvailabilityProduct?.let { product ->
                OverlayFullScreen(onDismiss = { imageSearchAvailabilityProduct = null }) {
                    AvailabilityScreen(
                        onBack = { imageSearchAvailabilityProduct = null },
                        onFindOrder = {},
                        onScanProduct = {},
                        onOpenOrder = { imageSearchOrderId = it },
                        scannedProductId = product.id,
                        focusedProductMode = true,
                    )
                }
            }
            imageSearchOrderId?.let { orderId ->
                OverlayFullScreen(onDismiss = { imageSearchOrderId = null }) {
                    OrderDetailScreen(
                        orderId = orderId,
                        onBack = { imageSearchOrderId = null },
                    )
                }
            }
        }
        deleteProduct?.let { product ->
            AppAlertConfirm(
                title = stringResource(R.string.delete_product),
                message = stringResource(R.string.delete_product_confirmation, product.name),
                confirmLabel = stringResource(R.string.delete),
                destructive = true,
                confirmLoading = deleting,
                dismissEnabled = !deleting,
                onDismiss = { deleteProduct = null },
                onConfirm = {
                    deleting = true
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            ApiClient.get().deleteProduct(product.id)
                        }
                        deleting = false
                        result.onSuccess {
                            deleteProduct = null
                            refresh()
                        }.onFailure { actionError = it.message }
                    }
                },
            )
        }
        actionError?.let { message ->
            AppAlertError(
                message = message,
                onDismiss = { actionError = null },
            )
        }
    }
}

@Composable
private fun ImageSearchFab(onClick: () -> Unit) {
    val sparkle = rememberInfiniteTransition(label = "aiSparkle")
    val scale by sparkle.animateFloat(
        initialValue = 1f,
        targetValue = 1.16f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "sparkleScale",
    )
    val tilt by sparkle.animateFloat(
        initialValue = -8f,
        targetValue = 8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "sparkleTilt",
    )

    FloatingActionButton(
        onClick = onClick,
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = Color.White,
        shape = CircleShape,
        modifier = Modifier.size(56.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.AutoAwesome,
            contentDescription = stringResource(R.string.image_search),
            modifier = Modifier
                .size(26.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    rotationZ = tilt
                },
        )
    }
}

@Composable
internal fun ProductCard(
    product: Product,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCheckAvailability: () -> Unit,
    showManageActions: Boolean = true,
    onAddToCart: (() -> Unit)? = null,
    onSyncImageSearch: (() -> Unit)? = null,
) {
    var expanded by remember { mutableStateOf(false) }
    var previewImage by remember { mutableStateOf<String?>(null) }
    val checkAvailabilityLabel = stringResource(R.string.check_availability)
    val addToCartLabel = stringResource(R.string.add_to_cart)
    val updateLabel = stringResource(R.string.update_product)
    val updateImageSearchLabel = stringResource(R.string.update_image_search)
    val deleteLabel = stringResource(R.string.delete_product)
    val canManage = PermissionManager.canManageProducts()
    val hasSavedPhoto = !product.imageUrl.isNullOrBlank()
    // Image-search results: calendar + add to cart (no sync).
    // Home: calendar → update → update image search → delete.
    val actions = buildList {
        add(
            AppMenuAction(
                label = checkAvailabilityLabel,
                icon = Icons.Default.CalendarMonth,
                onClick = onCheckAvailability,
            ),
        )
        if (onAddToCart != null) {
            add(
                AppMenuAction(
                    label = addToCartLabel,
                    icon = Icons.Default.ShoppingCart,
                    onClick = onAddToCart,
                ),
            )
        }
        if (canManage && showManageActions) {
            add(
                AppMenuAction(
                    label = updateLabel,
                    icon = Icons.Outlined.Edit,
                    onClick = onEdit,
                ),
            )
            if (onSyncImageSearch != null) {
                add(
                    AppMenuAction(
                        label = updateImageSearchLabel,
                        icon = Icons.Filled.ImageSearch,
                        onClick = onSyncImageSearch,
                        enabled = hasSavedPhoto,
                    ),
                )
            }
            add(
                AppMenuAction(
                    label = deleteLabel,
                    icon = Icons.Outlined.DeleteOutline,
                    onClick = onDelete,
                    destructive = true,
                ),
            )
        }
    }

    AppCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
    ) {
        // 3-dot is overlaid top-end so price/stock rows are full content width.
        Box {
            Row(
                Modifier.padding(14.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Box(
                    Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    val imageUrl = product.imageUrl
                    if (!imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = stringResource(R.string.product_image),
                            modifier = Modifier
                                .fillMaxSize()
                                // Child clickable wins over AppCard onClick → open viewer, not add-to-cart.
                                .clickable { previewImage = imageUrl },
                            contentScale = ContentScale.Crop,
                        )
                    } else {
                        Icon(
                            Icons.Default.Image,
                            contentDescription = stringResource(R.string.product_image),
                            tint = MaterialTheme.colorScheme.outline,
                        )
                    }
                }
                Column(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        product.name,
                        // Keep name off the overlaid 3-dot; price/stock stay full width.
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(end = 36.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 2,
                    )
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        PriceBlock(
                            stringResource(R.string.rent_price),
                            product.rentPrice,
                            Modifier.weight(1f),
                        )
                        val salePrice = product.salePrice
                        if (salePrice != null) {
                            PriceBlock(
                                stringResource(R.string.sale_price),
                                salePrice,
                                Modifier.weight(1f),
                            )
                        } else {
                            Spacer(Modifier.weight(1f))
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            "${stringResource(R.string.stock)}: ${formatQuantity(product.stock)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        AvailableStockBadge(product.available)
                    }
                }
            }
            AppOverflowMenuAnchor(
                modifier = Modifier.align(Alignment.TopEnd),
                contentDescription = stringResource(R.string.product_actions),
                actions = actions,
                expanded = expanded,
                onExpandedChange = { expanded = it },
            )
        }
    }
    previewImage?.let { url ->
        FullScreenImagePreview(
            model = url,
            onDismiss = { previewImage = null },
        )
    }
}

@Composable
private fun PriceBlock(label: String, value: Double, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(
            label,
            // iOS rentPriceTitleLabel: Regular 14
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            formatMoney(value),
            // iOS rent price value: Medium 15
            style = MaterialTheme.typography.titleSmall,
        )
    }
}

@Composable
private fun AvailableStockBadge(available: Int) {
    val inStock = available > 0
    val tint = if (inStock) Color(0xFF34C759) else Color(0xFFFF9500)
    Surface(
        color = tint.copy(alpha = 0.12f),
        shape = RoundedCornerShape(percent = 50),
    ) {
        Text(
            stringResource(R.string.available_count, formatQuantity(available)),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = tint,
            maxLines = 1,
        )
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
                        Text("Qty ${formatQuantity(line.quantity)} · Days ${formatQuantity(line.rentalDays)} · ${formatMoney(line.lineTotal)}")
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
                                pricingTypesByProduct = lines.associate { it.product.id to it.pricingType },
                                rentalDaysByProduct = lines.associate { it.product.id to it.rentalDays },
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

@Composable
private fun OverlayFullScreen(
    onDismiss: () -> Unit,
    content: @Composable () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.surface,
        ) {
            content()
        }
    }
}
