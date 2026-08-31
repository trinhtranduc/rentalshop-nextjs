package com.anyrent.pos.ui.availability

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.availability.AvailabilityOrder
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxHeight
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.theme.BrandPrimary
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.StatusBadge
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailabilityScreen(
    onBack: () -> Unit,
    onFindOrder: () -> Unit,
    onScanProduct: () -> Unit,
    onOpenOrder: (Int) -> Unit,
    scannedProductId: Int? = null,
    focusedProductMode: Boolean = false,
) {
    val app = LocalContext.current.applicationContext as AnyRentApp
    val factory = remember {
        AvailabilityViewModel.Factory(app.container.availabilityRepository)
    }
    val viewModel: AvailabilityViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var showHistory by remember { mutableStateOf(false) }
    var showHistorySheet by remember { mutableStateOf(false) }
    var pendingHistorySheet by remember { mutableStateOf(false) }
    var visibleMonth by remember { mutableStateOf(YearMonth.from(state.selectedDate)) }

    LaunchedEffect(scannedProductId) {
        scannedProductId?.let(viewModel::selectProductById)
    }

    LaunchedEffect(state.selectedDate) {
        visibleMonth = YearMonth.from(state.selectedDate)
    }

    LaunchedEffect(state.selectedProduct?.id) {
        showHistory = false
        showHistorySheet = false
        pendingHistorySheet = false
    }

    LaunchedEffect(state.result, state.checking, pendingHistorySheet) {
        if (!state.checking && pendingHistorySheet) {
            pendingHistorySheet = false
            if (focusedProductMode && state.result?.orders?.isNotEmpty() == true) {
                showHistorySheet = true
            }
        }
    }

    LaunchedEffect(visibleMonth, state.selectedProduct?.id) {
        if (state.selectedProduct != null) {
            viewModel.onCalendarMonthVisible(visibleMonth)
        }
    }

    Scaffold(
        containerColor = if (focusedProductMode) Color(0xFFF4F5F7) else MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (focusedProductMode) {
                            state.selectedProduct?.name ?: stringResource(R.string.availability_check)
                        } else {
                            stringResource(R.string.availability_check)
                        },
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                        )
                    }
                },
                actions = {
                    if (!focusedProductMode) {
                    TextButton(onClick = onFindOrder) {
                        Text(stringResource(R.string.find_order))
                    }
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = if (focusedProductMode) 12.dp else 16.dp),
            verticalArrangement = Arrangement.spacedBy(if (focusedProductMode) 12.dp else 10.dp),
        ) {
            if (!focusedProductMode) item {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = viewModel::updateQuery,
                    label = { Text(stringResource(R.string.search_product)) },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        imeAction = androidx.compose.ui.text.input.ImeAction.Search,
                    ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                        onSearch = { viewModel.search() },
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (!focusedProductMode) item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = viewModel::search,
                        enabled = !state.searching,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(
                            if (state.searching) stringResource(R.string.loading)
                            else stringResource(R.string.search)
                        )
                    }
                    Button(
                        onClick = onScanProduct,
                        enabled = !state.searching,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.scan_product))
                    }
                }
            }
            if (!focusedProductMode && state.products.isNotEmpty()) {
                items(state.products, key = { "product-${it.id}" }) { product ->
                    Column(
                        Modifier.fillMaxWidth()
                            .clickable { viewModel.selectProduct(product) }
                            .padding(vertical = 8.dp),
                    ) {
                        Text(product.name, fontWeight = FontWeight.SemiBold)
                        Text(
                            listOfNotNull(
                                product.barcode,
                                stringResource(R.string.stock_value, product.stock),
                            ).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
            state.selectedProduct?.let { product ->
                item {
                    if (!focusedProductMode) {
                        Text(
                            product.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                if (!focusedProductMode) item {
                    OutlinedTextField(
                        value = state.quantity.toString(),
                        onValueChange = viewModel::updateQuantity,
                        label = { Text(stringResource(R.string.quantity)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (!focusedProductMode) item {
                    Button(
                        onClick = viewModel::check,
                        enabled = !state.checking,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (state.checking) stringResource(R.string.loading)
                            else stringResource(R.string.check_availability)
                        )
                    }
                }
            }
            state.error?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
            if (focusedProductMode && state.selectedProduct != null && state.result == null && state.checking) {
                item {
                    Text(
                        stringResource(R.string.loading),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }
            state.result?.let { result ->
                item {
                    AvailabilitySummary(
                        result = result,
                        dateLabel = state.selectedDate.format(
                            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                        ),
                    )
                }
            }
            if (state.selectedProduct != null && (focusedProductMode || state.result != null)) {
                item {
                    AppCard(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(
                            Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            OccupancyLegend()
                            OccupancyMonthCalendar(
                                month = visibleMonth,
                                selected = state.selectedDate,
                                availableByDate = state.availableByDate,
                                occupancyLoaded = state.occupancyLoaded,
                                occupancyMonth = state.occupancyMonth,
                                stock = state.result?.totalStock ?: state.selectedProduct?.stock ?: 0,
                                minDate = LocalDate.now(),
                                maxDate = LocalDate.now().plusYears(1),
                                onMonthChange = { visibleMonth = it },
                                onSelect = { day ->
                                    val sameDay = day == state.selectedDate
                                    if (focusedProductMode && sameDay && state.result?.orders?.isNotEmpty() == true) {
                                        showHistorySheet = true
                                    } else {
                                        pendingHistorySheet = focusedProductMode
                                        viewModel.updateDate(day.toString())
                                        viewModel.check()
                                    }
                                },
                            )
                            Text(
                                stringResource(R.string.availability_calendar_tap_hint),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
                if (!focusedProductMode) {
                    item {
                        OutlinedButton(
                            onClick = { showHistory = !showHistory },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                stringResource(
                                    if (showHistory) R.string.hide_order_history
                                    else R.string.view_order_history,
                                ),
                            )
                        }
                    }
                }
            }
            if (!focusedProductMode && showHistory) {
                state.result?.let { result ->
                    if (result.orders.isEmpty()) {
                        item {
                            Text(
                                stringResource(R.string.empty_orders),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 12.dp),
                            )
                        }
                    } else {
                        items(result.orders, key = { "order-${it.id}" }) { order ->
                            AvailabilityOrderCard(order, onClick = { onOpenOrder(order.id) })
                        }
                    }
                }
            }
        }
    }

    if (focusedProductMode && showHistorySheet) {
        state.result?.let { result ->
            AvailabilityOrdersBottomSheet(
                orders = result.orders,
                dateLabel = state.selectedDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                stock = result.totalStock,
                available = result.effectivelyAvailable,
                renting = result.totalRenting,
                onDismiss = { showHistorySheet = false },
                onOpenOrder = { orderId ->
                    showHistorySheet = false
                    onOpenOrder(orderId)
                },
            )
        }
    }
}

@Composable
private fun AvailabilitySummary(result: ProductAvailability, dateLabel: String) {
    val effectiveAvailable = result.effectivelyAvailable
    val hasConflicts = result.conflicts.isNotEmpty() || result.orders.any { it.isConflict }
    val orange = Color(0xFFF19920)

    val accent = when {
        effectiveAvailable > 0 -> Color(0xFF16A34A)
        hasConflicts -> orange
        else -> MaterialTheme.colorScheme.error
    }
    val cardTint = when {
        effectiveAvailable > 0 -> Color(0xFF22C55E).copy(alpha = 0.08f)
        hasConflicts -> orange.copy(alpha = 0.10f)
        else -> MaterialTheme.colorScheme.error.copy(alpha = 0.08f)
    }
    val verdictIcon = when {
        effectiveAvailable > 0 -> "✓"
        hasConflicts -> "!"
        else -> "✕"
    }

    val verdictAnnotatedText = when {
        effectiveAvailable > 0 -> {
            val countText = formatQuantity(effectiveAvailable)
            val full = stringResource(
                R.string.availability_verdict_available,
                countText,
                dateLabel,
            )
            buildAnnotatedString {
                append(full)
                listOf(countText, dateLabel).forEach { highlight ->
                    val start = full.indexOf(highlight)
                    if (start >= 0) {
                        addStyle(
                            SpanStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
                            start,
                            start + highlight.length,
                        )
                    }
                }
            }
        }
        hasConflicts -> {
            val full = stringResource(R.string.availability_verdict_conflict, dateLabel)
            buildAnnotatedString {
                append(full)
                val start = full.indexOf(dateLabel)
                if (start >= 0) {
                    addStyle(
                        SpanStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
                        start,
                        start + dateLabel.length,
                    )
                }
            }
        }
        else -> {
            val full = stringResource(R.string.availability_verdict_out_of_stock, dateLabel)
            buildAnnotatedString {
                append(full)
                val start = full.indexOf(dateLabel)
                if (start >= 0) {
                    addStyle(
                        SpanStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
                        start,
                        start + dateLabel.length,
                    )
                }
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        AppCard(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(cardTint)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    Modifier
                        .size(32.dp)
                        .background(accent, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        verdictIcon,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                }
                Text(
                    verdictAnnotatedText,
                    style = MaterialTheme.typography.titleMedium,
                    color = accent,
                )
            }
        }

        AppCard(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                ImpressiveMetric(
                    label = stringResource(R.string.storage),
                    value = result.totalStock,
                    accent = MaterialTheme.colorScheme.onSurfaceVariant,
                    valueColor = MaterialTheme.colorScheme.onSurface,
                )
                ImpressiveMetric(
                    label = stringResource(R.string.available),
                    value = (result.totalStock - result.totalRenting).coerceAtLeast(0),
                    accent = AvailableGreenAccent,
                    valueColor = if ((result.totalStock - result.totalRenting) > 0) {
                        AvailableGreen
                    } else {
                        MaterialTheme.colorScheme.error
                    },
                )
                ImpressiveMetric(
                    label = stringResource(R.string.renting),
                    value = result.totalRenting,
                    accent = orange,
                    valueColor = orange,
                )
            }
        }
    }
    result.message?.let {
        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ImpressiveMetric(
    label: String,
    value: Int,
    accent: Color,
    valueColor: Color,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Box(
            Modifier
                .width(24.dp)
                .height(3.dp)
                .background(accent, RoundedCornerShape(2.dp)),
        )
        Text(
            formatQuantity(value),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = valueColor,
        )
    }
}

@Composable
private fun CompactMetric(label: String, value: Int, highlighted: Boolean = false) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            formatQuantity(value),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = if (highlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AvailabilityOrderCard(order: AvailabilityOrder, onClick: () -> Unit) {
    val isConflict = order.isConflict
    val orange = Color(0xFFF19920)
    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (isConflict) {
                    Modifier.border(1.5.dp, orange.copy(alpha = 0.65f), RoundedCornerShape(10.dp))
                } else {
                    Modifier
                }
            ),
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
    ) {
        Box(
            Modifier.background(if (isConflict) orange.copy(alpha = 0.14f) else Color.Transparent)
        ) {
            if (isConflict) {
                Box(
                    Modifier
                        .align(Alignment.CenterStart)
                        .width(4.dp)
                        .fillMaxHeight()
                        .background(orange),
                )
            }
            Column(
                Modifier.padding(start = if (isConflict) 18.dp else 14.dp, top = 14.dp, end = 14.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(
                    modifier = Modifier.weight(1f, fill = false),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        "#${order.orderNumber.trim().removePrefix("#")}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    if (isConflict) {
                        Text(
                            stringResource(R.string.availability_conflict_badge),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .background(orange, RoundedCornerShape(10.dp))
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
                StatusBadge(order.status)
            }
            Text(
                order.customerName ?: "—",
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(Modifier.fillMaxWidth()) {
                AvailabilityDateCell(
                    label = stringResource(R.string.create_date),
                    value = formatDisplayDate(order.createdAt),
                    modifier = Modifier.weight(1f),
                )
                AvailabilityDateCell(
                    label = stringResource(R.string.pickup_date),
                    value = formatDisplayDate(order.pickupAt),
                    highlighted = true,
                    modifier = Modifier.weight(1f),
                )
                AvailabilityDateCell(
                    label = stringResource(R.string.return_date),
                    value = formatDisplayDate(order.returnAt),
                    modifier = Modifier.weight(1f),
                )
                AvailabilityDateCell(
                    label = stringResource(R.string.quantity),
                    value = formatQuantity(order.quantity),
                    highlighted = true,
                    modifier = Modifier.weight(1f),
                )
            }
            }
        }
    }
}

@Composable
private fun AvailabilityDateCell(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
) {
    // Match `OrderMetric` fonts from order list
    val labelColor = if (highlighted) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
    Column(modifier.padding(end = 5.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = labelColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            value.ifBlank { "—" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (highlighted) FontWeight.Bold else FontWeight.Medium,
            color = if (highlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val AvailableGreen = Color(0xFF16A34A)
private val AvailableGreenAccent = Color(0xFF22C55E)
private val EmptyGreenText = Color(0xFF178C57)
private val LowYellowFill = Color(0xFFFFFAEB)
private val LowYellowText = Color(0xFFB87A0D)
private val OccupiedRedFill = Color(0xFFFFF2F2)
private val OccupiedRedText = Color(0xFFC73333)
private val SelectedRing = BrandPrimary

private enum class AvailabilityHeatLevel {
    Plenty,
    Low,
    None,
}

private fun heatLevel(remaining: Int, stock: Int): AvailabilityHeatLevel {
    if (remaining <= 0) return AvailabilityHeatLevel.None
    if (stock > 0) {
        return if (remaining.toDouble() / stock > 0.5) AvailabilityHeatLevel.Plenty else AvailabilityHeatLevel.Low
    }
    return if (remaining >= 3) AvailabilityHeatLevel.Plenty else AvailabilityHeatLevel.Low
}

private data class HeatColors(val fill: Color, val accent: Color)

private fun colorsFor(level: AvailabilityHeatLevel): HeatColors = when (level) {
    AvailabilityHeatLevel.Plenty -> HeatColors(EmptyGreenFill, EmptyGreenText)
    AvailabilityHeatLevel.Low -> HeatColors(LowYellowFill, LowYellowText)
    AvailabilityHeatLevel.None -> HeatColors(OccupiedRedFill, OccupiedRedText)
}

@Composable
private fun OccupancyLegend() {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        LegendDot(accent = EmptyGreenText, label = stringResource(R.string.calendar_plenty))
        LegendDot(accent = LowYellowText, label = stringResource(R.string.calendar_low_stock))
        LegendDot(accent = OccupiedRedText, label = stringResource(R.string.calendar_has_orders))
    }
}

@Composable
private fun LegendDot(accent: Color, label: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(8.dp).background(accent, CircleShape))
        Text(
            label,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun OccupancyMonthCalendar(
    month: YearMonth,
    selected: LocalDate,
    availableByDate: Map<LocalDate, Int>,
    occupancyLoaded: Boolean,
    occupancyMonth: YearMonth?,
    stock: Int,
    minDate: LocalDate,
    maxDate: LocalDate,
    onMonthChange: (YearMonth) -> Unit,
    onSelect: (LocalDate) -> Unit,
) {
    val occupancyReady = occupancyLoaded && occupancyMonth == month
    val firstDay = month.atDay(1)
    val daysInMonth = month.lengthOfMonth()
    val locale = Locale.getDefault()
    val firstWeekday = WeekFields.of(locale).firstDayOfWeek
    val weekDays = (0..6).map { firstWeekday.plus(it.toLong()) }
    val startOffset = ((firstDay.dayOfWeek.value - firstWeekday.value) + 7) % 7

    Column(Modifier.fillMaxWidth().padding(horizontal = 2.dp, vertical = 4.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { onMonthChange(month.minusMonths(1)) }) {
                Icon(Icons.Default.ChevronLeft, contentDescription = null)
            }
            Text(
                "${month.month.getDisplayName(TextStyle.FULL, locale)} ${month.year}",
                modifier = Modifier.weight(1f),
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.titleMedium,
            )
            IconButton(
                onClick = { onMonthChange(month.plusMonths(1)) },
                enabled = month.plusMonths(1).atDay(1) <= maxDate,
            ) {
                Icon(Icons.Default.ChevronRight, contentDescription = null)
            }
        }
        Row(Modifier.fillMaxWidth()) {
            weekDays.forEach { day ->
                    Text(
                    day.getDisplayName(TextStyle.NARROW, locale),
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        val cellCount = startOffset + daysInMonth
        val rows = (cellCount + 6) / 7
        repeat(rows) { row ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 2.dp),
            ) {
                repeat(7) { column ->
                    val index = row * 7 + column
                    val dayNumber = index - startOffset + 1
                    if (dayNumber in 1..daysInMonth) {
                        val date = month.atDay(dayNumber)
                        AvailabilityDayCell(
                            dayNumber = dayNumber,
                            selected = date == selected,
                            enabled = !date.isBefore(minDate) && !date.isAfter(maxDate),
                            isToday = date == LocalDate.now(),
                            remaining = if (occupancyReady && !date.isBefore(minDate) && !date.isAfter(maxDate)) {
                                availableByDate[date] ?: 0
                            } else {
                                null
                            },
                            occupancyLoaded = occupancyReady,
                            stock = stock,
                            onClick = { onSelect(date) },
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        Box(Modifier.weight(1f).height(68.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun AvailabilityDayCell(
    dayNumber: Int,
    selected: Boolean,
    enabled: Boolean,
    isToday: Boolean,
    remaining: Int?,
    occupancyLoaded: Boolean,
    stock: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Inventory-calendar pattern: soft heat wash + day top + qty bottom.
    // No nested pills/dots — color wash = status, number = decision metric.
    val hasQty = occupancyLoaded && enabled && remaining != null
    val level = if (hasQty && remaining != null) heatLevel(remaining, stock) else null
    val palette = level?.let { colorsFor(it) }
    val tileFill = palette?.fill
        ?: MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f)
    val accent = palette?.accent ?: MaterialTheme.colorScheme.onSurfaceVariant

    Box(
        modifier
            .height(68.dp)
            .padding(2.5.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(tileFill)
            .then(
                if (selected) Modifier.border(2.dp, SelectedRing, RoundedCornerShape(12.dp))
                else Modifier,
            )
            .clickable(
                enabled = enabled,
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            )
            .then(if (!enabled) Modifier.alpha(0.32f) else Modifier),
    ) {
        if (isToday) {
            Box(
                Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .height(2.5.dp)
                    .background(BrandPrimary),
            )
        }
        Text(
            "$dayNumber",
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 8.dp),
            fontSize = 11.sp,
            fontWeight = if (isToday) FontWeight.Medium else FontWeight.Normal,
            color = when {
                isToday -> BrandPrimary
                !enabled -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
        if (hasQty) {
            Text(
                "$remaining",
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 8.dp),
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = accent,
                maxLines = 1,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AvailabilityOrdersBottomSheet(
    orders: List<AvailabilityOrder>,
    dateLabel: String,
    stock: Int,
    available: Int,
    renting: Int,
    onDismiss: () -> Unit,
    onOpenOrder: (Int) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                stringResource(R.string.availability_orders_sheet_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            if (orders.isEmpty()) {
                Text(
                    stringResource(R.string.availability_history_empty),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    stringResource(R.string.availability_order_count, orders.size),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AppCard(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    ImpressiveMetric(
                        label = stringResource(R.string.storage),
                        value = stock,
                        accent = MaterialTheme.colorScheme.onSurfaceVariant,
                        valueColor = MaterialTheme.colorScheme.onSurface,
                    )
                    ImpressiveMetric(
                        label = stringResource(R.string.renting),
                        value = renting,
                        accent = Color(0xFFF19920),
                        valueColor = Color(0xFFF19920),
                    )
                    ImpressiveMetric(
                        label = stringResource(R.string.available),
                        value = available,
                        accent = AvailableGreenAccent,
                        valueColor = if (available > 0) AvailableGreen else MaterialTheme.colorScheme.error,
                    )
                }
            }
            val displayOrders = remember(orders) {
                orders.sortedByDescending { it.isConflict }
            }
            displayOrders.forEach { order ->
                AvailabilityOrderCard(order, onClick = { onOpenOrder(order.id) })
            }
        }
    }
}
