package com.anyrent.pos.ui.home.v2

import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import androidx.compose.ui.platform.testTag
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.key
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartOrderSubmit
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.DepositModeStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.domain.deposit.DepositMode
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.ui.deposit.CartStagedSection
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
import com.anyrent.pos.domain.customers.CustomerPickerEdit
import com.anyrent.pos.domain.products.BlockPricing
import com.anyrent.pos.domain.products.BlockText
import com.anyrent.pos.domain.products.CartDateRow
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.CartLineCalc
import com.anyrent.pos.domain.products.CartProblem
import com.anyrent.pos.domain.products.CartMoneyRow
import com.anyrent.pos.domain.products.CartMoneyTone
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppNumericPadSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
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
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.outlined.Close
import androidx.compose.foundation.layout.imePadding
import androidx.compose.ui.focus.focusRequester
import androidx.compose.material.icons.outlined.AddCircleOutline
import com.anyrent.pos.ui.common.AppIcons
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import com.anyrent.pos.domain.products.CartV2Icon

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
    // #1199 "Thu cọc theo giai đoạn": the shop's mode (a login without it is fetched), its templates, the stages of this cart
    val depositMode by SessionStore.depositModeFlow.collectAsState()
    val depositSettings by DepositModeStore.latest.collectAsState()
    val depositStages by CartStore.depositStages.collectAsState()
    val depositTemplateId by CartStore.depositTemplateId.collectAsState()
    val collectFirstNow by CartStore.collectFirstStageNow.collectAsState()
    val collectMethod by CartStore.collectMethod.collectAsState()
    val editHasPlan by CartStore.editHasDepositPlan.collectAsState()
    val stagedMode = depositMode == DepositMode.STAGED
    LaunchedEffect(Unit) { DepositModeStore.refresh() }
    // A staged shop: the stages of a new order start from the shop's default template
    LaunchedEffect(stagedMode, depositSettings, depositStages == null, orderType, editingOrderId) {
        val template = depositSettings?.startTemplate
        if (!isSale && editingOrderId == null && stagedMode && depositStages == null && template != null) CartStore.setDepositTemplate(template)
    }
    val staged = !isSale && editingOrderId == null && stagedMode && depositStages != null
    val app = LocalContext.current.applicationContext as AnyRentApp

    // Same money as the old cart: computed from the collected lines so every change redraws
    val subtotal = lines.sumOf { it.lineTotal }
    val discountAmount = when (discountType) {
        CartStore.DiscountType.AMOUNT -> discount.coerceAtLeast(0.0)
        CartStore.DiscountType.PERCENT -> subtotal * (discount.coerceIn(0.0, 100.0) / 100.0)
    }
    val total = (subtotal - discountAmount).coerceAtLeast(0.0)
    // #1067 (owner: "chặn giảm giá lớn hơn tổng đơn luôn"): a discount above the subtotal (e.g. items removed after it
    // was set) is refused, not clamped: the cart shows why and "Tạo đơn" / "Lưu thay đổi" stay off until it is fixed
    val discountPercent = discountType == CartStore.DiscountType.PERCENT
    val discountInvalid = CartV2Logic.discountExceeds(discount, subtotal, discountPercent)
    val discountTooHighMessage = stringResource(
        R.string.v2_cart_discount_too_high,
        CartV2Logic.discountLimitText(subtotal, discountPercent) { formatMoneyVnd(it) },
    )

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
    // #677: the ⋯ menu and its "Xoá giỏ hàng" confirm
    var moreOpen by remember { mutableStateOf(false) }
    var confirmClearCart by remember { mutableStateOf(false) }
    // #482: the line whose "Cách tính giá" sheet is open (#951: its line id; a product may be on several lines)
    var pricingLineId by remember { mutableStateOf<String?>(null) }
    // #684: the line whose "Ghi chú món" sheet is open
    var noteLineId by remember { mutableStateOf<String?>(null) }
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
    // #951: a product may be on several lines; availability is asked for the units of all its lines
    val productQuantities = CartV2Logic.quantitiesByProduct(lines)
    val availabilityKey = productQuantities to listOf(isSale, pickup, ret, datesChosen, editingOrderId)
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
                requests = productQuantities.map { (productId, quantity) -> AvailabilityRequest(productId, quantity) },
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
        lines.distinctBy { it.product.id }.mapNotNull { line ->
            OverlapWarnings.conflict(line.product.id, line.product.name, productQuantities[line.product.id] ?: line.quantity, availability[line.product.id], pickup, ret)
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

    // #1199: the stages of the cart as they stand now (the API recomputes them), what stage 1 collects, and whether they fit
    val restLabel = stringResource(R.string.deposit_rest_label)
    val canEditStages = !PermissionManager.role.isStaffLike
    val stagedPreview = if (staged) CartStore.stagedPreview(restLabel) else emptyList()
    val stagesExceed = staged && DepositPlanMath.exceedsTotal(stagedPreview, total)
    val stagedCollectNow = if (staged && collectFirstNow) stagedPreview.firstOrNull()?.takeIf { !it.isRest }?.amount ?: 0.0 else 0.0
    val stagedTemplateName = depositSettings?.choices.orEmpty().let { choices ->
        (choices.firstOrNull { it.id == depositTemplateId } ?: choices.firstOrNull())?.name.orEmpty()
    }

    // #473 — a rent line without "Theo lần / Theo ngày" may be stale (added before the product got its second price,
    // restored from disk, or loaded from an edited order): reload that product once per screen and let the line take
    // its prices. A product with one price stays without the toggle.
    val pricingChecked = remember { mutableSetOf<Int>() }
    val staleIds = if (isSale) emptyList() else lines.filterNot { CartV2Logic.offersBothModes(it.product) }.map { it.product.id }.distinct()
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
                com.anyrent.pos.print.CreatedOrderAutoPrint.run(app, order.id) // #700
            }.onFailure {
                // The cart and the sheet stay; the next confirm retries with the same key
                submission.failed()
                scope.launch(Dispatchers.IO) { CartOrderSubmit.reloadBlockTablesIfNeeded(it) } // #1189
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
                scope.launch(Dispatchers.IO) { CartOrderSubmit.reloadBlockTablesIfNeeded(it) } // #1189
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
                    // #677: while editing nothing sits right of the title, so "Sửa đơn #948372" fits on a 360dp phone
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis,
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
            fun shareQuote() {
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
                                blockFormula = { line -> line.blockDetail?.let { BlockText.formulaOrNull(shareContext.resources, it) } },
                            ),
                        )
                    }.onFailure { error = it.message }
                }
            }
            // #677 (board gio-menu): ⋯ with "Chia sẻ báo giá" and "Xoá giỏ hàng"; none while editing an order
            CartV2Logic.moreMenu(
                editing = editingOrderId != null, itemCount = lines.size, isSale = isSale, datesReady = datesChosen,
            )?.let { menu ->
                AppOverflowMenuAnchor(
                    contentDescription = stringResource(R.string.v2_cart_more),
                    actions = listOf(
                        AppMenuAction(stringResource(R.string.v2_cart_share_quote), Icons.Outlined.Share, ::shareQuote, enabled = menu.shareEnabled),
                        AppMenuAction(
                            stringResource(R.string.clear_cart), Icons.Outlined.DeleteOutline, { confirmClearCart = true },
                            destructive = true, enabled = menu.clearEnabled,
                        ),
                    ),
                    expanded = moreOpen,
                    onExpandedChange = { moreOpen = it },
                    modifier = Modifier.testTag("cart.more"),
                    icon = Icons.Outlined.MoreHoriz,
                    iconSize = DS.Icon.Lg,
                    iconTint = DS.Colors.Text,
                )
            }
            // While editing the type cannot change: header = back + "Sửa đơn #n" + subtitle only (#677)
            if (editingOrderId == null) {
                V2Segmented(
                    titles = listOf(stringResource(R.string.v2_cart_rent), stringResource(R.string.v2_cart_sale)),
                    selected = if (isSale) 1 else 0,
                    onSelect = { CartStore.setOrderType(if (it == 1) "SALE" else "RENT") },
                )
            }
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // #1079: with 2+ carts open, "Giỏ · name · i/n · Đổi" opens the cart list (not while editing an order)
            if (editingOrderId == null) CartSwitchRow()
            Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
            CustomerRow(name = customer?.displayName, phone = customer?.phone, onClick = { showCustomer = true })
            if (!isSale) {
                HorizontalDivider(color = DS.Colors.Divider)
                // #952 (owner): calendar icon in a light-blue circle, same size and margin as the customer avatar
                val dateRow = CartDateRow.state(pickup.takeIf { datesChosen }, ret.takeIf { datesChosen })
                Row(
                    Modifier.fillMaxWidth().clickable { showDates = true }.heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(CartDateRow.ICON_DP.dp).clip(CircleShape).background(Color(0xFFDBEAFE)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = Color(0xFF1E40AF), modifier = Modifier.size(DS.Icon.Sm))
                    }
                    if (dateRow.isEmpty) {
                        // iOS starts with no dates: "Chọn ngày thuê" in the primary colour, no day pill (#448)
                        Text(
                            stringResource(R.string.v2_cart_pick_dates),
                            fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, color = DS.Colors.Primary,
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        Text(
                            dateRow.text.orEmpty(),
                            fontSize = DS.TextSize.Name, fontWeight = FontWeight.Normal, maxLines = 1, softWrap = false,
                            overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                        )
                        val days = dateRow.days ?: 1
                        Text(
                            pluralStringResource(R.plurals.v2_cart_days, days, days),
                            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF), maxLines = 1,
                            // #893 (owner): room inside the pill (10 left/right, 4 top/bottom), one line
                            modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            // Owner (2026-10-19): no "Thêm" button in the cart; items are added from the home list
            SectionBand(stringResource(R.string.v2_cart_items, lines.sumOf { it.quantity }))
            if (lines.isEmpty()) {
                Text(stringResource(R.string.v2_cart_empty), color = DS.Colors.TextMuted, modifier = Modifier.padding(16.dp))
            }
            lines.forEach { line ->
              // #893 (owner): swipe end-to-start reveals a red "Xoá"; a full swipe removes the line
              key(line.lineId) {
               SwipeToDeleteLine(onDelete = { CartStore.remove(line.lineId) }) {
                ItemRow(
                    line = line,
                    isSale = isSale,
                    available = available[line.product.id],
                    productQuantity = productQuantities[line.product.id] ?: line.quantity,
                    overlapText = overlapConflicts.firstOrNull { it.productId == line.product.id }?.let { OverlapWarnings.cartLine(it, overlapTexts) },
                    onOpenOverlap = overlapConflicts.firstOrNull { it.productId == line.product.id }?.let { c ->
                        { onOpenCalendar(c.productId, c.from.toString()) }
                    },
                    onQuantity = { q -> if (q <= 0) removeLine = line else CartStore.updateQuantity(line.lineId, q) },
                    onOpenPricing = { pricingLineId = line.lineId },
                    onOpenNote = { noteLineId = line.lineId },
                )
               }
              }
            }

            SectionBand(stringResource(R.string.v2_cart_money))
            V2ValueRow(stringResource(if (isSale) R.string.v2_cart_sale_subtotal else R.string.v2_cart_rent_subtotal), formatMoneyVnd(subtotal), valueColor = DS.Colors.Text)
            ThinDivider()
            // #1056 (owner): blue value + pencil = the row opens a sheet; Tiền thuê / Tổng cộng stay black
            CartMoneyEditRow(
                stringResource(R.string.v2_cart_discount),
                formatMoneyVnd(CartV2Logic.discountShown(discountAmount)),
                tone = CartV2Logic.moneyRowTone(CartMoneyRow.DISCOUNT),
                onClick = { numericText = discount.toLong().toString(); numericEditor = "DISCOUNT" },
            )
            ThinDivider()
            V2ValueRow(stringResource(R.string.v2_cart_total), formatMoneyVnd(total), valueColor = DS.Colors.Text, bold = true)
            ThinDivider()
            if (!isSale) {
                if (editingOrderId != null && editHasPlan) {
                    // #1199: the plan of this order is edited on the order itself; the cart has no "Cọc" of its own
                } else if (staged) {
                    CartStagedSection(
                        preview = stagedPreview, templateName = stagedTemplateName, choices = depositSettings?.choices.orEmpty(),
                        canEdit = canEditStages, exceeds = stagesExceed, collectNow = stagedCollectNow, collectMethod = collectMethod,
                        todayKey = ShopTime.today().toString(), staffLike = !canEditStages,
                        onPickTemplate = { CartStore.setDepositTemplate(it) },
                        onEditStage = { index ->
                            numericText = stagedPreview.getOrNull(index)?.amount?.toLong()?.toString() ?: "0"
                            numericEditor = "STAGE:$index"
                        },
                        onCollectFirst = { CartStore.setCollectFirstStage(it) },
                    )
                } else if (!(stagedMode && editingOrderId == null)) {
                    CartMoneyEditRow(
                        stringResource(R.string.v2_cart_deposit), formatMoneyVnd(deposit),
                        tone = CartV2Logic.moneyRowTone(CartMoneyRow.DEPOSIT),
                        onClick = { numericText = deposit.toLong().toString(); numericEditor = "DEPOSIT" },
                    )
                    ThinDivider()
                }
            }
            // #1043: opens the same sheet ("Ghi chú đơn"); #1056: a row "Ghi chú … Thêm ✎" like the others
            val noteFiles by CartStore.noteImageFiles.collectAsState()
            val notePhotos = if (editingOrderId == null) noteFiles.size else 0
            CartMoneyEditRow(
                stringResource(R.string.v2_cart_note),
                CartV2Logic.noteShown(notes) ?: stringResource(R.string.v2_cart_add_note),
                tone = CartV2Logic.moneyRowTone(CartMoneyRow.NOTE, note = notes),
                photoCount = notePhotos,
                onClick = { noteDraftFiles = CartStore.noteImageFiles.value; noteDraft = notes },
            )
            Spacer(Modifier.height(24.dp))
        }

        HorizontalDivider(color = DS.Colors.Border)
        if (discountInvalid) {
            // #1067: same red notice as the overlap block, above the CTA
            OverlapNotice(
                text = discountTooHighMessage,
                background = Color(0xFFFEF2F2), borderColor = Color(0xFFFECACA), tint = Color(0xFFB91C1C), textColor = Color(0xFF991B1B),
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp),
            )
        }
        if (createBlocked) {
            // #518 board GH-trung-tat: the shop does not allow overlapping rentals
            OverlapNotice(
                text = overlapBlockedMessage,
                background = Color(0xFFFEF2F2), borderColor = Color(0xFFFECACA), tint = Color(0xFFB91C1C), textColor = Color(0xFF991B1B),
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp),
            )
        }
        // The cart button: the create / sale confirm sheet, or the "Lưu thay đổi" sheet while editing
        fun onCta() {
            if (discountInvalid) return
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
                    // #1199: a staged rental prepays stage 1 only (or nothing)
                    deposit = if (staged) stagedCollectNow else deposit,
                )
            }
        }

        if (editingOrderId != null) {
            // #677 (board huy-sua, option B): "Tổng đơn" over "Huỷ sửa" (outline, 1 part) + "Lưu thay đổi" (2 parts)
            Column(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.v2_cart_total), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                    Text(formatMoneyVnd(total), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    androidx.compose.material3.OutlinedButton(
                        onClick = { confirmCancelEdit = true },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, DS.Colors.Border),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = DS.Colors.Text),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp),
                    ) {
                        Text(stringResource(R.string.v2_cart_edit_cancel), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                    AppPrimaryButton(
                        stringResource(R.string.v2_cart_edit_save),
                        modifier = Modifier.weight(2f).height(48.dp),
                        enabled = !createBlocked && !discountInvalid,
                        onClick = ::onCta,
                    )
                }
            }
        } else {
            Row(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(
                            when {
                                isSale -> R.string.v2_cart_customer_pays
                                staged -> if (stagedCollectNow > 0) R.string.deposit_cart_collect_now else R.string.deposit_cart_collect_none
                                else -> R.string.v2_cart_collect_deposit
                            },
                        ),
                        fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                    )
                    Text(
                        formatMoneyVnd(if (staged) stagedCollectNow else CartV2Logic.collectNow(isSale, total, deposit)),
                        fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold,
                    )
                }
                AppPrimaryButton(
                    if (staged && stagedCollectNow > 0) stringResource(R.string.deposit_cart_create_and_collect) else stringResource(
                        when (EditOrderSheet.ctaLabel(editing = false, isSale = isSale)) {
                            EditOrderSheet.CtaLabel.SAVE_CHANGES -> R.string.v2_cart_edit_save
                            EditOrderSheet.CtaLabel.SELL_AND_COLLECT -> R.string.v2_cart_sell_and_collect
                            EditOrderSheet.CtaLabel.CREATE -> R.string.v2_cart_create
                        },
                    ),
                    modifier = Modifier.weight(1.1f),
                    // #1229: the staged label is short now; one line, 16sp, so it is not clipped on a 360dp phone
                    fontSize = if (staged && stagedCollectNow > 0) 16.sp else 18.sp,
                    singleLine = staged && stagedCollectNow > 0,
                    enabled = !createBlocked && !discountInvalid && !stagesExceed,
                    onClick = ::onCta,
                )
            }
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
                // #952: a customer edited from the picker's pencil: the cart shows the new info when it is that customer
                onEdited = { id, form ->
                    CustomerPickerEdit.cartCustomerAfterSave(form, id, CartStore.customer.value)?.let { CartStore.setCustomer(it) }
                },
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
        val line = lines.firstOrNull { it.lineId == id }
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
    noteLineId?.let { id ->
        val line = lines.firstOrNull { it.lineId == id }
        if (line == null) {
            noteLineId = null
        } else {
            CartItemNoteSheet(
                title = stringResource(R.string.v2_item_note_title),
                subtitle = line.product.name,
                note = line.note,
                placeholder = stringResource(R.string.v2_item_note_placeholder),
                hint = stringResource(R.string.v2_item_note_hint),
                onDismiss = { noteLineId = null },
                onSave = { note -> CartStore.updateNote(id, note); noteLineId = null },
            )
        }
    }
    numericEditor?.let { editor ->
        val priceProductId = editor.removePrefix("PRICE:").takeIf { editor.startsWith("PRICE:") && it.isNotBlank() }
        val stageIndex = editor.removePrefix("STAGE:").toIntOrNull()?.takeIf { editor.startsWith("STAGE:") }
        AppNumericPadSheet(
            title = when {
                priceProductId != null -> lines.firstOrNull { it.lineId == priceProductId }?.product?.name
                    ?: stringResource(R.string.v2_cart_edit_price)
                stageIndex != null -> stagedPreview.getOrNull(stageIndex)?.label.orEmpty()
                editor == "DEPOSIT" -> stringResource(R.string.enter_deposit)
                else -> stringResource(R.string.enter_discount)
            },
            rawValue = numericText,
            onRawValueChange = { numericText = it },
            onDismiss = { numericEditor = null },
            // #1067: the typed discount above the subtotal (or 100%) shows the error and Confirm stays off
            errorText = discountTooHighMessage.takeIf {
                editor == "DISCOUNT" && CartV2Logic.discountExceeds(numericText.toDoubleOrNull() ?: 0.0, subtotal, discountPercent)
            },
            confirmEnabled = editor != "DISCOUNT" ||
                !CartV2Logic.discountExceeds(numericText.toDoubleOrNull() ?: 0.0, subtotal, discountPercent),
            onConfirm = {
                val value = numericText.toDoubleOrNull() ?: 0.0
                when {
                    // The line price for this order only, never the product's price (owner 2026-10-05)
                    priceProductId != null -> CartStore.updateUnitPrice(priceProductId, value)
                    stageIndex != null -> CartStore.setDepositStageAmount(stageIndex, value)
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
        // #1043 (iOS editNote): the item note sheet as "Ghi chú đơn", prefilled while editing an order. #480: on a new
        // order it also holds the note photos, kept by the cart and sent on create; editing an existing order stays
        // text only (its photos live on the order detail)
        val saved = CartStore.noteImageFiles.value
        val maxPhotos = CartV2Logic.orderNoteMaxPhotos(editMode = editingOrderId != null)
        CartItemNoteSheet(
            title = stringResource(R.string.v2_order_note_title),
            subtitle = null,
            note = draft,
            placeholder = stringResource(R.string.v2_order_note_placeholder),
            hint = stringResource(R.string.v2_order_note_hint),
            onDismiss = {
                if (!notePicking) {
                    // Close without saving: drop the photos picked in this round only
                    (noteDraftFiles - saved.toSet()).forEach { runCatching { it.delete() } }
                    noteDraft = null
                }
            },
            onSave = { text ->
                CartStore.setNotes(CartV2Logic.noteText(text).orEmpty())
                if (editingOrderId == null) {
                    (saved - noteDraftFiles.toSet()).forEach { runCatching { it.delete() } }
                    CartStore.setNoteImageFiles(noteDraftFiles)
                }
                noteDraft = null
            },
            photos = if (maxPhotos > 0) {
                {
                    NoteSheetPhotos(
                        files = noteDraftFiles, max = maxPhotos,
                        onRemove = { file -> noteDraftFiles = noteDraftFiles - file },
                        onAdd = { notePicking = true; notePicker.launch("image/*") },
                        onPreview = { notePreview = it },
                    )
                }
            } else null,
        )
    }
    notePreview?.let { com.anyrent.pos.ui.common.FullScreenImagePreview(model = it, onDismiss = { notePreview = null }) }
    if (confirmClearCart) {
        AppAlertConfirm(
            title = stringResource(R.string.clear_cart),
            message = stringResource(R.string.clear_cart_confirmation),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            onDismiss = { confirmClearCart = false },
            onConfirm = {
                confirmClearCart = false
                // The cart and its saved draft; the screen stays, empty, as after a create (#677)
                CartStore.clear()
            },
        )
    }
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
                CartStore.remove(line.lineId)
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

/** #888 dd/mm/yy (the cart keeps shop civil days as `LocalDate`) */
private fun formatDay(date: LocalDate): String = com.anyrent.pos.domain.DayText.dmy(date)

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
                fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium,
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
    /** #951: units of this product across all its cart lines (the shortage compares them with [available]) */
    productQuantity: Int = line.quantity,
    /** #518 / #684 "Hết hàng từ 03/10 → 05/10"; replaces the shortage chip */
    overlapText: String? = null,
    /** #684: a tap on the tag opens Lịch trống on the first booked-out day */
    onOpenOverlap: (() -> Unit)? = null,
    onQuantity: (Int) -> Unit,
    onOpenPricing: () -> Unit,
    onOpenNote: () -> Unit = {},
) {
    val calc = CartV2Logic.calc(line, isSale)
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ProductThumb(line.product.images.firstOrNull() ?: line.product.imageUrl, 64.dp, 12.dp)
            // #684 (owner 2026-10-09, iOS itemRow): name; the blue pricing link; the "Hết hàng …" tag; last row the
            // total and −/+. No card, and no separate "450.000/lần × 1" line: its numbers are in the link
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                // #684: the "Hết 09/10 → 11/10 ›" tag (or the shortage chip) beside the name, on its right (owner)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                    Text(line.product.name, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, maxLines = 2,
                        overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    // #1064: one pill once availability is loaded: green "Còn N" (2+ and enough), amber "Còn 1" /
                    // "Chỉ còn N" (#1054), red "Hết đồ" / "Hết hàng" at 0. The overlap tag (red) replaces it
                    val note = if (overlapText == null) CartV2Logic.availabilityNote(available, productQuantity, !isSale) else null
                    val shortText = overlapText ?: note?.let { stringResource(it.textRes, it.count) }
                    // #1064: the pill is short; TalkBack says which days / the stock
                    val spoken = note?.let { stringResource(it.spokenRes, it.count) }
                    val style = CartShortageStyle.of(note?.tone ?: CartV2Logic.ShortageTone.NONE)
                    shortText?.let { text ->
                        val hint = stringResource(R.string.v2_cart_overlap_hint)
                        // #1132 (owner, mockup A, iOS `stockPill`): a soft pill in the tone's fill, a 7 dp dot in the text
                        // colour, then the text (semibold); the overlap tag keeps its tap and "›"
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                            modifier = Modifier.then(if (spoken != null) Modifier.semantics { contentDescription = spoken } else Modifier)
                                .clip(RoundedCornerShape(percent = 50))
                                .then(if (onOpenOverlap != null) Modifier.clickable(onClickLabel = hint, role = Role.Button, onClick = onOpenOverlap) else Modifier)
                                .background(style.colors.fill)
                                .padding(horizontal = 9.dp, vertical = 3.dp),
                        ) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(style.colors.text))
                            Text(
                                if (onOpenOverlap != null) "$text ›" else text,
                                fontSize = DS.TextSize.Pill, fontWeight = style.weight, color = style.colors.text, maxLines = 1,
                            )
                        }
                    }
                }
                // #482: the link opens the "Cách tính giá" sheet
                PricingChip(line, isSale, onOpenPricing)
                // #1189: past the table, the sum under the link: "120.000 (3 ngày) + 2 × 20.000 = 160.000"
                if (!isSale) line.blockDetail?.takeIf { it.extraDays > 0 }?.let { detail ->
                    Text(
                        BlockText.formula(LocalContext.current.resources, detail), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                        modifier = Modifier.semantics { contentDescription = "cart.blockFormula" },
                    )
                }
                // #1064: a sale line's "Còn N" is now the pill beside the name (one count per line)
                Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(formatMoneyVnd(calc.total), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, maxLines = 1, modifier = Modifier.weight(1f))
                    V2Stepper(value = line.quantity, onChange = onQuantity, minimum = 0, compact = true)
                }
                // #684 (canvas N1): "+ Ghi chú", or the line's note in a light box; either opens "Ghi chú món".
                // #891 (owner): the note is the last line of the item
                ItemNoteEntry(line.product.name, line.note, onOpenNote)
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/**
 * #1054 (owner, iOS `shortageStyle`): the shortage pill: the amber "Chưa soạn đồ" palette (#1032, `DS.Status.Waiting`)
 * in Medium while some units are free; the booked-out red in SemiBold when none are (and for the overlap tag)
 */
internal data class CartShortageStyle(val colors: DS.Pill, val weight: FontWeight) {
    companion object {
        private val BookedOut = DS.Pill(Color(0xFF991B1B), Color(0xFFFEE2E2))
        private val Enough = DS.Pill(Color(0xFF166534), Color(0xFFDCFCE7))

        fun of(tone: CartV2Logic.ShortageTone): CartShortageStyle = when (tone) {
            // #1132 (mockup A): soft fills, semibold text
            CartV2Logic.ShortageTone.OK -> CartShortageStyle(Enough, FontWeight.SemiBold) // #1064: 2+ and enough
            CartV2Logic.ShortageTone.LOW -> CartShortageStyle(DS.Status.Waiting, FontWeight.SemiBold)
            CartV2Logic.ShortageTone.NONE -> CartShortageStyle(BookedOut, FontWeight.SemiBold)
        }
    }
}

/** "Theo ngày · 150.000đ/ngày" (or "· Nhập giá" in blue) with a down chevron (#482, iOS `pricingChip`) */
@Composable
private fun PricingChip(line: CartLine, isSale: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val label = if (isSale) stringResource(R.string.v2_pricing_sale) else pricingLabel(line.pricingType)
    // #684 (Dòng gọn): the chip carries the line's numbers; a daily price over several days shows the days too
    val days = (CartV2Logic.calc(line, isSale).kind as? CartLineCalc.Kind.PerDay)?.days?.takeIf { it > 1 }
    val daysText = days?.let { pluralStringResource(R.plurals.v2_cart_days, it, it) }
    val changeLabel = stringResource(R.string.v2_pricing_change, line.product.name)
    // #1189: a block line reads "Khối 3 ngày + 2 ngày thêm · 160.000đ ⌄"
    val blockDetail = if (isSale) null else line.blockDetail
    if (blockDetail != null) {
        Row(
            modifier.clip(RoundedCornerShape(8.dp)).clickable(onClickLabel = changeLabel, onClick = onClick)
                .heightIn(min = 32.dp).padding(end = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // One text, so a long summary wraps with its price instead of splitting into two columns
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.Medium)) { append(BlockText.summary(LocalContext.current.resources, blockDetail)) }
                    append(" · " + com.anyrent.pos.domain.money.ShopMoney.withUnit(line.unitPrice))
                },
                fontSize = DS.TextSize.Body, color = DS.Colors.Primary,
                modifier = Modifier.weight(1f, fill = false),
            )
            Spacer(Modifier.size(4.dp))
            Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(16.dp))
        }
        return
    }
    // #684: a blue link "Theo ngày · 400.000đ/ngày × 2 ngày ⌄" (15sp, no border), iOS pricingChip
    Row(
        modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClickLabel = changeLabel, onClick = onClick)
            .heightIn(min = 32.dp)
            .padding(end = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // #684 (owner): price first — "200.000đ / theo lần", "400.000đ / theo ngày × 3 ngày"; "Nhập giá / theo lần"
        Text(
            // #951: 0đ is a price; only a rent line without any price shows "Nhập giá"
            CartV2Logic.chipPrice(line, isSale)?.let { formatMoneyVnd(it) } ?: stringResource(R.string.v2_pricing_enter_price),
            fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Primary, maxLines = 1,
        )
        Text(
            " / " + label.lowercase(java.util.Locale("vi")) + (daysText?.let { " × $it" } ?: ""),
            fontSize = DS.TextSize.Body, color = DS.Colors.Primary, maxLines = 1,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
        )
        Spacer(Modifier.size(4.dp))
        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(16.dp))
    }
}

/** Order detail item line, same wording as the cart link: "200.000đ / theo lần", "400.000đ / theo ngày × 3 ngày" (iOS `orderItemPricing`) */
@Composable
internal fun orderItemPricingText(unitPrice: Double, pricingType: String?, rentalDays: Int, isSale: Boolean): String {
    val (amount, unit) = orderItemPricingParts(unitPrice, pricingType, rentalDays, isSale)
    return "$amount / $unit"
}

/** The same line in two parts, for the bold price on order detail (board D2) */
@Composable
internal fun orderItemPricingParts(unitPrice: Double, pricingType: String?, rentalDays: Int, isSale: Boolean): Pair<String, String> {
    val type = pricingType?.takeIf { it.isNotBlank() } ?: "FIXED"
    val label = if (isSale) stringResource(R.string.v2_pricing_sale) else pricingLabel(type)
    val days = rentalDays.takeIf { !isSale && type.equals("DAILY", ignoreCase = true) && it > 1 }
    val daysText = days?.let { pluralStringResource(R.plurals.v2_cart_days, it, it) }
    return formatMoneyVnd(unitPrice) to label.lowercase(java.util.Locale("vi")) + (daysText?.let { " × $it" } ?: "")
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
    val money = com.anyrent.pos.domain.money.ShopMoney.withUnit(price)
    return if (!isSale && type.equals("DAILY", ignoreCase = true)) stringResource(R.string.v2_pricing_per_day_suffix, money) else money
}

/** Unit after the price field: "đ" / "đ/ngày", or "$" / "$/ngày" in a USD shop (#1145) */
@Composable
private fun pricingUnitText(daily: Boolean): String =
    if (com.anyrent.pos.domain.money.ShopMoney.current == com.anyrent.pos.domain.money.ShopCurrency.USD) {
        stringResource(if (daily) R.string.v2_pricing_unit_daily_usd else R.string.v2_pricing_unit_usd)
    } else {
        stringResource(if (daily) R.string.v2_pricing_unit_daily else R.string.v2_pricing_unit)
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
    onApply: (String?, Double?) -> Unit,
) {
    val choices = remember(line.lineId) { if (isSale) emptyList() else CartV2Logic.pricingChoices(line) }
    var type by remember(line.lineId) { mutableStateOf(line.pricingType.uppercase()) }
    // #951: "0" is a price (a free line) and shows as 0; an empty box is no typed price
    var digits by remember(line.lineId) {
        mutableStateOf(CartV2Logic.sheetStartPrice(line, line.pricingType)?.toLong()?.toString().orEmpty())
    }
    val typed = digits.toDoubleOrNull()
    val price = typed ?: 0.0
    val daily = !isSale && type == "DAILY"
    val preview = CartV2Logic.pricePreview(type, price, days, line.quantity, isSale)
    // #1189: a block line has no price box; its preview is the table's answer for the cart's days
    val blockTable = ProductPricing.block(line.product) ?: line.savedBlockTable
    val isBlock = !isSale && type == "BLOCK" && blockTable != null
    val blockDetail = if (isBlock) BlockPricing.detail(blockTable!!, days, BlockPricing.minorUnit(com.anyrent.pos.domain.money.ShopMoney.current.code)) else null
    val sheetRes = LocalContext.current.resources
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
                                    digits = CartV2Logic.sheetStartPrice(line, choice.type)?.toLong()?.toString().orEmpty()
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
                            if (choice.type == "BLOCK" && blockTable != null) {
                                Text(BlockText.rowSummary(sheetRes, blockTable), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
                            } else if (catalog != null) {
                                Text(pricingPriceText(catalog, choice.type, isSale), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
                            } else {
                                Text(stringResource(R.string.v2_pricing_enter_price), fontSize = DS.TextSize.Body,
                                    fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                            }
                        }
                    }
                }
            }
            if (!isBlock) Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.v2_pricing_price_field), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                OutlinedTextField(
                    value = if (digits.isEmpty()) "" else com.anyrent.pos.domain.money.ShopMoney.plain(price),
                    onValueChange = { text -> digits = CartV2Logic.priceDigits(text) },
                    placeholder = { Text("0") },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text),
                    trailingIcon = {
                        Text(pricingUnitText(daily),
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
                val money = com.anyrent.pos.domain.money.ShopMoney.withUnit(preview.unitPrice)
                val text = if (blockDetail != null) {
                    BlockText.summary(sheetRes, blockDetail) + (BlockText.formulaOrNull(sheetRes, blockDetail)?.let { "\n$it" } ?: "")
                } else preview.days?.let { "$money × ${pluralStringResource(R.plurals.v2_cart_days, it, it)} × ${preview.quantity}" }
                    ?: "$money × ${preview.quantity}"
                Text(text, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                Text(
                    com.anyrent.pos.domain.money.ShopMoney.withUnit(if (blockDetail != null) blockDetail.total * line.quantity else preview.total),
                    fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                )
            }
            AppPrimaryButton(
                stringResource(R.string.v2_pricing_apply),
                onClick = { onApply(if (isSale) null else type, if (isBlock) null else typed) },
                modifier = Modifier.fillMaxWidth().height(54.dp),
            )
        }
    }
}

/** #1024: the Material icon of each cart icon (iOS SF Symbols in `CartV2Icon`) */
internal fun cartIcon(icon: CartV2Icon): ImageVector = when (icon) {
    CartV2Icon.ADD_ITEM -> Icons.Outlined.AddCircleOutline
    CartV2Icon.EDIT -> CartEditIcon
}

/**
 * #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): the cart's one edit icon — the mockup's blue pen-line
 * after the text of every row that opens a sheet (Giảm giá, Đặt cọc, the order note, a line's note). iOS `V2.editPencil`
 */
internal val CartEditIcon: ImageVector get() = AppIcons.EditLine
internal val CartEditIconSize = 15.dp

@Composable
private fun CartEditPencil(modifier: Modifier = Modifier) {
    Icon(cartIcon(CartV2Icon.EDIT), contentDescription = null, tint = DS.Colors.Primary, modifier = modifier.size(CartEditIconSize))
}

/**
 * #684 (canvas N1), #1024 (option A, iOS itemNoteButton): "Ghi chú" when the line has no note, else the note in a
 * light box. #1061: blue "Ghi chú" / the note, then the cart's one blue edit icon. TalkBack reads the text and
 * "Ghi chú cho <product>".
 */
@Composable
private fun ItemNoteEntry(productName: String, note: String?, onClick: () -> Unit) {
    val spoken = CartV2Logic.itemNoteSpoken(
        productName, note,
        noteLabel = stringResource(R.string.v2_item_note_label),
        accessibilityFormat = stringResource(R.string.v2_item_note_accessibility),
    )
    NoteEntry(note, emptyText = spoken.text, spokenText = spoken.text, actionLabel = spoken.actionLabel, onClick = onClick)
}

/**
 * #1056 (owner, mockup cartmoney; iOS `V2ValueRow(editable:)`): a TIỀN row that opens a sheet — the title, then the
 * value in blue bold (or the whole order note, wrapped on the right, in #334155) and a small blue pencil; no ›. The whole row is the
 * button; TalkBack reads "title, value[, N ảnh], Sửa". [photoCount] (#1043, order note on a new order) adds a grey
 * camera + count before the pencil.
 */
@Composable
private fun CartMoneyEditRow(title: String, value: String, tone: CartMoneyTone, onClick: () -> Unit, photoCount: Int = 0) {
    val photos = if (photoCount > 0) stringResource(R.string.v2_order_note_photos, photoCount) else null
    val spoken = CartV2Logic.moneyRowSpoken(title, value, stringResource(R.string.edit), photos)
    // #1056 (owner: "note cần xuống dòng"): a note wraps on the right; the title and the pencil stay on its first line
    val isNoteText = tone == CartMoneyTone.NOTE_TEXT
    val align = if (isNoteText) Alignment.Top else Alignment.CenterVertically
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onClick)
            .clearAndSetSemantics { contentDescription = spoken; role = Role.Button }
            .heightIn(min = 48.dp)
            .padding(horizontal = 16.dp, vertical = if (isNoteText) 13.dp else 0.dp),
        verticalAlignment = align,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, fontSize = DS.TextSize.Body, color = DS.Colors.Text)
        Row(
            Modifier.weight(1f),
            verticalAlignment = align,
            horizontalArrangement = Arrangement.spacedBy(7.dp, Alignment.End), // #1061: mockup cartedit A, value 7dp before the pencil
        ) {
            Text(
                value,
                fontSize = DS.TextSize.Body,
                fontWeight = if (isNoteText) FontWeight.Normal else FontWeight.Bold,
                color = if (isNoteText) Color(0xFF334155) else DS.Colors.Primary,
                maxLines = if (isNoteText) Int.MAX_VALUE else 1, overflow = TextOverflow.Ellipsis,
                textAlign = androidx.compose.ui.text.style.TextAlign.End,
                modifier = Modifier.weight(1f, fill = false),
            )
            if (photoCount > 0) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Icon(Icons.Outlined.PhotoCamera, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                    Text("$photoCount", fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = Color(0xFF64748B))
                }
            }
            CartEditPencil(Modifier.padding(top = if (isNoteText) 2.dp else 0.dp))
        }
    }
}

/**
 * #1024 option A: a cart line's note entry. #1056 (owner: "note cần xuống dòng", iOS `CartNoteEntry`): the whole note
 * on as many lines as it needs (it was one line cut with "…")
 */
@Composable
private fun NoteEntry(note: String?, emptyText: String, spokenText: String, actionLabel: String, onClick: () -> Unit) {
    val shown = CartV2Logic.noteShown(note)
    val boxed = if (shown != null) Modifier.background(Color(0xFFF8FAFC)) else Modifier
    Row(
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).then(boxed)
            .clickable(onClickLabel = actionLabel, role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = spokenText }
            .padding(horizontal = if (shown != null) 8.dp else 2.dp, vertical = if (shown != null) 5.dp else 4.dp),
        verticalAlignment = if (shown != null) Alignment.Top else Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            shown ?: emptyText,
            fontSize = DS.TextSize.Secondary,
            fontWeight = if (shown != null) FontWeight.Normal else FontWeight.Medium,
            color = if (shown != null) Color(0xFF334155) else DS.Colors.Primary,
            modifier = Modifier.weight(1f, fill = false),
        )
        // #1061: the text, then the cart's one blue edit icon, like the TIỀN rows
        CartEditPencil(Modifier.padding(top = if (shown != null) 2.dp else 0.dp))
    }
}

/**
 * #684 (canvas N2, iOS CartItemNoteSheet): "Ghi chú món" — title + ✕, product name, text area, "Xoá ghi chú" / "Lưu".
 * #1043: the same sheet is the cart's "Ghi chú đơn" (no [subtitle]; [photos] = the note photo row on a new order).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CartItemNoteSheet(
    title: String,
    subtitle: String?,
    note: String?,
    placeholder: String,
    hint: String,
    onDismiss: () -> Unit,
    onSave: (String?) -> Unit,
    photos: (@Composable () -> Unit)? = null,
) {
    var text by remember { mutableStateOf(note.orEmpty()) }
    val focus = remember { androidx.compose.ui.focus.FocusRequester() }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.weight(1f).semantics { heading() })
                val closeLabel = stringResource(R.string.close)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = Color(0xFF475569), modifier = Modifier.size(18.dp)) }
            }
            subtitle?.let { Text(it, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, maxLines = 2) }
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text(placeholder) },
                minLines = 5,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().focusRequester(focus).semantics { contentDescription = title },
            )
            Text(hint, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            photos?.invoke()
            Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!CartV2Logic.noteText(note).isNullOrEmpty()) {
                    OutlinedButton(onClick = { onSave(null) }, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f).height(50.dp)) {
                        Text(stringResource(R.string.v2_item_note_clear), color = Color(0xFFB91C1C), fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false)
                    }
                }
                // #1056: two equal buttons, as on iOS ("Delete note" was cut on two lines)
                Button(onClick = { onSave(text) }, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f).height(50.dp)) {
                    Text(stringResource(R.string.v2_item_note_save), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/** #1043 (iOS CartItemNoteSheet photo row): "Ảnh" + "2/5 ảnh", then 56dp tiles with a × and "Thêm" while there is room */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun NoteSheetPhotos(files: List<java.io.File>, max: Int, onRemove: (java.io.File) -> Unit, onAdd: () -> Unit, onPreview: (Any) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.notes_v2_photos), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
            Text(stringResource(R.string.detail_photos_count, files.size, max), fontSize = DS.TextSize.Secondary, color = Color(0xFF64748B))
        }
        androidx.compose.foundation.layout.FlowRow(
            Modifier.padding(top = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            files.forEach { file ->
                com.anyrent.pos.ui.orders.v2.PhotoTile(file, { onPreview(file) }, size = 56.dp) { onRemove(file) }
            }
            if (com.anyrent.pos.domain.notifications.NoteEditorLogic.canAdd(files.size, max)) {
                com.anyrent.pos.ui.orders.v2.AddTile(onAdd, size = 56.dp)
            }
        }
    }
}

/** #893 (owner): a cart line that swipes end-to-start onto a red "Xoá"; past the threshold it is removed (iOS SwipeDeleteRow) */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToDeleteLine(onDelete: () -> Unit, content: @Composable () -> Unit) {
    val state = androidx.compose.material3.rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == androidx.compose.material3.SwipeToDismissBoxValue.EndToStart) { onDelete(); true } else false
        },
        positionalThreshold = { total -> total * 0.5f },
    )
    androidx.compose.material3.SwipeToDismissBox(
        state = state,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(Modifier.fillMaxSize().background(Color(0xFFDC2626)).padding(end = 24.dp), contentAlignment = Alignment.CenterEnd) {
                Text(stringResource(R.string.cart_swipe_delete), color = Color.White, fontWeight = FontWeight.Bold, fontSize = DS.TextSize.Body)
            }
        },
    ) {
        Box(Modifier.background(DS.Colors.Surface)) { content() }
    }
}
