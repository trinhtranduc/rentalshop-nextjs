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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Search
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
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
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
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.AddButtonState
import com.anyrent.pos.domain.products.BarcodeMatch
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.ProductRowLogic
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcons
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
 * Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search with image search and
 * barcode scan inside the field, "+" (or the cart count) to the cart and a floating cart bar (#383).
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
    var unread by remember { mutableIntStateOf(0) }
    var showForm by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    var showImageSearch by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val notFound = stringResource(R.string.v2_scan_not_found)
    val added = stringResource(R.string.v2_added_to_cart)

    LaunchedEffect(Unit) {
        if (state.products.isEmpty()) viewModel.reload()
        unread = withContext(Dispatchers.IO) { ApiClient.get().getUnreadCount().getOrDefault(0) }
    }
    val deleted by DeletedProducts.ids.collectAsState()
    LaunchedEffect(deleted) { deleted.forEach(viewModel::remove) }
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
            val page = withContext(Dispatchers.IO) { ProductsV2Api.listProducts(1, 20, code) }
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
                            Icon(Icons.Outlined.Add, contentDescription = stringResource(R.string.new_product), modifier = Modifier.size(DS.Icon.Lg))
                        }
                    }
                    IconButton(onClick = onOpenInbox) {
                        BadgedBox(badge = { if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString()) } }) {
                            Icon(Icons.Outlined.Notifications, contentDescription = stringResource(R.string.notifications), modifier = Modifier.size(DS.Icon.Lg))
                        }
                    }
                }
                // Board SP-dong: image search and barcode scan are icon buttons at the trailing end inside the field
                Row(Modifier.padding(end = 8.dp)) {
                    Row(
                        Modifier
                            .weight(1f)
                            .height(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(V2Colors.Chip)
                            .padding(start = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Search, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(DS.Icon.Sm))
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
                                Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), modifier = Modifier.size(16.dp))
                            }
                        }
                        FieldIcon(Icons.Outlined.PhotoCamera, stringResource(R.string.image_search)) { showImageSearch = true }
                        FieldIcon(AppIcons.Barcode, stringResource(R.string.camera_scan)) { showScan = true }
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
                                inCart = ProductRowLogic.cartCount(product.id, lines),
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

/** An icon button inside the search field (48dp tap target) */
@Composable
private fun FieldIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(48.dp)
            .clickable(onClick = onClick)
            .semantics { contentDescription = label; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Md)) }
}

/** The + of a product already in the cart: the count on a darker blue (board SP-dong) */
private val InCartFill = Color(0xFF1E3A8A)

@Composable
private fun ProductRow(product: Product, inCart: Int, onOpen: () -> Unit, onAdd: () -> Unit) {
    val subtitle = ProductRowLogic.subtitle(product)
    val free = subtitle.free
    val addState = ProductRowLogic.addState(free, inCart)
    val perRental = ProductPricing.perRental(product)
    val perDay = ProductPricing.perDay(product)
    val sale = ProductPricing.sale(product)
    val unitRental = stringResource(R.string.v2_unit_per_rental)
    val unitDay = stringResource(R.string.v2_unit_per_day)
    val saleShort = stringResource(R.string.v2_price_sale_short)
    val addLabel = if (addState is AddButtonState.InCart) {
        stringResource(R.string.v2_add_in_cart_named, product.name, addState.count)
    } else {
        stringResource(R.string.v2_add_to_cart_named, product.name)
    }
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
                    subtitle.code?.let { code ->
                        Text(code, fontSize = 13.sp, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
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
            val out = addState is AddButtonState.Out
            Box(
                Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        when (addState) {
                            is AddButtonState.InCart -> InCartFill
                            AddButtonState.Out -> V2Colors.Section
                            AddButtonState.Add -> DS.Colors.Primary
                        },
                    )
                    .border(if (out) 1.dp else 0.dp, V2Colors.Line, RoundedCornerShape(12.dp))
                    .clickable(onClick = onAdd)
                    .semantics { contentDescription = addLabel; role = Role.Button },
                contentAlignment = Alignment.Center,
            ) {
                if (addState is AddButtonState.InCart) {
                    Text(addState.count.toString(), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                } else {
                    Icon(Icons.Outlined.Add, contentDescription = null, tint = if (out) DS.Colors.TextMuted else Color.White, modifier = Modifier.size(DS.Icon.Sm))
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

@Composable
private fun CartBar(count: Int, total: Double, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val label = pluralStringResource(R.plurals.v2_cart_bar, count, count)
    val create = stringResource(R.string.v2_cart_create)
    Row(
        modifier
            .padding(12.dp)
            .fillMaxWidth()
            .height(56.dp)
            .shadow(10.dp, RoundedCornerShape(16.dp), ambientColor = DS.Colors.Primary, spotColor = DS.Colors.Primary)
            .clip(RoundedCornerShape(16.dp))
            .background(DS.Colors.Primary)
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
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color.White, modifier = Modifier.size(DS.Icon.Sm))
    }
}
