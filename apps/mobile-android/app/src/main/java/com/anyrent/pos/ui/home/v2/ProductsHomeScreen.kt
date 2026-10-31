package com.anyrent.pos.ui.home.v2

import com.anyrent.pos.data.CurrentOutlet
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.platform.testTag
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ShoppingBasket
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.data.FirstRunGuideApp
import com.anyrent.pos.domain.guide.CoachScreen
import com.anyrent.pos.domain.guide.FirstRunGuide
import com.anyrent.pos.domain.guide.FirstRunGuideAction
import com.anyrent.pos.domain.guide.FirstRunGuideCard
import com.anyrent.pos.domain.guide.FirstRunGuideStep
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.R
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.AddButtonState
import com.anyrent.pos.domain.products.BarcodeMatch
import com.anyrent.pos.domain.products.BranchListing
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.domain.products.ProductImageViewerRequest
import com.anyrent.pos.domain.products.ProductImages
import com.anyrent.pos.domain.products.PricingMode
import com.anyrent.pos.domain.products.ProductRowLogic
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcons
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.home.ImageSearchScreen
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.withContext

/**
 * Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search with image search and
 * barcode scan inside the field, "+" (or the cart count) to the cart; the top-right cart button opens the cart (#952 removed the floating bar).
 */
@OptIn(FlowPreview::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun ProductsHomeScreen(
    onOpenProduct: (Int) -> Unit,
    onOpenCart: () -> Unit,
    viewModel: ProductsHomeViewModel = viewModel(factory = ProductsHomeViewModel.Factory()),
) {
    val state by viewModel.state.collectAsState()
    val lines by CartStore.lines.collectAsState()
    // #1079: the cart bar floats above the bottom navigation; the list leaves room under it
    CartStore.revision.collectAsState().value
    val cartEditing by CartStore.editingOrderId.collectAsState()
    val showsCartBar = CartBarLogic.shouldShow(CartStore.cartCount, lines.sumOf { it.quantity }, cartEditing != null)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf(state.query) }
    var showForm by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    var showImageSearch by remember { mutableStateOf(false) }
    var focusSearch by remember { mutableIntStateOf(0) }
    val searchFocus = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    var viewer by remember { mutableStateOf<ProductImageViewerRequest?>(null) }
    val listState = rememberLazyListState()
    val notFound = stringResource(R.string.v2_scan_not_found)
    val notListed = stringResource(R.string.v2_scan_not_listed)
    val added = stringResource(R.string.v2_added_to_cart)
    // #1393 "Bắt đầu: 3 việc": the list ticks the product row, the two reads the rest
    val guide = FirstRunGuideApp.tracker
    val guideVersion by guide.version.collectAsState()
    val guideCard = remember(guideVersion, state.query) { guide.card(searching = state.query.isNotBlank()) }
    val guideSkipped = stringResource(R.string.first_run_guide_skipped)
    val guideSkipLabel = stringResource(R.string.first_run_guide_skip)
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) scope.launch { guide.refresh() }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(state.products, state.loading, state.query, state.error) {
        if (state.query.isBlank() && !state.loading) {
            guide.noteProducts(if (state.error != null && state.products.isEmpty()) null else state.products.isNotEmpty())
        }
    }
    LaunchedEffect(guideCard) {
        if (guideCard is FirstRunGuideCard.Steps) guide.noteCardShown()
    }

    fun runGuide(step: FirstRunGuideStep) {
        FirstRunCoach.start(step) // #1394: the bubbles run only from here
        when (val action = FirstRunGuide.action(step, guide.hasProduct(), lines.isEmpty())) {
            FirstRunGuideAction.OpenProductForm -> showForm = true
            is FirstRunGuideAction.OpenCart -> {
                if (action.addFirstProduct) {
                    state.products
                        .firstOrNull { BranchListing.listedForRow(it, PermissionManager.role, CurrentOutlet.outlets.size, CurrentOutlet.id) }
                        ?.let { CartStore.addProduct(it) }
                }
                onOpenCart()
            }
        }
    }
    // Cài đặt › Hướng dẫn bắt đầu: a row of the sheet was tapped and this tab is in front
    LaunchedEffect(Unit) {
        FirstRunGuideApp.pendingStep.collect { step ->
            if (step != null) {
                FirstRunGuideApp.pendingStep.value = null
                runGuide(step)
            }
        }
    }
    val guideContent: @Composable (Modifier) -> Unit = { modifier ->
        FirstRunGuideCardView(
            card = guideCard,
            dismissLabel = guideSkipLabel,
            onStep = { runGuide(it) },
            onDismiss = {
                guide.skip()
                Toast.makeText(context, guideSkipped, Toast.LENGTH_LONG).show()
            },
            onCloseFinish = { guide.closeFinish() },
            modifier = modifier,
        )
    }

    LaunchedEffect(Unit) {
        if (state.products.isEmpty()) viewModel.reload()
    }
    // #677: "Còn N" / "Hết hôm nay" follow a created or edited order (quiet: no spinner, same rows and scroll)
    // The view model keeps the version it reflects, so a change made while this screen was away counts too.
    LaunchedEffect(Unit) { OrdersChanged.version.collect { viewModel.onOrdersVersion(it) } }
    // #828: products and stock of the branch now in use
    LaunchedEffect(Unit) { CurrentOutlet.version.drop(1).collect { viewModel.reload() } }
    val deleted by DeletedProducts.ids.collectAsState()
    LaunchedEffect(deleted) { deleted.forEach(viewModel::remove) }
    // #1346: a product edited in the detail screen replaces its row
    val saved by SavedProducts.items.collectAsState()
    LaunchedEffect(saved) {
        if (saved.isNotEmpty()) {
            saved.values.forEach(viewModel::replaceIfPresent)
            SavedProducts.clear()
        }
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

    LaunchedEffect(focusSearch) {
        if (focusSearch == 0) return@LaunchedEffect
        delay(150) // let the image-search dialog give the window back first
        searchFocus.requestFocus()
        keyboard?.show()
    }

    fun findByBarcode(code: String) {
        scope.launch {
            val page = withContext(Dispatchers.IO) { ProductsV2Api.listProducts(1, 20, code) }
            val match = page.getOrNull()?.let { BarcodeMatch.exact(code, it.items) }
            if (match != null) {
                onOpenProduct(match.id)
            } else if (BranchListing.sendsListed(PermissionManager.role, CurrentOutlet.outlets.size)) {
                // #1346: a branch role's list holds only the products ticked at its branch; a code that exists but is not
                // ticked here says so instead of "not found" (there is no button to turn it on)
                val all = withContext(Dispatchers.IO) { ProductsV2Api.listProducts(1, 20, code, applyBranchListing = false) }
                val exists = all.getOrNull()?.let { BarcodeMatch.exact(code, it.items) } != null
                Toast.makeText(context, if (exists) notListed else notFound.format(code), Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(context, notFound.format(code), Toast.LENGTH_LONG).show()
            }
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
                        // #828: "🏬 <branch> ▾" for a merchant with several branches, else the branch name
                        // (replaces "shop · branch"); the 44 dp button sits right above the title (board SP-dong)
                        OutletHeaderButton()
                        Text(stringResource(R.string.v2_home_title), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                    }
                    if (ProductAccess.canCreate(PermissionManager.role)) {
                        IconButton(onClick = { showForm = true }) {
                            Icon(Icons.Outlined.Add, contentDescription = stringResource(R.string.new_product), modifier = Modifier.size(DS.Icon.Lg))
                        }
                    }
                    // #937: the cart (the bell moved to Cài đặt → Thông báo); badge = the cart bar's count
                    val cartBadge = ProductRowLogic.cartBadge(lines.sumOf { it.quantity })
                    IconButton(onClick = onOpenCart) {
                        BadgedBox(badge = { cartBadge?.let { Badge(containerColor = DS.Colors.Primary, contentColor = Color.White) { Text(it) } } }) {
                            Icon(Icons.Outlined.ShoppingBasket, contentDescription = stringResource(R.string.cart), modifier = Modifier.size(DS.Icon.Lg))
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
                                Text(stringResource(R.string.v2_home_search_placeholder), color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body, maxLines = 1)
                            }
                            val searchLabel = stringResource(R.string.v2_home_search_placeholder)
                            BasicTextField(
                                value = draft,
                                onValueChange = { draft = it },
                                singleLine = true,
                                textStyle = TextStyle(fontSize = DS.TextSize.Body, color = DS.Colors.Text),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { viewModel.setQuery(draft) }),
                                modifier = Modifier.fillMaxWidth().focusRequester(searchFocus).semantics { contentDescription = searchLabel },
                            )
                        }
                        if (draft.isNotEmpty()) {
                            IconButton(onClick = { draft = "" }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), modifier = Modifier.size(16.dp))
                            }
                        }
                        FieldIcon(AppIcons.Barcode, stringResource(R.string.camera_scan)) { showScan = true }
                        // #651: image search is the camera button at the end (owner chose option B); #1384: gradient and sparkle
                        ImageSearchButton(stringResource(R.string.v2_home_image_search)) { showImageSearch = true }
                    }
                }
            }
            HorizontalDivider(color = DS.Colors.Border, modifier = Modifier.padding(top = 12.dp))

            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = {
                    viewModel.reload(fromPull = true)
                    scope.launch { CurrentOutlet.refresh() }
                },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    state.loading && state.products.isEmpty() -> LoadingBox()
                    state.products.isEmpty() -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        guideContent(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp))
                        Text(
                            state.error ?: stringResource(if (state.query.isBlank()) R.string.v2_products_empty else R.string.v2_search_empty),
                            color = DS.Colors.TextMuted,
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                        )
                    }
                    else -> LazyColumn(
                        state = listState,
                        contentPadding = PaddingValues(bottom = if (showsCartBar) 96.dp else 16.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        if (guideCard != FirstRunGuideCard.Hidden) {
                            item(key = "first-run-guide") {
                                guideContent(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp))
                            }
                        }
                        items(state.products, key = { it.id }) { product ->
                            ProductRow(
                                product = product,
                                inCart = ProductRowLogic.cartCount(product.id, lines),
                                onOpen = { onOpenProduct(product.id) },
                                // #472: the thumbnail opens the photo full screen; without a photo, detail like the row
                                onImage = { viewer = ProductImages.thumbnailTap(product) ?: run { onOpenProduct(product.id); null } },
                                onAdd = {
                                    CartStore.addProduct(product)
                                    // #893 (owner): no "added to cart" toast; the + count already says it
                                    if (HomeCart.showsAddedToast) Toast.makeText(context, added, Toast.LENGTH_SHORT).show()
                                },
                                onRemove = { CartStore.removeOne(product.id) },
                                listed = BranchListing.listedForRow(product, PermissionManager.role, CurrentOutlet.outlets.size, CurrentOutlet.id),
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

        // #1079: the cart bar (name, items, total, "Xem giỏ"); #952 removed the old floating bar, this one also switches carts
        CartSwitchBar(onOpenCart = onOpenCart, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showForm) {
        AppFormSheet(onDismiss = { showForm = false }, fullScreen = true) {
            ProductFormV2Screen(
                initial = null,
                onBack = {
                    showForm = false
                    FirstRunCoach.stop()
                },
                onSaved = {
                    showForm = false
                    FirstRunCoach.stop()
                    viewModel.replace(it)
                },
            )
            FirstRunCoachOverlay(CoachScreen.PRODUCT_FORM) // #1394
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
    viewer?.let { FullScreenImagePreview(models = it.urls, startIndex = it.startIndex, onDismiss = { viewer = null }) }
    if (showImageSearch) {
        Dialog(
            onDismissRequest = { showImageSearch = false },
            properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false),
        ) {
            ImageSearchScreen(
                onDismiss = { showImageSearch = false },
                onOpenProduct = { product ->
                    showImageSearch = false
                    onOpenProduct(product.id)
                },
                // #672: "Tìm bằng tên" lands in this search field with the keyboard up
                onSearchByName = {
                    showImageSearch = false
                    focusSearch++
                },
            )
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

/** #651, #1384: 38 dp gradient square with a white camera and sparkle; the touch area is 48 dp */
@Composable
private fun ImageSearchButton(label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(48.dp)
            .clickable(onClick = onClick)
            .semantics { contentDescription = label; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(DS.Gradients.AiScan),
            contentAlignment = Alignment.Center,
        ) { Icon(AppIcons.AiScan, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
    }
}

/** #1099: outline of the − n + (iOS `#CBD5E1`) */
private val StepperBorder = Color(0xFFCBD5E1)

/** #681: the + stays light until the product is in the cart (iOS `ProductRowV2Cell.addFill`) */
private val AddFill = Color(0xFFEFF4FF)

/** The Products home row; image search results reuse it (#672) */
@Composable
internal fun ProductRow(
    product: Product,
    inCart: Int,
    onOpen: () -> Unit,
    onImage: () -> Unit,
    onAdd: () -> Unit,
    /** #1099 (iOS #1084/#1090): with it, a product in the cart shows an outlined − n + instead of the solid count */
    onRemove: (() -> Unit)? = null,
    /** #1346: false only for the owner of a shop with several branches, on a product the branch in use does not list */
    listed: Boolean = true,
) {
    val free = ProductRowLogic.subtitle(product).free
    val addState = ProductRowLogic.addState(free, inCart, listed)
    val price = ProductRowLogic.price(product)
    val unitRental = stringResource(R.string.v2_unit_per_rental)
    val unitDay = stringResource(R.string.v2_unit_per_day)
    val unitBlock = stringResource(R.string.v2_unit_per_block)
    val saleShort = stringResource(R.string.v2_price_sale_short)
    val viewLabel = stringResource(R.string.v2_view_image_named, product.name)
    val viewHint = stringResource(R.string.v2_view_image_hint)
    val addLabel = if (addState is AddButtonState.InCart) {
        stringResource(R.string.v2_add_in_cart_named, product.name, addState.count)
    } else {
        stringResource(R.string.v2_add_to_cart_named, product.name)
    }
    Column(Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = DS.Gap.ProductRowMinHeight).padding(horizontal = DS.Gap.RowHorizontal, vertical = DS.Gap.ProductRow),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val thumbUrl = ProductImages.thumbnailUrl(product)
            ProductThumb(
                thumbUrl, 68.dp, 12.dp,
                // With a photo the thumbnail is its own button; the placeholder leaves the tap to the row
                modifier = if (thumbUrl == null) Modifier else Modifier
                    .semantics { contentDescription = viewLabel }
                    .clickable(onClickLabel = viewHint, role = Role.Button, onClick = onImage),
            )
            // #681: name, price, stock — one fact per line, 8 dp apart
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DS.Spacing.sm)) {
                // #937: up to two lines, then "…" (Home only)
                Text(product.name, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, color = DS.Colors.Text, maxLines = ProductRowLogic.NAME_MAX_LINES, overflow = TextOverflow.Ellipsis)
                val unit = { mode: PricingMode -> when (mode) { PricingMode.PER_DAY -> unitDay; PricingMode.BLOCK -> unitBlock; PricingMode.PER_RENTAL -> unitRental } }
                val text = buildAnnotatedString {
                    val muted = SpanStyle(fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                    val mode = price?.mainMode
                    if (price != null && mode != null) {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = DS.TextSize.Name, color = DS.Colors.Text)) { append(formatMoneyVnd(price.main)) }
                        withStyle(muted) { append(unit(mode)) }
                        val second = price.second
                        val secondMode = price.secondMode
                        if (second != null && secondMode != null) {
                            withStyle(muted) { append(" · " + formatMoneyVnd(second) + unit(secondMode)) }
                        }
                        // #887: a product that also sells keeps its sale price last (board SP-dong, iOS)
                        price.sale?.let { sale -> withStyle(muted) { append(" · " + saleShort.format(formatMoneyVnd(sale))) } }
                    } else if (price != null) {
                        withStyle(muted) { append(saleShort.format(formatMoneyVnd(price.main))) }
                    }
                }
                Text(text, maxLines = 2)
                Text(
                    "● " + when {
                        // #1346: the owner sees it; the branch in use does not list it (only the owner ticks it back, in the form)
                        !listed -> stringResource(R.string.products_listing_not_shown)
                        free > 0 -> stringResource(R.string.v2_stock_free, free)
                        else -> stringResource(R.string.v2_stock_none_today)
                    },
                    fontSize = 13.sp,
                    // #468: the colour carries the state; #1080 (owner): regular weight
                    fontWeight = FontWeight.Normal,
                    color = when {
                        !listed -> DS.Colors.TextMuted
                        free <= 0 -> V2Colors.Danger
                        free == 1 -> V2Colors.Warn
                        else -> V2Colors.Ok
                    },
                    maxLines = 1,
                )
            }
            if (addState is AddButtonState.InCart && onRemove != null) {
                // #1099 (iOS mockup A, #1090): thin grey outline on white, blue − and +, the count in the middle,
                // like the quantity box in the cart; − at 1 takes the product out of the cart
                val minusLabel = stringResource(R.string.v2_stepper_minus)
                Row(
                    Modifier
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color.White)
                        .border(1.dp, StepperBorder, RoundedCornerShape(22.dp))
                        .testTag("product.row.stepper"),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier.size(width = 40.dp, height = 44.dp).clickable(onClick = onRemove)
                            .semantics { contentDescription = minusLabel; role = Role.Button },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Remove, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Sm))
                    }
                    Text(
                        addState.count.toString(), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                        modifier = Modifier.widthIn(min = 22.dp).semantics { contentDescription = addLabel },
                        textAlign = TextAlign.Center,
                    )
                    Box(
                        Modifier.size(width = 40.dp, height = 44.dp).clickable(onClick = onAdd)
                            .semantics { contentDescription = addLabel; role = Role.Button },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Sm))
                    }
                }
            } else if (addState is AddButtonState.NotListed) {
                // #1346: nothing to add; the row still opens the product
            } else {
                // #671: round, and the same when out today (tapping still adds; "Hết hôm nay" says the rest).
                // #681: light until the product is in the cart, then solid primary with the count
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (addState is AddButtonState.InCart) DS.Colors.Primary else AddFill)
                        .clickable(onClick = onAdd)
                        .semantics { contentDescription = addLabel; role = Role.Button },
                    contentAlignment = Alignment.Center,
                ) {
                    if (addState is AddButtonState.InCart) {
                        Text(addState.count.toString(), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = Color.White)
                    } else {
                        Icon(Icons.Outlined.Add, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Sm))
                    }
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/** #893 (owner): no "added to cart" toast. #952 (owner): no floating cart bar; the top-right cart button is the only entry */
internal object HomeCart {
    const val showsFloatingBar = false
    const val showsAddedToast = false
}
