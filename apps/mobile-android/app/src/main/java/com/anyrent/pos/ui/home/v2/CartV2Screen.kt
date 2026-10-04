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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.products.CartLineCalc
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
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.ZoneId

/**
 * Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
 * State lives in [CartStore]; the button opens the existing order preview, which creates the order.
 */
@Composable
fun CartV2Screen(
    onBack: () -> Unit,
    onPreview: () -> Unit,
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
    var removeLine by remember { mutableStateOf<CartLine?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val emptyMessage = stringResource(R.string.cart_empty_error)
    val customerMessage = stringResource(R.string.customer_required_error)

    // Batch availability for the dates (rent) or today (sale), same call as the old cart's check
    val availabilityKey = lines.map { it.product.id to it.quantity } to Triple(isSale, pickup, ret)
    LaunchedEffect(availabilityKey) {
        if (lines.isEmpty()) return@LaunchedEffect
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

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(60.dp).padding(start = 4.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.v2_cart_back))
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
                    Text(
                        "${formatDay(pickup)} → ${formatDay(ret)}",
                        fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f),
                    )
                    Text(
                        stringResource(R.string.v2_cart_days, CartV2Logic.rentalDays(pickup, ret)),
                        fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF),
                        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 10.dp, vertical = 3.dp),
                    )
                }
            }

            SectionBand(stringResource(R.string.v2_cart_items, lines.sumOf { it.quantity })) {
                Text(
                    "+ " + stringResource(R.string.v2_cart_add_more),
                    fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
                    modifier = Modifier.clickable(onClick = onBack).padding(vertical = 8.dp).semantics { role = Role.Button },
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
                    onPricing = { type -> CartStore.setPricingType(line.product.id, type) },
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
                onClick = { noteDraft = notes },
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
                Text(stringResource(if (isSale) R.string.v2_cart_customer_pays else R.string.v2_cart_collect_deposit), fontSize = 13.sp, color = DS.Colors.TextMuted)
                Text(formatMoneyVnd(CartV2Logic.collectNow(isSale, total, deposit)), fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            AppPrimaryButton(
                stringResource(if (isSale) R.string.v2_cart_sell_and_collect else R.string.v2_cart_create),
                modifier = Modifier.weight(1.1f),
                onClick = {
                    when {
                        lines.isEmpty() -> error = emptyMessage
                        customer == null -> error = customerMessage
                        else -> onPreview()
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
        AppNumericPadSheet(
            title = stringResource(if (editor == "DEPOSIT") R.string.enter_deposit else R.string.enter_discount),
            rawValue = numericText,
            onRawValueChange = { numericText = it },
            onDismiss = { numericEditor = null },
            onConfirm = {
                val value = numericText.toDoubleOrNull() ?: 0.0
                if (editor == "DEPOSIT") CartStore.setDeposit(value) else CartStore.setDiscount(value)
                numericEditor = null
            },
        ) {
            if (editor == "DISCOUNT") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppFilterChip("%", discountType == CartStore.DiscountType.PERCENT, { CartStore.setDiscountType(CartStore.DiscountType.PERCENT) }, Modifier.weight(1f))
                    AppFilterChip("đ", discountType == CartStore.DiscountType.AMOUNT, { CartStore.setDiscountType(CartStore.DiscountType.AMOUNT) }, Modifier.weight(1f))
                }
            }
        }
    }
    noteDraft?.let { draft ->
        AlertDialog(
            onDismissRequest = { noteDraft = null },
            title = { Text(stringResource(R.string.v2_cart_note)) },
            text = { OutlinedTextField(value = draft, onValueChange = { noteDraft = it }, modifier = Modifier.fillMaxWidth()) },
            confirmButton = {
                TextButton(onClick = {
                    CartStore.setNotes(draft.trim())
                    noteDraft = null
                }) { Text(stringResource(R.string.ok)) }
            },
            dismissButton = { TextButton(onClick = { noteDraft = null }) { Text(stringResource(R.string.cancel)) } },
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
            Text(initials, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E40AF))
        }
        Column(Modifier.weight(1f)) {
            Text(
                name ?: stringResource(R.string.v2_cart_pick_customer),
                fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                color = if (name == null) DS.Colors.Primary else DS.Colors.Text,
            )
            if (!phone.isNullOrBlank()) Text(phone, fontSize = 13.sp, color = DS.Colors.TextMuted)
        }
        if (name != null) Text(stringResource(R.string.v2_cart_change), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
    }
}

@Composable
private fun ItemRow(
    line: CartLine,
    isSale: Boolean,
    available: Int?,
    onQuantity: (Int) -> Unit,
    onPricing: (String) -> Unit,
) {
    val calc = CartV2Logic.calc(line, isSale)
    val price = formatMoneyVnd(calc.unitPrice)
    val calcText = when (val kind = calc.kind) {
        CartLineCalc.Kind.Sale -> stringResource(R.string.v2_calc_sale, price, calc.quantity)
        CartLineCalc.Kind.PerRental -> stringResource(R.string.v2_calc_per_rental, price, calc.quantity)
        is CartLineCalc.Kind.PerDay -> stringResource(R.string.v2_calc_per_day, price, kind.days) +
            if (calc.quantity > 1) " × ${formatQuantity(calc.quantity)}" else ""
    }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ProductThumb(line.product.images.firstOrNull() ?: line.product.imageUrl, 56.dp, 10.dp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(line.product.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(formatMoneyVnd(calc.total), fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
                Text(calcText, fontSize = 13.sp, color = DS.Colors.TextMuted)
                CartV2Logic.shortage(available, line.quantity)?.let { left ->
                    Text(
                        stringResource(if (isSale) R.string.v2_cart_short_stock else R.string.v2_cart_short_rent, left),
                        fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF991B1B),
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFFFEE2E2)).padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        if (!isSale && CartV2Logic.offersBothModes(line.product)) {
                            V2Segmented(
                                titles = listOf(stringResource(R.string.v2_price_per_rental), stringResource(R.string.v2_price_per_day)),
                                selected = if (line.pricingType.equals("DAILY", ignoreCase = true)) 1 else 0,
                                onSelect = { onPricing(if (it == 1) "DAILY" else "FIXED") },
                                compact = true,
                            )
                        } else if (isSale && available != null) {
                            Text(stringResource(R.string.v2_cart_in_stock, available), fontSize = 13.sp, color = DS.Colors.TextMuted)
                        }
                    }
                    V2Stepper(value = line.quantity, onChange = onQuantity, minimum = 0, compact = true)
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}
