package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartOrderSubmit
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.availability.OverlapWarnings
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.CreateOrderSheet
import com.anyrent.pos.domain.orders.CreateOrderSubmission
import com.anyrent.pos.domain.orders.EditOrderSheet
import com.anyrent.pos.domain.products.CartLineCalc
import com.anyrent.pos.domain.products.CartProblem
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppNumericPadSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.customers.CustomersScreen
import com.anyrent.pos.ui.orders.shareIsVietnamese
import com.anyrent.pos.ui.customers.v2.CustomerPickerSheet
import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.ui.theme.DS
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

/**
 * Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
 * State lives in [CartStore]. "Tạo đơn" confirms a new order in a sheet on this screen and sends the review screen's
 * create request ([CartOrderSubmit], #476); "Lưu thay đổi" saves an edited order from a sheet with the review screen's
 * update request and checks (#676), then [onOrderSaved].
 */
@Composable
fun CartV2Screen(
    onBack: () -> Unit,
    /** "+ Add": the product list on Home (#433), not the screen that opened the cart */
    onAddItems: () -> Unit = onBack,
    /** "Tạo đơn mới" after a create (#476): the product list with an empty cart */
    onNewOrder: () -> Unit = onAddItems,
    /** "Xem đơn" after a create (#476) */
    onOpenOrder: (Int) -> Unit = {},
    /** #676: an edited order was saved: its id and short number (null for a draft saved before #676) */
    onOrderSaved: (Int, String?) -> Unit = { id, _ -> onOpenOrder(id) },
    /** #677 "Huỷ sửa": edit mode left and the cart emptied; the order's detail again (loaded fresh) */
    onEditCancelled: (Int) -> Unit = onOpenOrder,
    /** #684: the "Hết hàng …" tag → Lịch trống of the product on that day (`yyyy-MM-dd`) */
    onOpenCalendar: (Int, String) -> Unit = { _, _ -> },
) {
    val lines by CartStore.lines.collectAsState()
    val customer by CartStore.customer.collectAsState()
    val orderType by CartStore.orderType.collectAsState()
    val pickup by CartStore.pickupDate.collectAsState()
    val ret by CartStore.returnDate.collectAsState()
    val datesChosen by CartStore.datesChosen.collectAsState()
    val notes by CartStore.notes.collectAsState()
    val discount by CartStore.discount.collectAsState()
    val discountType by CartStore.discountType.collectAsState()
    val deposit by CartStore.depositAmount.collectAsState()
    val editingOrderId by CartStore.editingOrderId.collectAsState()
    val editOriginal by CartStore.editOriginal.collectAsState()
    val isSale = orderType == "SALE"
    val app = LocalContext.current.applicationContext as AnyRentApp

    // Same money as the old cart: computed from the collected lines so every change redraws
    val subtotal = lines.sumOf { it.lineTotal }
    val discountAmount = when (discountType) {
        CartStore.DiscountType.AMOUNT -> discount.coerceAtLeast(0.0)
        CartStore.DiscountType.PERCENT -> subtotal * (discount.coerceIn(0.0, 100.0) / 100.0)
    }
    val total = (subtotal - discountAmount).coerceAtLeast(0.0)

    // Batch availability of the lines for the chosen dates; #518 also reads which other orders hold them
    var availability by remember { mutableStateOf<Map<Int, ProductAvailability>>(emptyMap()) }
    val available = availability.mapValues { it.value.effectivelyAvailable }
    var showCustomer by remember { mutableStateOf(false) }
    var showDates by remember { mutableStateOf(false) }
    var numericEditor by remember { mutableStateOf<String?>(null) }
    var numericText by remember { mutableStateOf("0") }
    var noteDraft by remember { mutableStateOf<String?>(null) }
    // #480: photos of the note being edited; the cart keeps the saved set (CartStore.noteImageFiles)
    var noteDraftFiles by remember { mutableStateOf<List<java.io.File>>(emptyList()) }
    var notePicking by remember { mutableStateOf(false) }
    var notePreview by remember { mutableStateOf<Any?>(null) }
    val noteContext = LocalContext.current
    val noteScope = androidx.compose.runtime.rememberCoroutineScope()
    val notePicker = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        notePicking = false
        val slots = com.anyrent.pos.domain.notifications.NoteEditorLogic.remaining(noteDraftFiles.size)
        if (uris.isEmpty() || slots <= 0) return@rememberLauncherForActivityResult
        noteScope.launch {
            val copied = withContext(Dispatchers.IO) {
                uris.take(slots).mapNotNull { runCatching { noteContext.copyUriToCacheFile(it) }.getOrNull() }
            }
            noteDraftFiles = noteDraftFiles + copied
        }
    }
    var removeLine by remember { mutableStateOf<CartLine?>(null) }
    // #677: the "Huỷ sửa đơn #…?" confirm is open
    var confirmCancelEdit by remember { mutableStateOf(false) }
    // #482: product id of the line whose "Cách tính giá" sheet is open
    var pricingLineId by remember { mutableStateOf<Int?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    // iOS `Cart.validate()` copy, all problems in one alert (#448)
    val needPriceText = stringResource(R.string.v2_cart_need_price)
    val problemText = mapOf(
        CartProblem.EMPTY to stringResource(R.string.v2_cart_need_items),
        CartProblem.NO_CUSTOMER to stringResource(R.string.v2_cart_need_customer),
        CartProblem.NO_PICKUP to stringResource(R.string.v2_cart_need_pickup),
        CartProblem.NO_RETURN to stringResource(R.string.v2_cart_need_return),
    )

    // Batch availability for the dates (rent) or today (sale), same call as the old cart's check
    val availabilityKey = lines.map { it.product.id to it.quantity } to listOf(isSale, pickup, ret, datesChosen, editingOrderId)
    LaunchedEffect(availabilityKey) {
        // iOS checks a rental only once dates are picked
        if (lines.isEmpty() || (!isSale && !datesChosen)) {
            availability = emptyMap()
            return@LaunchedEffect
        }
        delay(300)
        val today = ShopTime.today()
        val result = runCatching {
            app.container.availabilityRepository.checkBatchAvailability(
                requests = lines.map { AvailabilityRequest(it.product.id, it.quantity) },
                startDate = if (isSale) today else pickup,
                endDate = if (isSale) today else ret,
                // #634: an edited order does not count against itself (iOS `excludeOrderId: cart.orderId`)
                excludeOrderId = editingOrderId,
            )
        }
        result.onSuccess { map -> availability = map }
    }

    // #518 "Cho tạo đơn khi trùng lịch": the shop setting (re-read once per screen, the owner may change it on the
    // web) and the rental lines other orders already hold on the chosen days. An edited order is excluded from the
    // batch check (#634), so its conflicts are the other orders' only, as on iOS.
    val allowOverlap by SessionStore.allowOverlappingOrdersFlow.collectAsState()
    LaunchedEffect(Unit) { withContext(Dispatchers.IO) { ApiClient.get().refreshAllowOverlappingOrders() } }
    val overlapConflicts = if (isSale || !datesChosen) {
        emptyList<OverlapWarnings.LineConflict>()
    } else {
        lines.mapNotNull { line ->
            OverlapWarnings.conflict(line.product.id, line.product.name, line.quantity, availability[line.product.id], pickup, ret)
        }
    }
    val overlapTexts = OverlapWarnings.Texts(
        cartLineOneDay = stringResource(R.string.v2_cart_overlap_one_day),
        cartLineRange = stringResource(R.string.v2_cart_overlap_range),
        confirmLine = stringResource(R.string.v2_create_overlap_line),
        confirmLineNoOrder = stringResource(R.string.v2_create_overlap_line_no_order),
    )
    val createBlocked = OverlapWarnings.blocksCreate(allowOverlap, overlapConflicts)
    val overlapBlockedMessage = stringResource(R.string.v2_cart_overlap_blocked)

    // #473 — a rent line without "Theo lần / Theo ngày" may be stale (added before the product got its second price,
    // restored from disk, or loaded from an edited order): reload that product once per screen and let the line take
    // its prices. A product with one price stays without the toggle.
    val pricingChecked = remember { mutableSetOf<Int>() }
    val staleIds = if (isSale) emptyList() else lines.filterNot { CartV2Logic.offersBothModes(it.product) }.map { it.product.id }
    LaunchedEffect(staleIds) {
        staleIds.filter { it > 0 && pricingChecked.add(it) }.forEach { productId ->
            withContext(Dispatchers.IO) { ApiClient.get().getProduct(productId) }
                .onSuccess { CartStore.refreshPricing(it) }
        }
    }

    // #476: confirm sheet → create → "Đã tạo đơn" sheet, without leaving the cart
    val submission = remember { CreateOrderSubmission() }
    var confirmSheet by remember { mutableStateOf<CreateOrderSheet.Confirm?>(null) }
    var submitting by remember { mutableStateOf(false) }
    var createdSheet by remember { mutableStateOf<Pair<CreateOrderSheet.Created, Int>?>(null) }
    val scope = rememberCoroutineScope()
    val validateRentalCart = remember { ValidateRentalCartAvailability(app.container.availabilityRepository) }
    val sessionExpiredMessage = stringResource(R.string.session_expired_error)
    val availabilityFailedMessage = stringResource(R.string.availability_check_failed)
    val conflictsLabel = stringResource(R.string.availability_conflicts)
    val validationFallbackMessage = stringResource(R.string.order_validation_fallback)

    // Same checks, request and messages as the review screen's submit (CartCheckoutScreen)
    fun submitOrder(confirm: CreateOrderSheet.Confirm) {
        if (!submission.begin()) return
        submitting = true
        scope.launch {
            if (!confirm.isSale) {
                val check = runCatching { CartOrderSubmit.blockedRentalLines(validateRentalCart) }
                val failure = check.exceptionOrNull()
                // #518: ON lets a double booking through (the sheet already warned, "Vẫn tạo đơn"); OFF stops lines
                // other orders hold, like the API (409 ORDER_SCHEDULE_CONFLICT). Lines only short of stock go to the API.
                val allowOverlapNow = SessionStore.allowOverlappingOrders
                val blocked = check.getOrNull().orEmpty().filter { !allowOverlapNow && it.availability.conflicts.isNotEmpty() }
                if (failure != null || blocked.isNotEmpty()) {
                    submission.failed()
                    submitting = false
                    error = when {
                        failure is AppError.Unauthorized -> sessionExpiredMessage
                        failure != null -> "$availabilityFailedMessage\n${failure.message.orEmpty()}"
                        else -> overlapBlockedMessage
                    }
                    return@launch
                }
            }
            // #480: the cart note photos go with the create, ~180KB JPEG each (none = the same request as before)
            val result = withContext(Dispatchers.IO) {
                runCatching { CartStore.noteImageFiles.value.map { com.anyrent.pos.ui.common.fileToNotesJpegBytes(it) } }
                    .fold({ photos -> CartOrderSubmit.create(submission.idempotencyKey, photos) }, { Result.failure(it) })
            }
            submitting = false
            result.onSuccess { order ->
                submission.succeeded()
                OrdersChanged.notifyChanged() // #674: Orders, Calendar and Overview refresh on next show
                CartStore.clear()
                confirmSheet = null
                createdSheet = CreateOrderSheet.created(order.orderNumber, confirm) to order.id
            }.onFailure {
                // The cart and the sheet stay; the next confirm retries with the same key
                submission.failed()
                error = it.message
                    ?.takeUnless { message -> message.isBlank() || message.equals("Validation error", ignoreCase = true) }
                    ?: validationFallbackMessage
            }
        }
    }

    // #676 (board sua-don): "Lưu thay đổi" sheet → the review screen's update request → the order's detail
    val editSubmission = remember { CreateOrderSubmission() }
    var editSheet by remember { mutableStateOf<EditOrderSheet.Confirm?>(null) }
    var saving by remember { mutableStateOf(false) }

    fun saveEditedOrder() {
        val orderId = editingOrderId ?: return
        if (!editSubmission.begin()) return
        saving = true
        val number = EditOrderSheet.number(editOriginal)
        scope.launch {
            // Same check, request and messages as the review screen's save (CartCheckoutScreen)
            val blocked = CartOrderSubmit.editAvailabilityError(
                validateRentalCart, orderId, sessionExpiredMessage, availabilityFailedMessage, conflictsLabel,
            )
            if (blocked != null) {
                editSubmission.failed()
                saving = false
                error = blocked
                return@launch
            }
            val result = withContext(Dispatchers.IO) { CartOrderSubmit.update(orderId) }
            saving = false
            result.onSuccess { order ->
                editSubmission.succeeded()
                OrdersChanged.notifyChanged() // #674
                CartStore.clear()
                editSheet = null
                onOrderSaved(order.id.takeIf { it > 0 } ?: orderId, number)
            }.onFailure {
                // The cart and the sheet stay; the next tap retries
                editSubmission.failed()
                error = CartOrderSubmit.errorMessage(it, validationFallbackMessage)
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(60.dp).padding(start = 4.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.v2_cart_back), modifier = Modifier.size(DS.Icon.Lg))
            }
            Column(Modifier.weight(1f)) {
                // #676: "Sửa đơn #482913" over "Heather Robinson · Đơn thuê" while editing an order
                val number = EditOrderSheet.number(editOriginal)
                Text(
                    when {
                        editingOrderId == null -> stringResource(R.string.v2_cart_title)
                        number != null -> stringResource(R.string.v2_cart_edit_title_number, number)
                        else -> stringResource(R.string.v2_cart_edit_title)
                    },
                    // #677: the edit title keeps its full number on a 360dp phone ("Huỷ sửa" replaces the switch)
                    fontSize = if (editingOrderId == null) 20.sp else 18.sp,
                    fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                if (editingOrderId != null) {
                    Text(
                        editOrderSubtitle(customer?.displayName.orEmpty(), isSale),
                        fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            // #640: the cart as a draft image ("Đơn nháp"), once it has lines (rent: dates chosen)
            val shareContext = LocalContext.current
            IconButton(
                onClick = {
                    scope.launch {
                        runCatching {
                            com.anyrent.pos.ui.orders.shareOrderImage(
                                shareContext,
                                com.anyrent.pos.domain.orders.OrderShareModel.fromDraft(
                                    lines = lines,
                                    customer = customer,
                                    isSale = isSale,
                                    pickup = pickup.takeIf { datesChosen },
                                    returnDate = ret.takeIf { datesChosen },
                                    discountAmount = discountAmount,
                                    deposit = deposit,
                                    securityDeposit = CartStore.securityDeposit.value,
                                    collateralDetails = CartStore.collateralDetails.value,
                                    shop = com.anyrent.pos.ui.orders.shareShop(),
                                    vi = shareContext.shareIsVietnamese(),
                                ),
                            )
                        }.onFailure { error = it.message }
                    }
                },
                enabled = lines.isNotEmpty() && (isSale || datesChosen),
            ) {
                Icon(Icons.Outlined.Share, contentDescription = stringResource(R.string.share_draft_action), modifier = Modifier.size(DS.Icon.Lg))
            }
            if (editingOrderId != null) {
                // #677 (iOS `cancelEditButton`): "Huỷ sửa" in place of the Thuê / Bán switch, which cannot change while editing
                Text(
                    stringResource(R.string.v2_cart_edit_cancel),
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = Color(0xFFB91C1C), maxLines = 1,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { confirmCancelEdit = true }
                        .heightIn(min = 48.dp)
                        .wrapContentHeight()
                        .padding(horizontal = 8.dp)
                        .semantics { role = Role.Button },
                )
            } else {
                V2Segmented(
                    titles = listOf(stringResource(R.string.v2_cart_rent), stringResource(R.string.v2_cart_sale)),
                    selected = if (isSale) 1 else 0,
                    onSelect = { CartStore.setOrderType(if (it == 1) "SALE" else "RENT") },
                )
            }
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
            CustomerRow(name = customer?.displayName, phone = customer?.phone, onClick = { showCustomer = true })
            if (!isSale) {
                HorizontalDivider(color = DS.Colors.Divider)
                Row(
                    Modifier.fillMaxWidth().clickable { showDates = true }.heightIn(min = 56.dp).padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (!datesChosen) {
                        // iOS starts with no dates: "Chọn ngày thuê" in the primary colour, no day pill (#448)
                        Text(
                            stringResource(R.string.v2_cart_pick_dates),
                            fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        Text(
                            "${formatDay(pickup)} → ${formatDay(ret)}",
                            fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f),
                        )
                        Text(
                            CartV2Logic.rentalDays(pickup, ret).let { pluralStringResource(R.plurals.v2_cart_days, it, it) },
                            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF),
                            modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 10.dp, vertical = 3.dp),
                        )
                    }
                }
            }

            SectionBand(stringResource(R.string.v2_cart_items, lines.sumOf { it.quantity })) {
                Text(
                    "+ " + stringResource(R.string.v2_cart_add_more),
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
                    modifier = Modifier.clickable(onClick = onAddItems).padding(vertical = 8.dp).semantics { role = Role.Button },
                )
            }
            if (lines.isEmpty()) {
                Text(stringResource(R.string.v2_cart_empty), color = DS.Colors.TextMuted, modifier = Modifier.padding(16.dp))
            }
            lines.forEach { line ->
                ItemRow(
                    line = line,
                    isSale = isSale,
                    available = available[line.product.id],
                    overlapText = overlapConflicts.firstOrNull { it.productId == line.product.id }?.let { OverlapWarnings.cartLine(it, overlapTexts) },
                    onOpenOverlap = overlapConflicts.firstOrNull { it.productId == line.product.id }?.let { c ->
                        { onOpenCalendar(c.productId, c.from.toString()) }
                    },
                    onQuantity = { q -> if (q <= 0) removeLine = line else CartStore.updateQuantity(line.product.id, q) },
                    onOpenPricing = { pricingLineId = line.product.id },
                )
            }

            SectionBand(stringResource(R.string.v2_cart_money))
            V2ValueRow(stringResource(if (isSale) R.string.v2_cart_sale_subtotal else R.string.v2_cart_rent_subtotal), formatMoneyVnd(subtotal), valueColor = DS.Colors.Text)
            ThinDivider()
            V2ValueRow(
                stringResource(R.string.v2_cart_discount),
                if (discountAmount > 0) formatMoneyVnd(-discountAmount) else formatMoneyVnd(0.0),
                onClick = { numericText = discount.toLong().toString(); numericEditor = "DISCOUNT" },
                valueColor = if (discountAmount > 0) V2Colors.Ok else DS.Colors.TextMuted,
            )
            ThinDivider()
            V2ValueRow(stringResource(R.string.v2_cart_total), formatMoneyVnd(total), valueColor = DS.Colors.Text, bold = true)
            ThinDivider()
            if (!isSale) {
                V2ValueRow(
                    stringResource(R.string.v2_cart_deposit), formatMoneyVnd(deposit),
                    onClick = { numericText = deposit.toLong().toString(); numericEditor = "DEPOSIT" },
                    valueColor = DS.Colors.Primary,
                )
                ThinDivider()
            }
            V2ValueRow(
                stringResource(R.string.v2_cart_note),
                notes.ifBlank { stringResource(R.string.v2_cart_add_note) },
                onClick = { noteDraftFiles = CartStore.noteImageFiles.value; noteDraft = notes },
                valueColor = if (notes.isBlank()) DS.Colors.Primary else DS.Colors.TextMuted,
            )
            Spacer(Modifier.height(24.dp))
        }

        HorizontalDivider(color = DS.Colors.Border)
        if (createBlocked) {
            // #518 board GH-trung-tat: the shop does not allow overlapping rentals
            OverlapNotice(
                text = overlapBlockedMessage,
                background = Color(0xFFFEF2F2), borderColor = Color(0xFFFECACA), tint = Color(0xFFB91C1C), textColor = Color(0xFF991B1B),
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp),
            )
        }
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                if (editingOrderId != null) {
                    // #676 (board sua-don): nothing is collected on save; the bar shows the order total
                    Text(stringResource(R.string.v2_cart_total), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                    Text(formatMoneyVnd(total), fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold)
                } else {
                    Text(stringResource(if (isSale) R.string.v2_cart_customer_pays else R.string.v2_cart_collect_deposit), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                    Text(formatMoneyVnd(CartV2Logic.collectNow(isSale, total, deposit)), fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold)
                }
            }
            AppPrimaryButton(
                stringResource(
                    when (EditOrderSheet.ctaLabel(editing = editingOrderId != null, isSale = isSale)) {
                        EditOrderSheet.CtaLabel.SAVE_CHANGES -> R.string.v2_cart_edit_save
                        EditOrderSheet.CtaLabel.SELL_AND_COLLECT -> R.string.v2_cart_sell_and_collect
                        EditOrderSheet.CtaLabel.CREATE -> R.string.v2_cart_create
                    },
                ),
                modifier = Modifier.weight(1.1f),
                enabled = !createBlocked,
                onClick = {
                    val problems = CartV2Logic.problems(lines.sumOf { it.quantity }, customer != null, isSale, datesChosen)
                    val messages = problems.map { problemText.getValue(it) } +
                        CartV2Logic.missingPrices(lines, isSale).map { needPriceText.format(it) }
                    if (messages.isNotEmpty()) {
                        error = messages.joinToString("\n")
                    } else if (CreateOrderSheet.ctaRoute(editing = editingOrderId != null) == CreateOrderSheet.CtaRoute.EDIT_SHEET) {
                        if (editSheet == null) {
                            editSheet = EditOrderSheet.confirm(
                                isSale = isSale,
                                customerName = customer?.displayName.orEmpty(),
                                pickup = pickup,
                                returnDate = ret,
                                lines = lines,
                                total = total,
                                original = editOriginal,
                                deposit = deposit,
                                securityDeposit = CartStore.securityDeposit.value,
                            )
                        }
                    } else if (confirmSheet == null && createdSheet == null) {
                        confirmSheet = CreateOrderSheet.confirm(
                            isSale = isSale,
                            customerName = customer?.displayName.orEmpty(),
                            pickup = pickup,
                            returnDate = ret,
                            lines = lines.map { it.product.name to it.quantity },
                            total = total,
                            deposit = deposit,
                        )
                    }
                },
            )
        }
    }

    if (showCustomer && FeatureFlags.isOn(MobileFeature.NEW_CUSTOMERS)) {
        // #387: redesigned picker behind `newCustomers`; sets the customer the same way as the current one
        AppFormSheet(onDismiss = { showCustomer = false }) {
            CustomerPickerSheet(
                onPicked = { picked ->
                    CartStore.setCustomer(picked)
                    showCustomer = false
                },
                onClose = { showCustomer = false },
            )
        }
    } else if (showCustomer) {
        AppFormSheet(onDismiss = { showCustomer = false }) {
            CustomersScreen(
                pickMode = true,
                embeddedInSheet = true,
                onPicked = { picked ->
                    CartStore.setCustomer(picked)
                    showCustomer = false
                },
                onBack = { showCustomer = false },
            )
        }
    }
    if (showDates) {
        AppDateRangePickerSheet(
            title = stringResource(R.string.select_rental_period),
            subtitle = stringResource(R.string.rental_period),
            startLabel = stringResource(R.string.pickup_date),
            endLabel = stringResource(R.string.return_date),
            initialStart = pickup,
            initialEnd = ret,
            onDismiss = { showDates = false },
            onConfirm = { start, end ->
                CartStore.setPickup(start)
                CartStore.setReturn(end)
                showDates = false
            },
        )
    }
    pricingLineId?.let { id ->
        val line = lines.firstOrNull { it.product.id == id }
        if (line == null) {
            pricingLineId = null
        } else {
            CartPricingSheet(
                line = line,
                isSale = isSale,
                days = CartStore.rentalDaysInclusive(),
                onDismiss = { pricingLineId = null },
                onApply = { type, price ->
                    // The line price for this order only, any role, never the product's price (owner 2026-10-05)
                    CartStore.applyLinePricing(id, type, price)
                    pricingLineId = null
                },
            )
        }
    }
    numericEditor?.let { editor ->
        val priceProductId = editor.removePrefix("PRICE:").takeIf { editor.startsWith("PRICE:") }?.toIntOrNull()
        AppNumericPadSheet(
            title = when {
                priceProductId != null -> lines.firstOrNull { it.product.id == priceProductId }?.product?.name
                    ?: stringResource(R.string.v2_cart_edit_price)
                editor == "DEPOSIT" -> stringResource(R.string.enter_deposit)
                else -> stringResource(R.string.enter_discount)
            },
            rawValue = numericText,
            onRawValueChange = { numericText = it },
            onDismiss = { numericEditor = null },
            onConfirm = {
                val value = numericText.toDoubleOrNull() ?: 0.0
                when {
                    // The line price for this order only, never the product's price (owner 2026-10-05)
                    priceProductId != null -> CartStore.updateUnitPrice(priceProductId, value)
                    editor == "DEPOSIT" -> CartStore.setDeposit(value)
                    else -> CartStore.setDiscount(value)
                }
                numericEditor = null
            },
        ) {
            if (editor == "DISCOUNT") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppFilterChip("%", discountType == CartStore.DiscountType.PERCENT, { CartStore.setDiscountType(CartStore.DiscountType.PERCENT) }, Modifier.weight(1f))
                    AppFilterChip(stringResource(R.string.v2_cart_discount_amount), discountType == CartStore.DiscountType.AMOUNT, { CartStore.setDiscountType(CartStore.DiscountType.AMOUNT) }, Modifier.weight(1f))
                }
            }
        }
    }
    noteDraft?.let { draft ->
        // #477: note editor of board GC-ghi-chu. #480: with photos, kept by the cart and sent on create; editing an
        // existing order stays text only (its photos live on the order detail)
        val saved = CartStore.noteImageFiles.value
        com.anyrent.pos.ui.orders.v2.NoteEditorV2(
            orderNumber = null, text = draft, onTextChange = { noteDraft = it }, busy = false, error = null,
            showPhotos = editingOrderId == null,
            files = noteDraftFiles,
            onRemoveFile = { file -> noteDraftFiles = noteDraftFiles - file },
            onAdd = { notePicking = true; notePicker.launch("image/*") },
            onPreview = { notePreview = it },
            onDismiss = {
                if (!notePicking) {
                    // Close without saving: drop the photos picked in this round only
                    (noteDraftFiles - saved.toSet()).forEach { runCatching { it.delete() } }
                    noteDraft = null
                }
            },
            onSave = {
                CartStore.setNotes(draft.trim())
                if (editingOrderId == null) {
                    (saved - noteDraftFiles.toSet()).forEach { runCatching { it.delete() } }
                    CartStore.setNoteImageFiles(noteDraftFiles)
                }
                noteDraft = null
            },
        )
    }
    notePreview?.let { com.anyrent.pos.ui.common.FullScreenImagePreview(model = it, onDismiss = { notePreview = null }) }
    if (confirmCancelEdit) {
        val number = EditOrderSheet.number(editOriginal)
        AppAlertConfirm(
            title = number?.let { stringResource(R.string.v2_cart_edit_cancel_title, it) }
                ?: stringResource(R.string.v2_cart_edit_cancel_title_no_number),
            message = stringResource(R.string.v2_cart_edit_cancel_message),
            confirmLabel = stringResource(R.string.v2_cart_edit_cancel),
            cancelLabel = stringResource(R.string.v2_edit_confirm_keep_editing),
            destructive = true,
            onDismiss = { confirmCancelEdit = false },
            onConfirm = {
                confirmCancelEdit = false
                CartStore.cancelEdit()?.let(onEditCancelled)
            },
        )
    }
    removeLine?.let { line ->
        AppAlertConfirm(
            title = stringResource(R.string.v2_cart_remove_title),
            message = line.product.name,
            confirmLabel = stringResource(R.string.v2_cart_remove),
            destructive = true,
            onDismiss = { removeLine = null },
            onConfirm = {
                CartStore.remove(line.product.id)
                removeLine = null
            },
        )
    }
    confirmSheet?.let { confirm ->
        CreateOrderConfirmSheet(
            confirm = confirm,
            busy = submitting,
            // #518 board GH-trung-bat: orange "Trùng lịch" block and "Vẫn tạo đơn"
            overlapLines = if (!confirm.isSale && OverlapWarnings.warnsOnConfirm(allowOverlap, overlapConflicts)) {
                overlapConflicts.map { OverlapWarnings.confirmLine(it, overlapTexts) }
            } else {
                emptyList()
            },
            onDismiss = { confirmSheet = null },
            onConfirm = { submitOrder(confirm) },
        )
    }
    editSheet?.let { confirm ->
        EditOrderConfirmSheet(
            confirm = confirm,
            busy = saving,
            onDismiss = { editSheet = null },
            onConfirm = { saveEditedOrder() },
        )
    }
    createdSheet?.let { (created, orderId) ->
        OrderCreatedSheet(
            created = created,
            onDismiss = { createdSheet = null },
            onNewOrder = {
                createdSheet = null
                onNewOrder()
            },
            onViewOrder = {
                createdSheet = null
                onOpenOrder(orderId)
            },
        )
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

private fun formatDay(date: LocalDate): String =
    formatDayShort(date)

@Composable
private fun CustomerRow(name: String?, phone: String?, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val initials = name?.split(" ")?.filter { it.isNotBlank() }?.let { words ->
            listOfNotNull(words.firstOrNull()?.first(), words.drop(1).lastOrNull()?.first()).joinToString("").uppercase()
        } ?: "+"
        Box(Modifier.size(40.dp).clip(CircleShape).background(Color(0xFFDBEAFE)), contentAlignment = Alignment.Center) {
            Text(initials, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = Color(0xFF1E40AF))
        }
        Column(Modifier.weight(1f)) {
            Text(
                name ?: stringResource(R.string.v2_cart_pick_customer),
                fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold,
                color = if (name == null) DS.Colors.Primary else DS.Colors.Text,
            )
            if (!phone.isNullOrBlank()) Text(phone, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
        if (name != null) Text(stringResource(R.string.v2_cart_change), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
    }
}

@Composable
private fun ItemRow(
    line: CartLine,
    isSale: Boolean,
    available: Int?,
    /** #518 / #684 "Hết hàng từ 03/10 → 05/10"; replaces the shortage chip */
    overlapText: String? = null,
    /** #684: a tap on the tag opens Lịch trống on the first booked-out day */
    onOpenOverlap: (() -> Unit)? = null,
    onQuantity: (Int) -> Unit,
    onOpenPricing: () -> Unit,
) {
    val calc = CartV2Logic.calc(line, isSale)
    val price = formatMoneyVnd(calc.unitPrice)
    val calcText = when (val kind = calc.kind) {
        CartLineCalc.Kind.Sale -> stringResource(R.string.v2_calc_sale, price, calc.quantity)
        CartLineCalc.Kind.PerRental -> stringResource(R.string.v2_calc_per_rental, price, calc.quantity)
        is CartLineCalc.Kind.PerDay -> pluralStringResource(R.plurals.v2_calc_per_day, kind.days, price, kind.days) +
            if (calc.quantity > 1) " × ${formatQuantity(calc.quantity)}" else ""
    }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ProductThumb(line.product.images.firstOrNull() ?: line.product.imageUrl, 56.dp, 10.dp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(line.product.name, fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(formatMoneyVnd(calc.total), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, maxLines = 1)
                }
                Text(
                    calcText, fontSize = DS.TextSize.Secondary,
                    color = if (CartV2Logic.needsPrice(line, isSale)) Color(0xFFB91C1C) else DS.Colors.TextMuted,
                )
                val shortText = overlapText ?: CartV2Logic.shortage(available, line.quantity)?.let { left ->
                    stringResource(if (isSale) R.string.v2_cart_short_stock else R.string.v2_cart_short_rent, left)
                }
                shortText?.let { text ->
                    val hint = stringResource(R.string.v2_cart_overlap_hint)
                    Text(
                        if (onOpenOverlap != null) "$text ›" else text,
                        fontSize = DS.TextSize.Pill, fontWeight = FontWeight.SemiBold, color = Color(0xFF991B1B),
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFFFEE2E2))
                            .then(if (onOpenOverlap != null) Modifier.clickable(onClickLabel = hint, role = Role.Button, onClick = onOpenOverlap) else Modifier)
                            .padding(horizontal = 8.dp, vertical = if (onOpenOverlap != null) 6.dp else 2.dp),
                    )
                }
                // #482 (board Gio-hang): one chip with the line's pricing; it opens the "Cách tính giá" sheet
                PricingChip(line, isSale, onOpenPricing)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        if (isSale && available != null) {
                            Text(stringResource(R.string.v2_cart_in_stock, available), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                        }
                    }
                    V2Stepper(value = line.quantity, onChange = onQuantity, minimum = 0, compact = true)
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/** "Theo ngày · 150.000đ/ngày" (or "· Nhập giá" in blue) with a down chevron (#482, iOS `pricingChip`) */
@Composable
private fun PricingChip(line: CartLine, isSale: Boolean, onClick: () -> Unit) {
    val label = if (isSale) stringResource(R.string.v2_pricing_sale) else pricingLabel(line.pricingType)
    val price = line.unitPrice.takeIf { it > 0 }?.let { pricingPriceText(it, line.pricingType, isSale) }
    val changeLabel = stringResource(R.string.v2_pricing_change, line.product.name)
    Row(
        Modifier
            .clip(RoundedCornerShape(10.dp))
            .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(10.dp))
            .background(DS.Colors.Surface)
            .clickable(onClickLabel = changeLabel, onClick = onClick)
            .heightIn(min = 36.dp)
            .padding(start = 12.dp, end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 1)
        if (price != null) {
            Text(" · $price", fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
        } else {
            Text(" · " + stringResource(R.string.v2_pricing_enter_price), fontSize = DS.TextSize.Secondary,
                fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary, maxLines = 1)
        }
        Spacer(Modifier.size(8.dp))
        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun pricingLabel(type: String): String = when (type.uppercase()) {
    "FIXED" -> stringResource(R.string.v2_price_per_rental)
    "DAILY" -> stringResource(R.string.v2_price_per_day)
    "BLOCK" -> stringResource(R.string.v2_pricing_block)
    "HOURLY" -> stringResource(R.string.v2_pricing_hourly)
    else -> type.lowercase().replaceFirstChar { it.uppercase() }
}

/** "150.000đ/ngày" for a daily rent price, "350.000đ" otherwise */
@Composable
private fun pricingPriceText(price: Double, type: String, isSale: Boolean): String {
    val money = formatMoneyVnd(price) + "đ"
    return if (!isSale && type.equals("DAILY", ignoreCase = true)) stringResource(R.string.v2_pricing_per_day_suffix, money) else money
}

/**
 * "Cách tính giá" (#482, board Gio-hang-chon-gia; iOS `CartPricingSheetViewController`): the pricing options as radio
 * rows, "Giá cho đơn này", a live preview and "Áp dụng". Only the cart line changes, never the product's price.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun CartPricingSheet(
    line: CartLine,
    isSale: Boolean,
    days: Int,
    onDismiss: () -> Unit,
    onApply: (String?, Double) -> Unit,
) {
    val choices = remember(line.product.id) { if (isSale) emptyList() else CartV2Logic.pricingChoices(line) }
    var type by remember(line.product.id) { mutableStateOf(line.pricingType.uppercase()) }
    var digits by remember(line.product.id) {
        mutableStateOf(CartV2Logic.startPrice(line, line.pricingType).toLong().takeIf { it > 0 }?.toString().orEmpty())
    }
    val price = digits.toDoubleOrNull() ?: 0.0
    val daily = !isSale && type == "DAILY"
    val preview = CartV2Logic.pricePreview(type, price, days, line.quantity, isSale)
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(stringResource(R.string.v2_pricing_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                val sub = if (isSale) line.product.name else line.product.name + " · " + pluralStringResource(R.plurals.v2_cart_days, days, days)
                Text(sub, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
            }
            if (choices.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    choices.forEach { choice ->
                        val selected = choice.type == type
                        val shape = RoundedCornerShape(12.dp)
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape)
                                .border(if (selected) 1.5.dp else 1.dp, if (selected) DS.Colors.Primary else Color(0xFFE2E8F0), shape)
                                .background(if (selected) Color(0xFFEFF6FF) else DS.Colors.Surface)
                                .clickable(role = Role.RadioButton) {
                                    type = choice.type
                                    digits = CartV2Logic.startPrice(line, choice.type).toLong().takeIf { it > 0 }?.toString().orEmpty()
                                }
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Box(
                                Modifier.size(20.dp).clip(CircleShape).background(Color.White)
                                    .border(if (selected) 6.dp else 1.5.dp, if (selected) DS.Colors.Primary else Color(0xFF94A3B8), CircleShape),
                            )
                            Text(pricingLabel(choice.type), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text,
                                modifier = Modifier.weight(1f))
                            val catalog = choice.catalogPrice
                            if (catalog != null) {
                                Text(pricingPriceText(catalog, choice.type, isSale), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
                            } else {
                                Text(stringResource(R.string.v2_pricing_enter_price), fontSize = DS.TextSize.Body,
                                    fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                            }
                        }
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.v2_pricing_price_field), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                OutlinedTextField(
                    value = if (digits.isEmpty()) "" else formatMoneyVnd(price),
                    onValueChange = { text -> digits = text.filter { it.isDigit() }.take(12).trimStart('0') },
                    placeholder = { Text("0") },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text),
                    trailingIcon = {
                        Text(stringResource(if (daily) R.string.v2_pricing_unit_daily else R.string.v2_pricing_unit),
                            fontSize = DS.TextSize.Body, color = Color(0xFF64748B), modifier = Modifier.padding(end = 14.dp))
                    },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(stringResource(R.string.v2_pricing_note), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFF8FAFC)).padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val money = formatMoneyVnd(preview.unitPrice) + "đ"
                val text = preview.days?.let { "$money × ${pluralStringResource(R.plurals.v2_cart_days, it, it)} × ${preview.quantity}" }
                    ?: "$money × ${preview.quantity}"
                Text(text, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                Text(formatMoneyVnd(preview.total) + "đ", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            }
            AppPrimaryButton(
                stringResource(R.string.v2_pricing_apply),
                onClick = { onApply(if (isSale) null else type, price) },
                modifier = Modifier.fillMaxWidth().height(54.dp),
            )
        }
    }
}
