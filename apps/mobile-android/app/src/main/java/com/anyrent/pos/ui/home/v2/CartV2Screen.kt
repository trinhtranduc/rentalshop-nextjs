package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.outlined.Edit
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
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.CreateOrderSheet
import com.anyrent.pos.domain.orders.CreateOrderSubmission
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
import com.anyrent.pos.ui.customers.v2.CustomerPickerSheet
import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.ui.theme.DS
import com.anyrent.pos.ui.common.copyUriToCacheFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.ZoneId

/**
 * Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
 * State lives in [CartStore]. "Tạo đơn" confirms a new order in a sheet on this screen and sends the review screen's
 * create request ([CartOrderSubmit], #476); an edited order still opens the review screen ([onPreview]).
 */
@Composable
fun CartV2Screen(
    onBack: () -> Unit,
    onPreview: () -> Unit,
    /** "+ Add": the product list on Home (#433), not the screen that opened the cart */
    onAddItems: () -> Unit = onBack,
    /** "Tạo đơn mới" after a create (#476): the product list with an empty cart */
    onNewOrder: () -> Unit = onAddItems,
    /** "Xem đơn" after a create (#476) */
    onOpenOrder: (Int) -> Unit = {},
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
    val isSale = orderType == "SALE"
    val app = LocalContext.current.applicationContext as AnyRentApp

    // Same money as the old cart: computed from the collected lines so every change redraws
    val subtotal = lines.sumOf { it.lineTotal }
    val discountAmount = when (discountType) {
        CartStore.DiscountType.AMOUNT -> discount.coerceAtLeast(0.0)
        CartStore.DiscountType.PERCENT -> subtotal * (discount.coerceIn(0.0, 100.0) / 100.0)
    }
    val total = (subtotal - discountAmount).coerceAtLeast(0.0)

    var available by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }
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
    val availabilityKey = lines.map { it.product.id to it.quantity } to listOf(isSale, pickup, ret, datesChosen)
    LaunchedEffect(availabilityKey) {
        // iOS checks a rental only once dates are picked
        if (lines.isEmpty() || (!isSale && !datesChosen)) {
            available = emptyMap()
            return@LaunchedEffect
        }
        delay(300)
        val today = LocalDate.now(ZoneId.systemDefault())
        val result = runCatching {
            app.container.availabilityRepository.checkBatchAvailability(
                requests = lines.map { AvailabilityRequest(it.product.id, it.quantity) },
                startDate = if (isSale) today else pickup,
                endDate = if (isSale) today else ret,
            )
        }
        result.onSuccess { map -> available = map.mapValues { it.value.effectivelyAvailable } }
    }

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
    val validationFallbackMessage = stringResource(R.string.order_validation_fallback)

    // Same checks, request and messages as the review screen's submit (CartCheckoutScreen)
    fun submitOrder(confirm: CreateOrderSheet.Confirm) {
        if (!submission.begin()) return
        submitting = true
        scope.launch {
            if (!confirm.isSale) {
                val check = runCatching { CartOrderSubmit.blockedRentalLines(validateRentalCart) }
                val failure = check.exceptionOrNull()
                val blocked = check.getOrNull().orEmpty()
                if (failure != null || blocked.isNotEmpty()) {
                    submission.failed()
                    submitting = false
                    error = when {
                        failure is AppError.Unauthorized -> sessionExpiredMessage
                        failure != null -> "$availabilityFailedMessage\n${failure.message.orEmpty()}"
                        else -> "Availability conflicts: " + blocked.joinToString { it.productName }
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

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(60.dp).padding(start = 4.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.v2_cart_back), modifier = Modifier.size(DS.Icon.Lg))
            }
            Text(
                stringResource(if (editingOrderId != null) R.string.v2_cart_edit_title else R.string.v2_cart_title),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f),
            )
            V2Segmented(
                titles = listOf(stringResource(R.string.v2_cart_rent), stringResource(R.string.v2_cart_sale)),
                selected = if (isSale) 1 else 0,
                onSelect = { CartStore.setOrderType(if (it == 1) "SALE" else "RENT") },
                enabled = editingOrderId == null,
            )
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
                    onQuantity = { q -> if (q <= 0) removeLine = line else CartStore.updateQuantity(line.product.id, q) },
                    onPricing = { type ->
                        CartStore.setPricingType(line.product.id, type)
                        // A mode the product has no price for starts at 0: ask for the price right away
                        val updated = CartStore.lines.value.firstOrNull { it.product.id == line.product.id }
                        if (updated != null && CartV2Logic.needsPrice(updated, isSale)) {
                            numericText = "0"
                            numericEditor = "PRICE:${line.product.id}"
                        }
                    },
                    onEditPrice = {
                        numericText = line.unitPrice.toLong().toString()
                        numericEditor = "PRICE:${line.product.id}"
                    },
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
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(if (isSale) R.string.v2_cart_customer_pays else R.string.v2_cart_collect_deposit), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                Text(formatMoneyVnd(CartV2Logic.collectNow(isSale, total, deposit)), fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold)
            }
            AppPrimaryButton(
                stringResource(if (isSale) R.string.v2_cart_sell_and_collect else R.string.v2_cart_create),
                modifier = Modifier.weight(1.1f),
                onClick = {
                    val problems = CartV2Logic.problems(lines.sumOf { it.quantity }, customer != null, isSale, datesChosen)
                    val messages = problems.map { problemText.getValue(it) } +
                        CartV2Logic.missingPrices(lines, isSale).map { needPriceText.format(it) }
                    if (messages.isNotEmpty()) {
                        error = messages.joinToString("\n")
                    } else if (CreateOrderSheet.ctaRoute(editing = editingOrderId != null) == CreateOrderSheet.CtaRoute.PREVIEW) {
                        onPreview()
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
            onDismiss = { confirmSheet = null },
            onConfirm = { submitOrder(confirm) },
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
    formatDayShort(date.atStartOfDay(ZoneId.systemDefault()).toInstant())

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
    onQuantity: (Int) -> Unit,
    onPricing: (String) -> Unit,
    onEditPrice: () -> Unit,
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
                // Tap to edit this line's price, any role, any time (owner 2026-10-05)
                val editPriceLabel = stringResource(R.string.v2_cart_edit_price)
                Row(
                    Modifier.clickable(onClickLabel = editPriceLabel, onClick = onEditPrice).heightIn(min = 32.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        calcText, fontSize = DS.TextSize.Secondary,
                        color = if (CartV2Logic.needsPrice(line, isSale)) Color(0xFFB91C1C) else DS.Colors.TextMuted,
                    )
                    Icon(Icons.Outlined.Edit, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(16.dp))
                }
                CartV2Logic.shortage(available, line.quantity)?.let { left ->
                    Text(
                        stringResource(if (isSale) R.string.v2_cart_short_stock else R.string.v2_cart_short_rent, left),
                        fontSize = DS.TextSize.Pill, fontWeight = FontWeight.SemiBold, color = Color(0xFF991B1B),
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFFFEE2E2)).padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        if (CartV2Logic.showsPricingToggle(isSale)) {
                            V2Segmented(
                                titles = listOf(stringResource(R.string.v2_price_per_rental), stringResource(R.string.v2_price_per_day)),
                                selected = if (line.pricingType.equals("DAILY", ignoreCase = true)) 1 else 0,
                                onSelect = { onPricing(if (it == 1) "DAILY" else "FIXED") },
                                compact = true,
                            )
                        } else if (isSale && available != null) {
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
