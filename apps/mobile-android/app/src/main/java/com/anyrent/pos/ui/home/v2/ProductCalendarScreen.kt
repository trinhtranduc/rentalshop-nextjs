package com.anyrent.pos.ui.home.v2

import android.widget.Toast
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.domain.products.ProductCalendarLogic
import com.anyrent.pos.domain.products.ProductCalendarLogic.RangeRole
import com.anyrent.pos.domain.products.ProductCalendarLogic.Tone
import com.anyrent.pos.domain.products.ProductStock
import com.anyrent.pos.domain.products.barcodeText
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.orders.v2.orderRowTexts
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

private object CalendarColors {
    val FullFill = Color(0xFFECFDF5)
    val FullText = Color(0xFF065F46)
    val LowFill = Color(0xFFFFF7ED)
    val LowText = Color(0xFF7C2D12)
    val NoneFill = Color(0xFFFEE2E2)
    val NoneText = Color(0xFF7F1D1D)
    val PastFill = Color(0xFFF8FAFC)
    val PastText = Color(0xFF94A3B8)
    val BetweenFill = Color(0xFFDBEAFE)
    val LegendFull = Color(0xFFA7F3D0)
    val LegendLow = Color(0xFFFED7AA)
    val LegendNone = Color(0xFFFECACA)
    val Danger = Color(0xFFB91C1C)
    val NoteFill = Color(0xFFFFF7ED)
}

/**
 * #642 "Lịch trống" (mockups/lich-trong.png): one month of free units per Vietnam day, a pickup → return range, the
 * orders that hold the product on the tapped day, and "Thêm vào giỏ với ngày này". No money is shown (staff too).
 */
@Composable
fun ProductCalendarScreen(
    productId: Int,
    onBack: () -> Unit,
    onOpenOrder: (Int) -> Unit,
    /** #684: open on this day and its month (the cart's "Hết hàng …"); today otherwise */
    initialDay: LocalDate? = null,
) {
    val context = LocalContext.current
    val today = remember { ShopTime.today() }
    val opening = initialDay ?: today
    var product by remember { mutableStateOf<Product?>(null) }
    var month by remember { mutableStateOf(YearMonth.from(opening)) }
    val available = remember { mutableStateMapOf<String, Int>() }
    val loadedMonths = remember { mutableStateListOf<YearMonth>() }
    var stock by remember { mutableStateOf<Int?>(null) }
    var range by remember { mutableStateOf(ProductCalendarLogic.Range()) }
    var focusDay by remember { mutableStateOf(opening) }
    var openOrders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    val allowOverlap by SessionStore.allowOverlappingOrdersFlow.collectAsState()
    val added = stringResource(R.string.v2_added_to_cart)
    val texts = orderRowTexts()

    suspend fun loadMonth(m: YearMonth) {
        if (m in loadedMonths) return
        val (from, to) = ProductCalendarLogic.monthKeys(m)
        withContext(Dispatchers.IO) { ProductsV2Api.availabilityCalendar(productId, from, to, SessionStore.outletId) }
            .onSuccess {
                available.putAll(it.available)
                it.stock?.let { s -> stock = s }
                loadedMonths.add(m)
            }
    }

    LaunchedEffect(productId) {
        withContext(Dispatchers.IO) { ApiClient.get().getProduct(productId) }.onSuccess { product = it }
        withContext(Dispatchers.IO) { ApiClient.get().refreshAllowOverlappingOrders() }
        // The orders the detail lists as "Sắp tới" / "Đang thuê", larger pages
        openOrders = withContext(Dispatchers.IO) {
            listOf("RESERVED" to "pickupPlanAt", "PICKUPED" to "returnPlanAt").flatMap { (status, sortBy) ->
                ApiClient.get().searchOrders(page = 1, limit = 100, status = status, productId = productId, sortBy = sortBy, sortOrder = "asc")
                    .getOrNull()?.items.orEmpty()
            }
        }
    }
    LaunchedEffect(month) { loadMonth(month) }
    LaunchedEffect(range) {
        val start = range.start ?: return@LaunchedEffect
        ProductCalendarLogic.months(start, range.end ?: start).forEach { loadMonth(it) }
    }

    val current = product
    val total = stock ?: current?.let { ProductStock.counts(it, SessionStore.outletId).total } ?: 0
    val minAvailable = range.start?.let { start -> range.end?.let { end -> ProductCalendarLogic.minAvailable(start, end, available) } }

    Column(Modifier.fillMaxSize().background(Color.White)) {
        // Header ‹ Lịch trống
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(48.dp).clip(RoundedCornerShape(999.dp)).clickable(onClick = onBack)
                    .semantics { contentDescription = context.getString(R.string.back); role = Role.Button },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(30.dp))
            }
            Text(stringResource(R.string.v2_detail_free_calendar), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // Product row
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ProductThumb(current?.images?.firstOrNull() ?: current?.imageUrl, 56.dp, 14.dp)
                Column(Modifier.weight(1f)) {
                    Text(current?.name.orEmpty(), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    val meta = listOfNotNull(current?.barcodeText?.takeIf { it.isNotBlank() }, stringResource(R.string.v2_calendar_total, total))
                    Text(meta.joinToString(" · "), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
            }

            // Month title ‹ ›
            val canPrev = ProductCalendarLogic.canGoPrevious(month, today)
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                MonthArrow(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, stringResource(R.string.v2_calendar_prev_month), canPrev) { month = month.minusMonths(1) }
                Text(
                    stringResource(R.string.v2_calendar_month, month.monthValue, month.year, month.month.getDisplayName(TextStyle.FULL, Locale.getDefault())),
                    fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold, color = DS.Colors.Text, textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
                )
                MonthArrow(Icons.AutoMirrored.Outlined.KeyboardArrowRight, stringResource(R.string.v2_calendar_next_month), true) { month = month.plusMonths(1) }
            }

            // Weekdays T2 … CN
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                texts.weekdays.forEach {
                    Text(it, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                }
            }

            // Grid
            val cells = ProductCalendarLogic.grid(month)
            Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                cells.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        (0 until 7).forEach { i ->
                            val date = week.getOrNull(i)
                            if (date == null) {
                                Spacer(Modifier.weight(1f))
                            } else {
                                DayCell(
                                    cell = ProductCalendarLogic.cell(date, today, available, total),
                                    rangeRole = ProductCalendarLogic.role(date, range),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    focusDay = date
                                    range = ProductCalendarLogic.tap(range, date, today)
                                }
                            }
                        }
                    }
                }
            }

            // Legend
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                LegendItem(CalendarColors.LegendFull, stringResource(R.string.v2_calendar_legend_full))
                LegendItem(CalendarColors.LegendLow, stringResource(R.string.v2_calendar_legend_low))
                LegendItem(CalendarColors.LegendNone, stringResource(R.string.v2_calendar_legend_none))
                LegendItem(DS.Colors.Primary, stringResource(R.string.v2_calendar_legend_chosen))
            }
            HorizontalDivider(color = V2Colors.Line, modifier = Modifier.padding(horizontal = 16.dp))

            // Orders that hold the product on the tapped day
            val dayOrders = ProductCalendarLogic.ordersCovering(focusDay, openOrders)
            val dayLabel = OrderRowDates.day(focusDay, texts.weekdays)
            Text(
                if (dayOrders.isEmpty()) dayLabel.uppercase()
                else pluralStringResource(R.plurals.v2_calendar_day_orders, dayOrders.size, dayLabel, dayOrders.size).uppercase(),
                fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, letterSpacing = 0.5.sp,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 4.dp),
            )
            if (dayOrders.isEmpty()) {
                Text(stringResource(R.string.v2_calendar_no_orders), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
            }
            dayOrders.forEach { order ->
                DayOrderRow(order, ProductCalendarLogic.orderDates(order, texts), ProductCalendarLogic.quantity(order, productId)) { onOpenOrder(order.id) }
            }
            Spacer(Modifier.height(16.dp))
        }

        // Range summary + add to cart
        HorizontalDivider(color = V2Colors.Line)
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val start = range.start
            val end = range.end
            val summary = when {
                start == null -> buildAnnotatedString { append(stringResource(R.string.v2_calendar_pick_start)) }
                end == null -> buildAnnotatedString { append(stringResource(R.string.v2_calendar_pick_end, OrderRowDates.day(start, texts.weekdays))) }
                else -> {
                    val days = ProductCalendarLogic.dayCount(start, end)
                    val head = "${OrderRowDates.day(start, texts.weekdays)} → ${OrderRowDates.day(end, texts.weekdays)} · " +
                        pluralStringResource(R.plurals.v2_calendar_days, days, days) + " · "
                    val min = minAvailable ?: 0
                    val tail = if (min > 0) stringResource(R.string.v2_calendar_min_left, min) else stringResource(R.string.v2_calendar_none)
                    buildAnnotatedString {
                        append(head)
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = if (min > 0) DS.Colors.Text else CalendarColors.Danger)) { append(tail) }
                    }
                }
            }
            Text(summary, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, maxLines = 2)
            if (ProductCalendarLogic.showsOverlapNote(range, minAvailable, allowOverlap)) {
                Text(
                    stringResource(R.string.v2_calendar_overlap_note), fontSize = DS.TextSize.Secondary, color = CalendarColors.LowText,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(CalendarColors.NoteFill).padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
            AppPrimaryButton(
                stringResource(R.string.v2_calendar_add),
                enabled = current != null && ProductCalendarLogic.canAdd(range, minAvailable, allowOverlap),
                onClick = {
                    val p = current ?: return@AppPrimaryButton
                    val s = range.start ?: return@AppPrimaryButton
                    val e = range.end ?: return@AppPrimaryButton
                    // Same path as the detail's add + the cart's date pick: a rental with these pickup / return days
                    if (CartStore.orderType.value != "RENT") CartStore.setOrderType("RENT")
                    CartStore.setPickup(s)
                    CartStore.setReturn(e)
                    CartStore.addProduct(p)
                    Toast.makeText(context, added, Toast.LENGTH_SHORT).show()
                    onBack()
                },
            )
        }
    }
}

@Composable
private fun MonthArrow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(44.dp).clip(RoundedCornerShape(999.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = label; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = if (enabled) DS.Colors.Text else Color(0xFFCBD5E1), modifier = Modifier.size(28.dp))
    }
}

@Composable
private fun DayCell(cell: ProductCalendarLogic.Cell, rangeRole: RangeRole, modifier: Modifier, onClick: () -> Unit) {
    val (toneFill, toneText) = when (cell.tone) {
        Tone.FULL -> CalendarColors.FullFill to CalendarColors.FullText
        Tone.LOW -> CalendarColors.LowFill to CalendarColors.LowText
        Tone.NONE -> CalendarColors.NoneFill to CalendarColors.NoneText
        Tone.PAST -> CalendarColors.PastFill to CalendarColors.PastText
        Tone.UNKNOWN -> CalendarColors.PastFill to DS.Colors.Text
    }
    val (fill, text) = when (rangeRole) {
        RangeRole.START, RangeRole.END -> DS.Colors.Primary to Color.White
        RangeRole.BETWEEN -> CalendarColors.BetweenFill to DS.Colors.Primary
        RangeRole.NONE -> toneFill to toneText
    }
    val shape = RoundedCornerShape(10.dp)
    val count = cell.available?.let { if (it <= 0) stringResource(R.string.v2_calendar_none) else stringResource(R.string.v2_calendar_left, it) }
    val label = listOfNotNull(cell.date.dayOfMonth.toString(), count).joinToString(", ")
    Column(
        modifier.height(58.dp).clip(shape).background(fill)
            .then(if (cell.isToday) Modifier.border(2.dp, DS.Colors.Text, shape) else Modifier)
            .clickable(onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = label; role = Role.Button; selected = rangeRole != RangeRole.NONE },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(cell.date.dayOfMonth.toString(), fontSize = 18.sp, fontWeight = if (cell.tone == Tone.PAST) FontWeight.Medium else FontWeight.Bold, color = text)
        if (count != null) Text(count, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = text, maxLines = 1)
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Box(Modifier.size(12.dp).clip(RoundedCornerShape(3.dp)).background(color))
        Text(label, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
    }
}

@Composable
private fun DayOrderRow(order: OrderSummary, dates: String, quantity: Int, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).semantics { role = Role.Button }
            .heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(color = DS.Colors.Text, fontWeight = FontWeight.Bold)) { append(order.customerName.orEmpty()) }
                    withStyle(SpanStyle(color = DS.Colors.TextMuted, fontWeight = FontWeight.SemiBold)) { append(" #${order.orderNumber}") }
                },
                fontSize = DS.TextSize.Name, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            if (dates.isNotEmpty()) Text(dates, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
        }
        Text(stringResource(R.string.v2_calendar_quantity, quantity), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
    }
}
