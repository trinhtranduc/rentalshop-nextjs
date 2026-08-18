package com.anyrent.pos.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetValue
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import com.anyrent.pos.R
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.domain.availability.RentalCartLine
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.DisplayDateFormatter
import com.anyrent.pos.ui.common.formatDisplayDate
import com.anyrent.pos.ui.common.formatDisplayDateTime
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.orderLinePricingText
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppInputField
import com.anyrent.pos.ui.common.AppNumericPadSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSheetHeader
import com.anyrent.pos.ui.customers.CustomersScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.LocalDateTime
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartCheckoutScreen(
    onBack: () -> Unit,
    onPreview: () -> Unit,
    onCreated: (Int) -> Unit,
    previewMode: Boolean = false,
    onViewCustomerOrders: ((Customer) -> Unit)? = null,
) {
    val lines by CartStore.lines.collectAsState()
    val customer by CartStore.customer.collectAsState()
    val orderType by CartStore.orderType.collectAsState()
    val pickup by CartStore.pickupDate.collectAsState()
    val ret by CartStore.returnDate.collectAsState()
    val notes by CartStore.notes.collectAsState()
    val discount by CartStore.discount.collectAsState()
    val discountType by CartStore.discountType.collectAsState()
    val deposit by CartStore.depositAmount.collectAsState()
    val security by CartStore.securityDeposit.collectAsState()
    val collateral by CartStore.collateralDetails.collectAsState()
    val editingOrderId by CartStore.editingOrderId.collectAsState()

    // Why derive here (not CartStore.totalAmount getters): those getters are plain
    // Kotlin properties. Scaffold bottomBar / preview summary may skip redraw if Compose
    // only sees StateFlow reads that didn't change in that slot. Totals must be
    // computed from collected `lines` / discount so +/- quantity and price edits
    // always refresh the Preview button and order-preview screen.
    val itemCount = lines.sumOf { it.quantity }
    val subtotal = lines.sumOf { it.lineTotal }
    val discountAmount = when (discountType) {
        CartStore.DiscountType.AMOUNT -> discount.coerceAtLeast(0.0)
        CartStore.DiscountType.PERCENT -> subtotal * (discount.coerceIn(0.0, 100.0) / 100.0)
    }
    val totalAmount = (subtotal - discountAmount).coerceAtLeast(0.0)
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var pickupText by remember(pickup) { mutableStateOf(pickup.toString()) }
    var returnText by remember(ret) { mutableStateOf(ret.toString()) }
    var showDetails by remember { mutableStateOf(false) }
    var pricingMenuProductId by remember { mutableStateOf<Int?>(null) }
    var numericEditor by remember { mutableStateOf<String?>(null) }
    var numericText by remember { mutableStateOf("0") }
    var showDateSelection by remember { mutableStateOf(false) }
    var showPickCustomer by remember { mutableStateOf(false) }
    var showClearConfirmation by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val app = LocalContext.current.applicationContext as AnyRentApp
    val validateRentalCart = remember {
        ValidateRentalCartAvailability(app.container.availabilityRepository)
    }
    val cartEmptyMessage = stringResource(R.string.cart_empty_error)
    val customerRequiredMessage = stringResource(R.string.customer_required_error)
    val sessionExpiredMessage = stringResource(R.string.session_expired_error)
    val availabilityFailedMessage = stringResource(R.string.availability_check_failed)
    val validationFallbackMessage = stringResource(R.string.order_validation_fallback)
    val discountSummaryLabel = when {
        discount <= 0 -> stringResource(R.string.discount)
        discountType == CartStore.DiscountType.PERCENT -> stringResource(
            R.string.discount_label_percent,
            formatQuantity(discount),
        )
        else -> stringResource(
            R.string.discount_label_amount,
            formatMoney(discount),
        )
    }
    val displayDateFormatter = remember { DisplayDateFormatter }

    fun submitOrder() {
        if (lines.isEmpty()) {
            error = cartEmptyMessage
            return
        }
        if (customer == null) {
            error = customerRequiredMessage
            return
        }
        loading = true
        error = null
        scope.launch {
            if (orderType == "RENT") {
                val availabilityResult = runCatching {
                    validateRentalCart(
                        lines = lines.map {
                            RentalCartLine(
                                productId = it.product.id,
                                productName = it.product.name,
                                quantity = it.quantity,
                            )
                        },
                        pickupDate = pickup,
                        returnDate = ret,
                    )
                }
                val availabilityError = availabilityResult.exceptionOrNull()
                if (availabilityError != null) {
                    loading = false
                    error = when (availabilityError) {
                        is AppError.Unauthorized -> sessionExpiredMessage
                        else -> "$availabilityFailedMessage\n${availabilityError.message.orEmpty()}"
                    }
                    return@launch
                }
                val blocked = availabilityResult.getOrThrow()
                if (blocked.isNotEmpty()) {
                    loading = false
                    error = "Availability conflicts: " + blocked.joinToString { it.productName }
                    return@launch
                }
            }
            val result = withContext(Dispatchers.IO) {
                val payloadLines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) }
                val deposits = lines.associate { it.product.id to it.product.deposit }
                val pricing = lines.associate { it.product.id to it.pricingType }
                val daysByProduct = lines.associate { it.product.id to it.rentalDays }
                val editId = editingOrderId
                if (editId != null) {
                    ApiClient.get().updateOrder(
                        orderId = editId,
                        orderType = orderType,
                        customerId = customer?.id,
                        lines = payloadLines,
                        totalAmount = CartStore.totalAmount,
                        depositAmount = deposit,
                        notes = listOfNotNull(
                            notes.takeIf { it.isNotBlank() },
                            collateral.takeIf { it.isNotBlank() }?.let { "Collateral: $it" },
                        ).joinToString("\n").ifBlank { null },
                        rentalDays = CartStore.rentalDaysInclusive(),
                        pickupPlanAt = if (orderType == "RENT") CartStore.isoPickup() else null,
                        returnPlanAt = if (orderType == "RENT") CartStore.isoReturn() else null,
                        securityDeposit = security,
                        discountType = if (discountType == CartStore.DiscountType.AMOUNT) "amount" else "percentage",
                        discountValue = discount,
                        discountAmount = CartStore.discountAmount,
                        collateralDetails = collateral.takeIf { it.isNotBlank() },
                        depositsByProduct = deposits,
                        pricingTypesByProduct = pricing,
                        rentalDaysByProduct = daysByProduct,
                    )
                } else {
                    ApiClient.get().createOrder(
                        orderType = orderType,
                        customerId = customer?.id,
                        lines = payloadLines,
                        totalAmount = CartStore.totalAmount,
                        depositAmount = deposit,
                        notes = listOfNotNull(
                            notes.takeIf { it.isNotBlank() },
                            collateral.takeIf { it.isNotBlank() }?.let { "Collateral: $it" },
                        ).joinToString("\n").ifBlank { null },
                        rentalDays = CartStore.rentalDaysInclusive(),
                        pickupPlanAt = if (orderType == "RENT") CartStore.isoPickup() else null,
                        returnPlanAt = if (orderType == "RENT") CartStore.isoReturn() else null,
                        securityDeposit = security.takeIf { it > 0 },
                        discountType = if (discountType == CartStore.DiscountType.AMOUNT) "amount" else "percentage",
                        discountValue = discount.takeIf { it > 0 },
                        discountAmount = CartStore.discountAmount.takeIf { it > 0 },
                        depositsByProduct = deposits,
                        pricingTypesByProduct = pricing,
                        rentalDaysByProduct = daysByProduct,
                    )
                }
            }
            loading = false
            result.onSuccess {
                CartStore.clear()
                onCreated(it.id)
            }.onFailure {
                error = it.message
                    ?.takeUnless { message ->
                        message.isBlank() || message.equals("Validation error", ignoreCase = true)
                    }
                    ?: validationFallbackMessage
            }
        }
    }

    fun openPreview() {
        when {
            lines.isEmpty() -> error = cartEmptyMessage
            customer == null -> error = customerRequiredMessage
            else -> onPreview()
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    if (previewMode) {
                        Text(
                            stringResource(R.string.order_preview),
                            // iOS nav title: Bold 20
                            style = MaterialTheme.typography.titleLarge,
                        )
                    } else {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = MaterialTheme.shapes.medium,
                        ) {
                            Row(Modifier.padding(3.dp)) {
                                listOf(
                                    "RENT" to R.string.rental_order,
                                    "SALE" to R.string.sales_order,
                                ).forEach { (type, label) ->
                                    val selected = orderType == type
                                    Surface(
                                        color = if (selected) MaterialTheme.colorScheme.surface
                                        else Color.Transparent,
                                        shape = MaterialTheme.shapes.small,
                                        shadowElevation = if (selected) 1.dp else 0.dp,
                                        modifier = Modifier.clickable {
                                            CartStore.setOrderType(type)
                                            // Pricing method (per rental / per day) is rent-only.
                                            if (type != "RENT") pricingMenuProductId = null
                                        },
                                    ) {
                                        Text(
                                            stringResource(label),
                                            modifier = Modifier.padding(
                                                horizontal = 11.dp,
                                                vertical = 8.dp,
                                            ),
                                            color = if (selected) {
                                                MaterialTheme.colorScheme.primary
                                            } else {
                                                MaterialTheme.colorScheme.onSurfaceVariant
                                            },
                                            fontWeight = if (selected) {
                                                FontWeight.SemiBold
                                            } else {
                                                FontWeight.Medium
                                            },
                                            fontSize = 13.sp,
                                            maxLines = 1,
                                        )
                                    }
                                }
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    if (!previewMode) {
                        IconButton(
                            enabled = lines.isNotEmpty(),
                            onClick = { showClearConfirmation = true },
                        ) {
                            Icon(
                                Icons.Default.DeleteSweep,
                                contentDescription = stringResource(R.string.clear_cart),
                                tint = if (lines.isNotEmpty()) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }
                    }
                },
            )
        },
        bottomBar = {
            AppCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding(),
            ) {
                Column(
                    Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Order preview already shows dates/deposit/discount in the scroll body.
                    // Keep the bottom card as CTA-only so the rental-period summary is not duplicated.
                    if (!previewMode) {
                        if (orderType == "RENT") {
                            SummaryLine(
                                stringResource(R.string.rental_period),
                                "${pickup.format(displayDateFormatter)}  →  ${ret.format(displayDateFormatter)}",
                                highlighted = true,
                                onClick = { showDateSelection = true },
                            )
                            SummaryLine(
                                stringResource(R.string.deposit),
                                formatMoney(deposit),
                                highlighted = true,
                                onClick = {
                                    numericText = deposit.toLong().toString()
                                    numericEditor = "DEPOSIT"
                                },
                            )
                        }
                        SummaryLine(
                            discountSummaryLabel,
                            formatMoney(discountAmount),
                            highlighted = true,
                            onClick = {
                                numericText = discount.toLong().toString()
                                numericEditor = "DISCOUNT"
                            },
                        )
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = MaterialTheme.shapes.small,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(58.dp)
                            .clickable(enabled = !loading) {
                                if (previewMode) submitOrder() else openPreview()
                            },
                    ) {
                        Row(
                            Modifier.padding(horizontal = 18.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                stringResource(
                                    when {
                                        !previewMode -> R.string.preview
                                        editingOrderId != null -> R.string.edit_order
                                        else -> R.string.create_order
                                    },
                                ),
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                            )
                            Text(
                                "(${formatQuantity(itemCount)})  ${formatMoney(totalAmount)}",
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                            )
                        }
                    }
                }
            }
        },
    ) { padding ->
        if (previewMode) CartPreviewDetailContent(
            modifier = Modifier.fillMaxSize().padding(padding),
            customer = customer,
            lines = lines,
            orderType = orderType,
            pickup = pickup,
            ret = ret,
            deposit = deposit,
            securityDeposit = security,
            collateral = collateral,
            notes = notes,
            discount = discountAmount,
            subtotal = subtotal,
            total = totalAmount,
        ) else Column(
            Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            AppCard(
                Modifier.fillMaxWidth(),
                onClick = { if (!previewMode) showPickCustomer = true },
                shape = RoundedCornerShape(10.dp),
            ) {
                Row(
                    Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Icon(
                        Icons.Default.AccountCircle,
                        contentDescription = null,
                        modifier = Modifier.size(52.dp),
                        tint = MaterialTheme.colorScheme.outline,
                    )
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.customer), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            customer?.displayName ?: stringResource(R.string.select_customer),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Text("›", style = MaterialTheme.typography.headlineMedium)
                }
            }

            if (lines.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().height(280.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        stringResource(R.string.no_products_added),
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.outline,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Light,
                        textAlign = TextAlign.Center,
                    )
                }
            } else {
                lines.forEach { line ->
                    key(line.product.id) {
                    val dismissState = rememberSwipeToDismissBoxState(
                        confirmValueChange = { target ->
                            if (target == SwipeToDismissBoxValue.EndToStart) {
                                CartStore.remove(line.product.id)
                                true
                            } else {
                                false
                            }
                        },
                    )
                    SwipeToDismissBox(
                        state = dismissState,
                        enableDismissFromStartToEnd = false,
                        enableDismissFromEndToStart = !previewMode,
                        backgroundContent = {
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .background(
                                        color = MaterialTheme.colorScheme.errorContainer,
                                        shape = MaterialTheme.shapes.large,
                                    )
                                    .padding(horizontal = 20.dp),
                                contentAlignment = Alignment.CenterEnd,
                            ) {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = stringResource(R.string.delete_product),
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.size(28.dp),
                                )
                            }
                        },
                    ) {
                        AppCard(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Column(
                                Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Surface(
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    shape = MaterialTheme.shapes.small,
                                    modifier = Modifier.size(64.dp),
                                ) {
                                    Icon(
                                        Icons.Default.Image,
                                        contentDescription = stringResource(R.string.product_image),
                                        modifier = Modifier.padding(18.dp),
                                        tint = MaterialTheme.colorScheme.outline,
                                    )
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        line.product.name,
                                        style = MaterialTheme.typography.bodyLarge.copy(
                                            fontSize = 18.sp,
                                            lineHeight = 23.sp,
                                            fontWeight = FontWeight.Normal,
                                        ),
                                        maxLines = 2,
                                    )
                                    Text(
                                        line.product.barcode ?: "—",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Text(
                                    stringResource(R.string.available),
                                    color = Color(0xFF17B95E),
                                )
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                IconButton(
                                    enabled = !previewMode,
                                    onClick = {
                                        CartStore.updateQuantity(line.product.id, line.quantity - 1)
                                    },
                                ) { Text("−", style = MaterialTheme.typography.headlineMedium) }
                                Text(
                                    formatQuantity(line.quantity),
                                    color = MaterialTheme.colorScheme.primary,
                                    style = MaterialTheme.typography.titleLarge,
                                )
                                IconButton(
                                    enabled = !previewMode,
                                    onClick = {
                                        CartStore.updateQuantity(line.product.id, line.quantity + 1)
                                    },
                                ) { Text("+", style = MaterialTheme.typography.headlineMedium) }
                                if (orderType == "RENT") {
                                    androidx.compose.foundation.layout.Box(Modifier.weight(1f)) {
                                        // iOS rateSelector → PricingMethodSheet (not DropdownMenu)
                                        Surface(
                                            color = MaterialTheme.colorScheme.surfaceVariant,
                                            shape = MaterialTheme.shapes.small,
                                            modifier = Modifier
                                                .align(Alignment.CenterEnd)
                                                .clickable(enabled = !previewMode) {
                                                    pricingMenuProductId = line.product.id
                                                },
                                        ) {
                                            Text(
                                                if (line.pricingType.equals("DAILY", ignoreCase = true)) {
                                                    stringResource(R.string.per_day)
                                                } else {
                                                    stringResource(R.string.per_rental)
                                                } + "  ▾",
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                                                style = MaterialTheme.typography.titleMedium,
                                            )
                                        }
                                    }
                                }
                            }
                            androidx.compose.material3.HorizontalDivider()
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(
                                    modifier = Modifier.clickable(enabled = !previewMode) {
                                        numericText = line.unitPrice.toLong().toString()
                                        numericEditor = "PRICE:${line.product.id}"
                                    },
                                ) {
                                    Text(stringResource(R.string.unit_price), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(formatMoney(line.unitPrice), color = MaterialTheme.colorScheme.primary)
                                    Text(
                                        if (orderType == "RENT" &&
                                            line.pricingType.equals("DAILY", ignoreCase = true)
                                        ) {
                                            stringResource(
                                                R.string.daily_price_formula,
                                                formatQuantity(line.quantity),
                                                formatQuantity(line.rentalDays),
                                                formatMoney(line.unitPrice),
                                            )
                                        } else {
                                            stringResource(
                                                R.string.fixed_price_formula,
                                                formatQuantity(line.quantity),
                                                formatMoney(line.unitPrice),
                                            )
                                        },
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(stringResource(R.string.subtotal), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(formatMoney(line.lineTotal), fontWeight = FontWeight.Bold)
                                }
                            }
                            }
                        }
                    }
                    }
                }
            }
        }
    }

    error?.let { message ->
        AppAlertError(
            title = stringResource(R.string.could_not_create_order),
            message = message,
            onDismiss = { error = null },
        )
    }

    if (showClearConfirmation) {
        AppAlertConfirm(
            title = stringResource(R.string.clear_cart),
            message = stringResource(R.string.clear_cart_confirmation),
            confirmLabel = stringResource(R.string.clear),
            destructive = true,
            onDismiss = { showClearConfirmation = false },
            onConfirm = {
                CartStore.clear()
                showClearConfirmation = false
            },
        )
    }

    if (showPickCustomer) {
        AppFormSheet(onDismiss = { showPickCustomer = false }) {
            CustomersScreen(
                pickMode = true,
                embeddedInSheet = true,
                onPicked = { showPickCustomer = false },
                onBack = { showPickCustomer = false },
                onViewOrders = { customer ->
                    showPickCustomer = false
                    onViewCustomerOrders?.invoke(customer)
                },
            )
        }
    }

    if (orderType == "RENT") pricingMenuProductId?.let { productId ->
        val line = lines.firstOrNull { it.product.id == productId } ?: return@let
        ModalBottomSheet(
            onDismissRequest = { pricingMenuProductId = null },
            sheetState = rememberModalBottomSheetState(
                skipPartiallyExpanded = false,
                confirmValueChange = { it != SheetValue.Expanded },
            ),
            dragHandle = {
                Box(
                    Modifier
                        .padding(top = 8.dp)
                        .fillMaxWidth(),
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
                AppSheetHeader(title = stringResource(R.string.price_and_pricing_method))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 16.dp, bottom = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    listOf(
                        "FIXED" to stringResource(R.string.per_rental),
                        "DAILY" to stringResource(R.string.per_day),
                    ).forEach { (type, title) ->
                        val selected = line.pricingType.equals(type, ignoreCase = true)
                        val optionPrice = cartLinePriceForType(line, type)
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable {
                                    CartStore.setPricingType(productId, type)
                                    pricingMenuProductId = null
                                }
                                .padding(vertical = 8.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(Modifier.weight(1f), verticalAlignment = Alignment.Bottom) {
                                Text(
                                    formatMoney(optionPrice),
                                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp),
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.onSurface
                                    },
                                    fontWeight = FontWeight.Medium,
                                )
                                Text(
                                    " / $title",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 1.dp),
                                )
                            }
                            Icon(
                                if (selected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (selected) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                                modifier = Modifier.size(24.dp),
                            )
                        }
                    }

                    Button(
                        onClick = {
                            pricingMenuProductId = null
                            numericText = line.unitPrice.toLong().toString()
                            numericEditor = "PRICE:$productId"
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            contentColor = MaterialTheme.colorScheme.primary,
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            stringResource(R.string.edit_unit_price),
                            modifier = Modifier.padding(start = 8.dp),
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }

    if (showDetails) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showDetails = false },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.background,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    stringResource(R.string.order_details),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                if (orderType == "RENT") {
                    Surface(
                        onClick = {
                            showDetails = false
                            showDateSelection = true
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.outlineVariant,
                        ),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                                Text(
                                    stringResource(R.string.rental_period),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    "${formatDisplayDate(pickup)}  →  ${formatDisplayDate(ret)}",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        }
                    }
                    AppInputField(
                        value = if (deposit == 0.0) "" else deposit.toString(),
                        onValueChange = { CartStore.setDeposit(it.toDoubleOrNull() ?: 0.0) },
                        label = stringResource(R.string.deposit),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    AppInputField(
                        value = if (security == 0.0) "" else security.toString(),
                        onValueChange = { CartStore.setSecurityDeposit(it.toDoubleOrNull() ?: 0.0) },
                        label = stringResource(R.string.security_deposit),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    AppInputField(
                        value = collateral,
                        onValueChange = CartStore::setCollateral,
                        label = stringResource(R.string.collateral),
                        placeholder = stringResource(R.string.tap_to_add),
                    )
                }
                Text(
                    stringResource(R.string.discount),
                    style = MaterialTheme.typography.titleMedium,
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = discountType == CartStore.DiscountType.AMOUNT,
                        onClick = { CartStore.setDiscountType(CartStore.DiscountType.AMOUNT) },
                        label = { Text(stringResource(R.string.discount_amount)) },
                        modifier = Modifier.weight(1f),
                    )
                    FilterChip(
                        selected = discountType == CartStore.DiscountType.PERCENT,
                        onClick = { CartStore.setDiscountType(CartStore.DiscountType.PERCENT) },
                        label = { Text(stringResource(R.string.discount_percent)) },
                        modifier = Modifier.weight(1f),
                    )
                }
                AppInputField(
                    value = if (discount == 0.0) "" else discount.toString(),
                    onValueChange = { CartStore.setDiscount(it.toDoubleOrNull() ?: 0.0) },
                    label = stringResource(R.string.discount),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                AppInputField(
                    value = notes,
                    onValueChange = CartStore::setNotes,
                    label = stringResource(R.string.notes),
                    placeholder = stringResource(R.string.add_notes_hint),
                    singleLine = false,
                    minLines = 3,
                )
                Button(
                    onClick = { showDetails = false },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                ) {
                    Text(stringResource(R.string.apply), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }

    numericEditor?.let { editor ->
        AppNumericPadSheet(
            title = when {
                editor == "DEPOSIT" -> stringResource(R.string.enter_deposit)
                editor.startsWith("PRICE:") -> stringResource(R.string.unit_price)
                else -> stringResource(R.string.enter_discount)
            },
            rawValue = numericText,
            onRawValueChange = { numericText = it },
            onDismiss = { numericEditor = null },
            onConfirm = {
                val value = numericText.toDoubleOrNull() ?: 0.0
                when {
                    editor == "DEPOSIT" -> CartStore.setDeposit(value)
                    editor.startsWith("PRICE:") -> editor.substringAfter(':').toIntOrNull()
                        ?.let { CartStore.updateUnitPrice(it, value) }
                    else -> CartStore.setDiscount(value)
                }
                numericEditor = null
            },
        ) {
            if (editor == "DISCOUNT") {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    AppFilterChip(
                        label = "%",
                        selected = discountType == CartStore.DiscountType.PERCENT,
                        onClick = { CartStore.setDiscountType(CartStore.DiscountType.PERCENT) },
                        modifier = Modifier.weight(1f),
                    )
                    AppFilterChip(
                        label = "đ",
                        selected = discountType == CartStore.DiscountType.AMOUNT,
                        onClick = { CartStore.setDiscountType(CartStore.DiscountType.AMOUNT) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }

    if (showDateSelection) {
        AppDateRangePickerSheet(
            title = stringResource(R.string.select_rental_period),
            subtitle = stringResource(R.string.rental_period),
            startLabel = stringResource(R.string.pickup_date),
            endLabel = stringResource(R.string.return_date),
            initialStart = pickup,
            initialEnd = ret,
            onDismiss = { showDateSelection = false },
            onConfirm = { startDate, endDate ->
                CartStore.setPickup(startDate)
                CartStore.setReturn(endDate)
                pickupText = startDate.toString()
                returnText = endDate.toString()
                showDateSelection = false
            },
        )
    }
}

@Composable
private fun CartPreviewDetailContent(
    modifier: Modifier,
    customer: Customer?,
    lines: List<CartLine>,
    orderType: String,
    pickup: LocalDate,
    ret: LocalDate,
    deposit: Double,
    securityDeposit: Double,
    collateral: String,
    notes: String,
    discount: Double,
    subtotal: Double,
    total: Double,
) {
    val dateFormatter = remember { DisplayDateFormatter }
    Column(
        modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        PreviewSectionLabel(stringResource(R.string.information))
        AppCard(shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(horizontal = 16.dp)) {
                PreviewValueRow(stringResource(R.string.customer), customer?.displayName ?: "N/A")
                customer?.phone?.takeIf { it.isNotBlank() }?.let {
                    androidx.compose.material3.HorizontalDivider()
                    PreviewValueRow(stringResource(R.string.phone), it)
                }
            }
        }
        if (orderType == "RENT") {
            PreviewSectionLabel(stringResource(R.string.date_information))
            AppCard(shape = RoundedCornerShape(10.dp)) {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    PreviewValueRow(
                        stringResource(R.string.book_date),
                        formatDisplayDateTime(LocalDateTime.now()),
                    )
                    androidx.compose.material3.HorizontalDivider()
                    PreviewValueRow(stringResource(R.string.pickup_date), pickup.format(dateFormatter))
                    androidx.compose.material3.HorizontalDivider()
                    PreviewValueRow(stringResource(R.string.return_date), ret.format(dateFormatter))
                    androidx.compose.material3.HorizontalDivider()
                    PreviewValueRow(stringResource(R.string.deposit), formatMoney(deposit), true)
                }
            }
        }
        PreviewSectionLabel(stringResource(R.string.products))
        AppCard(shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(horizontal = 16.dp)) {
                lines.forEachIndexed { index, line ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.size(58.dp),
                        ) {
                            Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.padding(16.dp))
                        }
                        Column(Modifier.weight(1f)) {
                            Text(line.product.name, style = MaterialTheme.typography.titleMedium)
                            Text(
                                orderLinePricingText(
                                    quantity = line.quantity,
                                    unitPrice = line.unitPrice,
                                    pricingType = line.pricingType,
                                    rentalDays = line.rentalDays,
                                    orderType = orderType,
                                ),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(formatMoney(line.lineTotal), fontWeight = FontWeight.SemiBold)
                    }
                    if (index < lines.lastIndex) androidx.compose.material3.HorizontalDivider()
                }
            }
        }
        PreviewSectionLabel(stringResource(R.string.deposit_collateral_details))
        AppCard(shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(horizontal = 16.dp)) {
                PreviewValueRow(
                    stringResource(R.string.collateral),
                    collateral.ifBlank { stringResource(R.string.tap_to_edit) },
                )
                androidx.compose.material3.HorizontalDivider()
                PreviewValueRow(
                    stringResource(R.string.security_deposit),
                    if (securityDeposit > 0) formatMoney(securityDeposit)
                    else stringResource(R.string.tap_to_edit),
                )
                androidx.compose.material3.HorizontalDivider()
                PreviewValueRow(stringResource(R.string.damage_fee), "0")
            }
        }
        PreviewSectionLabel(stringResource(R.string.notes))
        AppCard(shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(stringResource(R.string.notes), style = MaterialTheme.typography.bodyLarge)
                Text(
                    notes.ifBlank { stringResource(R.string.tap_to_add) },
                    color = if (notes.isBlank()) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        PreviewSectionLabel(stringResource(R.string.summary))
        AppCard(shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(horizontal = 16.dp)) {
                PreviewValueRow(stringResource(R.string.subtotal), formatMoney(subtotal), true)
                androidx.compose.material3.HorizontalDivider()
                PreviewValueRow(stringResource(R.string.discount), formatMoney(discount), true)
                androidx.compose.material3.HorizontalDivider()
                PreviewValueRow(stringResource(R.string.grand_total), formatMoney(total), true)
            }
        }
        androidx.compose.foundation.layout.Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun PreviewSectionLabel(text: String) {
    Text(
        text.uppercase(),
        modifier = Modifier.padding(start = 12.dp, top = 10.dp),
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

/** Catalog price for FIXED/DAILY — mirrors iOS fixedRatePrice / dailyRatePrice in the sheet. */
private fun cartLinePriceForType(line: CartLine, type: String): Double {
    if (line.unitPriceOverride != null && line.pricingType.equals(type, ignoreCase = true)) {
        return line.unitPriceOverride
    }
    return line.product.pricingOptions.firstOrNull {
        it.type.equals(type, ignoreCase = true)
    }?.price ?: if (line.product.pricingType.equals(type, ignoreCase = true)) {
        line.product.rentPrice
    } else {
        0.0
    }
}

@Composable
private fun PreviewValueRow(label: String, value: String, emphasized: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge)
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = if (emphasized) FontWeight.SemiBold else FontWeight.Normal,
            color = if (emphasized) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun SummaryLine(
    label: String,
    value: String,
    highlighted: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val clickModifier = if (onClick == null) Modifier else Modifier.clickable(onClick = onClick)
    Row(
        Modifier.fillMaxWidth().then(clickModifier).padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            color = if (highlighted) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurface,
        )
        Text(value)
    }
}
