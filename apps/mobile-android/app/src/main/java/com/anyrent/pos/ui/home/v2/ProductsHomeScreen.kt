package com.anyrent.pos.ui.home.v2

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.BarcodeMatch
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.ProductStock
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.home.ImageSearchScreen
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search, barcode scan,
 * category chips, "+" to the cart and a floating cart bar.
 */
@OptIn(FlowPreview::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun ProductsHomeScreen(
    onOpenProduct: (Int) -> Unit,
    onOpenCart: () -> Unit,
    onOpenInbox: () -> Unit,
    viewModel: ProductsHomeViewModel = viewModel(factory = ProductsHomeViewModel.Factory()),
) {
    val state by viewModel.state.collectAsState()
    val lines by CartStore.lines.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf(state.query) }
    var categories by remember { mutableStateOf<List<ApiParity.Category>>(emptyList()) }
    var unread by remember { mutableIntStateOf(0) }
    var showForm by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    var showImageSearch by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val notFound = stringResource(R.string.v2_scan_not_found)
    val added = stringResource(R.string.v2_added_to_cart)

    LaunchedEffect(Unit) {
        if (state.products.isEmpty()) viewModel.reload()
        categories = withContext(Dispatchers.IO) { ApiParity.listCategories().getOrDefault(emptyList()) }
        unread = withContext(Dispatchers.IO) { ApiClient.get().getUnreadCount().getOrDefault(0) }
    }
    LaunchedEffect(Unit) {
        snapshotFlow { draft }.debounce(300).distinctUntilChanged().collect { viewModel.setQuery(it) }
    }
    LaunchedEffect(listState, state.hasMore) {
        snapshotFlow {
            val info = listState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: -1) >= info.totalItemsCount - 4
        }.distinctUntilChanged().collect { near -> if (near) viewModel.loadMore() }
    }

    fun findByBarcode(code: String) {
        scope.launch {
            val page = withContext(Dispatchers.IO) { ProductsV2Api.listProducts(1, 20, code, null) }
            val match = page.getOrNull()?.let { BarcodeMatch.exact(code, it.items) }
            if (match != null) onOpenProduct(match.id)
            else Toast.makeText(context, notFound.format(code), Toast.LENGTH_LONG).show()
        }
    }

    Box(Modifier.fillMaxSize().background(Color.White)) {
        Column(Modifier.fillMaxSize()) {
            // Header
            Column(
                Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        val shop = listOfNotNull(SessionStore.merchantName, SessionStore.outletName)
                            .filter { it.isNotBlank() }.joinToString(" · ")
                        if (shop.isNotBlank()) {
                            Text(shop, fontSize = 13.sp, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Text(stringResource(R.string.v2_home_title), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                    }
                    if (ProductAccess.canCreate(PermissionManager.role)) {
                        IconButton(onClick = { showForm = true }) {
                            Icon(Icons.Default.Add, contentDescription = stringResource(R.string.new_product))
                        }
                    }
                    IconButton(onClick = onOpenInbox) {
                        BadgedBox(badge = { if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString()) } }) {
                            Icon(Icons.Default.Notifications, contentDescription = stringResource(R.string.notifications))
                        }
                    }
                }
                Row(Modifier.padding(end = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(V2Colors.Chip)
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Search, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(8.dp))
                        Box(Modifier.weight(1f)) {
                            if (draft.isEmpty()) {
                                Text(stringResource(R.string.v2_search_placeholder), color = DS.Colors.TextMuted, fontSize = 15.sp)
                            }
                            val searchLabel = stringResource(R.string.v2_search_placeholder)
                            BasicTextField(
                                value = draft,
                                onValueChange = { draft = it },
                                singleLine = true,
                                textStyle = TextStyle(fontSize = 15.sp, color = DS.Colors.Text),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { viewModel.setQuery(draft) }),
                                modifier = Modifier.fillMaxWidth().semantics { contentDescription = searchLabel },
                            )
                        }
                        if (draft.isNotEmpty()) {
                            IconButton(onClick = { draft = "" }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close), modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                    SquareIcon(Icons.Default.PhotoCamera, stringResource(R.string.image_search)) { showImageSearch = true }
                    SquareIcon(Icons.Default.QrCodeScanner, stringResource(R.string.camera_scan)) { showScan = true }
                }
            }
            if (categories.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    item { CategoryChip(stringResource(R.string.v2_category_all), state.categoryId == null) { viewModel.setCategory(null) } }
                    items(categories, key = { it.id }) { category ->
                        CategoryChip(category.name, state.categoryId == category.id) { viewModel.setCategory(category.id) }
                    }
                }
            }
            HorizontalDivider(color = DS.Colors.Border, modifier = Modifier.padding(top = 12.dp))

            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.reload(fromPull = true) },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    state.loading && state.products.isEmpty() -> LoadingBox()
                    state.products.isEmpty() -> Text(
                        state.error ?: stringResource(if (state.query.isBlank()) R.string.v2_products_empty else R.string.v2_search_empty),
                        color = DS.Colors.TextMuted,
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                    )
                    else -> LazyColumn(
                        state = listState,
                        contentPadding = PaddingValues(bottom = if (lines.isEmpty()) 16.dp else 96.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(state.products, key = { it.id }) { product ->
                            ProductRow(
                                product = product,
                                onOpen = { onOpenProduct(product.id) },
                                onAdd = {
                                    CartStore.addProduct(product)
                                    Toast.makeText(context, added, Toast.LENGTH_SHORT).show()
                                },
                            )
                        }
                        if (state.hasMore) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                                }
                            }
                        }
                    }
                }
            }
        }

        if (lines.isNotEmpty()) {
            CartBar(
                count = lines.sumOf { it.quantity },
                total = lines.sumOf { it.lineTotal },
                onClick = onOpenCart,
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }

    if (showForm) {
        AppFormSheet(onDismiss = { showForm = false }, fullScreen = true) {
            ProductFormV2Screen(
                initial = null,
                onBack = { showForm = false },
                onSaved = {
                    showForm = false
                    viewModel.replace(it)
                },
            )
        }
    }
    if (showScan) {
        AppFormSheet(onDismiss = { showScan = false }) {
            CameraBarcodeScreen(
                mode = BarcodeMode.CODE,
                onBack = { showScan = false },
                onCode = { findByBarcode(it) },
                embeddedInSheet = true,
            )
        }
    }
    if (showImageSearch) {
        Dialog(
            onDismissRequest = { showImageSearch = false },
            properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false),
        ) {
            ImageSearchScreen(onDismiss = { showImageSearch = false }, onCheckAvailability = { product ->
                showImageSearch = false
                onOpenProduct(product.id)
            })
        }
    }
}

@Composable
private fun SquareIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(V2Colors.Chip)
            .clickable(onClick = onClick)
            .semantics { contentDescription = label; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, contentDescription = null, tint = DS.Colors.Text) }
}

@Composable
private fun CategoryChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .heightIn(min = 40.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(if (selected) DS.Colors.Text else Color.White)
            .border(if (selected) 0.dp else 1.dp, V2Colors.Line, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp)
            .semantics { this.selected = selected; role = Role.Tab },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 14.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, color = if (selected) Color.White else DS.Colors.Text)
    }
}

@Composable
private fun ProductRow(product: Product, onOpen: () -> Unit, onAdd: () -> Unit) {
    val free = ProductStock.freeToday(product)
    val perRental = ProductPricing.perRental(product)
    val perDay = ProductPricing.perDay(product)
    val sale = ProductPricing.sale(product)
    val unitRental = stringResource(R.string.v2_unit_per_rental)
    val unitDay = stringResource(R.string.v2_unit_per_day)
    val saleShort = stringResource(R.string.v2_price_sale_short)
    val addLabel = stringResource(R.string.v2_add_to_cart_named, product.name)
    Column(Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 88.dp).padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ProductThumb(product.images.firstOrNull() ?: product.imageUrl, 68.dp, 12.dp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(product.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    val meta = listOfNotNull(product.categoryName, product.barcode).filter { it.isNotBlank() }.joinToString(" · ")
                    if (meta.isNotBlank()) {
                        Text(meta, fontSize = 13.sp, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    }
                    Text(
                        "● " + if (free > 0) stringResource(R.string.v2_stock_free, free) else stringResource(R.string.v2_stock_none_today),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = when {
                            free <= 0 -> V2Colors.Danger
                            free == 1 -> V2Colors.Warn
                            else -> V2Colors.Ok
                        },
                        maxLines = 1,
                    )
                }
                val text = buildAnnotatedString {
                    val main = perRental?.let { it to unitRental } ?: perDay?.let { it to unitDay }
                    main?.let { (price, unit) ->
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DS.Colors.Text)) { append(formatMoneyVnd(price)) }
                        withStyle(SpanStyle(fontSize = 12.sp, color = DS.Colors.TextMuted)) { append(unit) }
                    }
                    val extra = listOfNotNull(
                        perDay?.takeIf { perRental != null }?.let { formatMoneyVnd(it) + unitDay },
                        sale?.let { saleShort.format(formatMoneyVnd(it)) },
                    )
                    if (extra.isNotEmpty()) {
                        withStyle(SpanStyle(fontSize = 13.sp, color = DS.Colors.TextMuted)) {
                            append((if (main != null) " · " else "") + extra.joinToString(" · "))
                        }
                    }
                }
                Text(text, maxLines = 2)
            }
            Box(
                Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (free > 0) DS.Colors.Primary else V2Colors.Section)
                    .border(if (free > 0) 0.dp else 1.dp, V2Colors.Line, RoundedCornerShape(12.dp))
                    .clickable(onClick = onAdd)
                    .semantics { contentDescription = addLabel; role = Role.Button },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = if (free > 0) Color.White else DS.Colors.TextMuted)
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

@Composable
private fun CartBar(count: Int, total: Double, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.v2_cart_bar, count)
    val create = stringResource(R.string.v2_cart_create)
    Row(
        modifier
            .padding(12.dp)
            .fillMaxWidth()
            .height(56.dp)
            .shadow(10.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(DS.Colors.Text)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp)
            .semantics(mergeDescendants = true) { role = Role.Button },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
            Text(formatMoneyVnd(total), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Text(create, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Color.White)
    }
}
