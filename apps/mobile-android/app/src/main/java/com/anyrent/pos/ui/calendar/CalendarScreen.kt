package com.anyrent.pos.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Surface
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ArrowCircleUp
import androidx.compose.material.icons.filled.ArrowCircleDown
import androidx.compose.material.icons.filled.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.MaskedPhoneRow
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.orderStatusColor
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.StatusBadge
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import androidx.compose.ui.Modifier
import coil.compose.AsyncImage

@Composable
fun CalendarScreen(onOpenOrder: (Int) -> Unit) {
    val today = remember { LocalDate.now() }
    var yearMonth by remember { mutableStateOf(YearMonth.from(today)) }
    var counts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var selectedDate by remember { mutableStateOf(today.toString()) }
    var dayOrders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    var loadingMonth by remember { mutableStateOf(true) }
    var loadingDay by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var calendarExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadMonth() {
        scope.launch {
            loadingMonth = true
            error = null
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().calendarOrdersCount(yearMonth.monthValue, yearMonth.year)
                    .recoverCatching {
                        // Fallback to full calendar endpoint if count route fails
                        ApiClient.get().calendarOrders(yearMonth.monthValue, yearMonth.year)
                            .getOrThrow()
                            .associate { it.date to it.orderCount }
                    }
            }
            loadingMonth = false
            result.onSuccess { counts = it }
                .onFailure { error = it.message }
        }
    }

    fun loadDay(date: String) {
        selectedDate = date
        scope.launch {
            loadingDay = true
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().calendarOrdersByDate(date)
            }
            loadingDay = false
            result.onSuccess { dayOrders = it }
                .onFailure {
                    // Fallback: try embedded month data
                    val embedded = withContext(Dispatchers.IO) {
                        ApiClient.get().calendarOrders(yearMonth.monthValue, yearMonth.year)
                    }.getOrNull()?.find { it.date == date }?.orders
                    dayOrders = embedded.orEmpty()
                }
        }
    }

    LaunchedEffect(yearMonth) {
        loadMonth()
        val keep = selectedDate.takeIf { it.startsWith(yearMonth.toString()) } ?: yearMonth.atDay(1).toString()
        loadDay(keep)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(Modifier.size(width = 96.dp, height = 48.dp))
            Text(
                stringResource(R.string.calendar),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
            )
            Row {
                IconButton(
                    onClick = {
                        loadMonth()
                        loadDay(selectedDate)
                    },
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.refresh))
                }
                IconButton(onClick = { calendarExpanded = !calendarExpanded }) {
                    Icon(
                        if (calendarExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                    )
                }
            }
        }

        when {
            loadingMonth && counts.isEmpty() -> LoadingBox()
            error != null && counts.isEmpty() -> EmptyOrError(error!!)
            else -> {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconButton(onClick = { yearMonth = yearMonth.minusMonths(1) }) {
                                Icon(
                                    Icons.Default.ChevronLeft,
                                    contentDescription = stringResource(R.string.previous_month),
                                )
                            }
                            Text(
                                yearMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium,
                            )
                            IconButton(onClick = { yearMonth = yearMonth.plusMonths(1) }) {
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = stringResource(R.string.next_month),
                                )
                            }
                        }
                        if (calendarExpanded) {
                            MonthGrid(
                                yearMonth = yearMonth,
                                counts = counts,
                                selectedDate = selectedDate,
                                today = today,
                                onSelect = { loadDay(it) },
                            )
                        } else {
                            WeekStrip(
                                selectedDate = LocalDate.parse(selectedDate),
                                counts = counts,
                                today = today,
                                onSelect = { date ->
                                    val parsed = LocalDate.parse(date)
                                    if (YearMonth.from(parsed) != yearMonth) {
                                        yearMonth = YearMonth.from(parsed)
                                    }
                                    loadDay(date)
                                },
                            )
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        val selected = LocalDate.parse(selectedDate)
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    selected.format(DateTimeFormatter.ofPattern("MMM d")),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    selected.format(DateTimeFormatter.ofPattern("EEEE, MMM d, yyyy")),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            androidx.compose.material3.Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = MaterialTheme.shapes.large,
                            ) {
                                Text(
                                    stringResource(R.string.rental_order_count, dayOrders.size),
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                                )
                            }
                        }
                }
                when {
                    loadingDay -> Text(stringResource(R.string.loading))
                    dayOrders.isEmpty() -> Column(
                        Modifier.fillMaxSize().weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(48.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            stringResource(R.string.empty_day_orders),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            stringResource(R.string.choose_another_day),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 32.dp),
                        )
                    }
                    else -> LazyColumn(
                        Modifier.weight(1f).padding(horizontal = 16.dp),
                        contentPadding = PaddingValues(top = 12.dp, bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(dayOrders, key = { it.id }) { order ->
                            CalendarOrderCard(
                                order = order,
                                onClick = { onOpenOrder(order.id) },
                                onReadyToDeliverChange = { ready ->
                                    // Optimistic UI (iOS parity), then persist via PUT.
                                    dayOrders = dayOrders.map {
                                        if (it.id == order.id) it.copy(isReadyToDeliver = ready) else it
                                    }
                                    scope.launch {
                                        val result = withContext(Dispatchers.IO) {
                                            com.anyrent.pos.data.ApiParity.setReadyToDeliver(order.id, ready)
                                        }
                                        result.onFailure { err ->
                                            dayOrders = dayOrders.map {
                                                if (it.id == order.id) it.copy(isReadyToDeliver = !ready) else it
                                            }
                                            error = err.message
                                        }
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WeekStrip(
    selectedDate: LocalDate,
    counts: Map<String, Int>,
    today: LocalDate,
    onSelect: (String) -> Unit,
) {
    val sundayOffset = selectedDate.dayOfWeek.value % 7
    val start = selectedDate.minusDays(sundayOffset.toLong())
    val headers = listOf(
        R.string.calendar_sun, R.string.calendar_mon, R.string.calendar_tue,
        R.string.calendar_wed, R.string.calendar_thu, R.string.calendar_fri, R.string.calendar_sat,
    )
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth()) {
            headers.forEach { id ->
                Text(
                    stringResource(id),
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            repeat(7) { index ->
                val date = start.plusDays(index.toLong())
                val selected = date == selectedDate
                val isToday = date == today
                val count = counts[date.toString()] ?: 0
                Column(
                    Modifier
                        .weight(1f)
                        .aspectRatio(1f)
                        .padding(2.dp)
                        .then(
                            if (selected) Modifier.background(
                                MaterialTheme.colorScheme.primary,
                                RoundedCornerShape(10.dp),
                            ) else Modifier
                        )
                        .then(
                            if (isToday && !selected) Modifier.border(
                                1.dp,
                                MaterialTheme.colorScheme.primary,
                                RoundedCornerShape(10.dp),
                            ) else Modifier
                        )
                        .clickable { onSelect(date.toString()) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        date.dayOfMonth.toString(),
                        color = if (selected) MaterialTheme.colorScheme.onPrimary
                        else if (date.month != selectedDate.month) MaterialTheme.colorScheme.outline
                        else MaterialTheme.colorScheme.onSurface,
                        fontWeight = if (selected || count > 0) FontWeight.SemiBold else FontWeight.Normal,
                    )
                    if (count > 0) {
                        Box(
                            Modifier.size(5.dp).background(
                                if (selected) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.primary,
                                CircleShape,
                            ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthGrid(
    yearMonth: YearMonth,
    counts: Map<String, Int>,
    selectedDate: String,
    today: LocalDate,
    onSelect: (String) -> Unit,
) {
    val first = yearMonth.atDay(1)
    val startOffset = first.dayOfWeek.value % 7 // Sun=0 when using %7 with Mon=1..Sun=7 → Sun=0
    val daysInMonth = yearMonth.lengthOfMonth()
    val headers = listOf(
        R.string.calendar_sun, R.string.calendar_mon, R.string.calendar_tue,
        R.string.calendar_wed, R.string.calendar_thu, R.string.calendar_fri, R.string.calendar_sat,
    )
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth()) {
            headers.forEach { id ->
                Text(
                    stringResource(id),
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        var day = 1
        val totalCells = ((startOffset + daysInMonth + 6) / 7) * 7
        for (row in 0 until totalCells / 7) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                for (col in 0 until 7) {
                    val cell = row * 7 + col
                    Box(Modifier.weight(1f).aspectRatio(1f), contentAlignment = Alignment.Center) {
                        if (cell >= startOffset && day <= daysInMonth) {
                            val date = yearMonth.atDay(day).toString()
                            val count = counts[date] ?: 0
                            val selected = date == selectedDate
                            val isToday = date == today.toString()
                            Column(
                                Modifier
                                    .fillMaxSize()
                                    .padding(2.dp)
                                    .then(
                                        if (selected) Modifier.background(
                                            MaterialTheme.colorScheme.primary,
                                            RoundedCornerShape(8.dp),
                                        ) else Modifier
                                    )
                                    .then(
                                        if (isToday && !selected) Modifier.border(
                                            1.dp,
                                            MaterialTheme.colorScheme.primary,
                                            RoundedCornerShape(8.dp),
                                        ) else Modifier
                                    )
                                    .clickable { onSelect(date) }
                                    .padding(2.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center,
                            ) {
                                Text(
                                    day.toString(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (selected || count > 0) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.onPrimary
                                    } else {
                                        MaterialTheme.colorScheme.onSurface
                                    },
                                )
                                if (count > 0) {
                                    Box(
                                        Modifier
                                            .size(6.dp)
                                            .background(
                                                if (selected) MaterialTheme.colorScheme.onPrimary
                                                else MaterialTheme.colorScheme.primary,
                                                CircleShape,
                                            ),
                                    )
                                }
                            }
                            day++
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarOrderCard(
    order: OrderSummary,
    onClick: () -> Unit,
    onReadyToDeliverChange: (Boolean) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    var detail by remember { mutableStateOf<OrderDetail?>(null) }
    var loadingProducts by remember { mutableStateOf(false) }
    var phoneRevealed by remember(order.id) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    // iOS CalendarHeaderCell: only RESERVED / PENDING / DRAFT show the checkbox.
    val canToggleReady = order.status.equals("RESERVED", ignoreCase = true) ||
        order.status.equals("PENDING", ignoreCase = true) ||
        order.status.equals("DRAFT", ignoreCase = true)
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
    ) {
    Column(
        Modifier.padding(start = 14.dp, top = 12.dp, end = 14.dp, bottom = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "#${order.orderNumber.removePrefix("#")}",
                modifier = Modifier.weight(1f).clickable(onClick = onClick),
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Normal,
            )
            StatusBadge(order.status)
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant,
            ) {
                IconButton(onClick = {
                    expanded = !expanded
                    if (expanded && detail == null && !loadingProducts) {
                        loadingProducts = true
                        scope.launch {
                            detail = withContext(Dispatchers.IO) {
                                ApiClient.get().getOrder(order.id).getOrNull()
                            }
                            loadingProducts = false
                        }
                    }
                }) {
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                    )
                }
            }
        }
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Column(
                Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    order.customerName ?: "—",
                    style = MaterialTheme.typography.titleSmall,
                )
                order.customerPhone?.takeIf { it.isNotBlank() }?.let { phone ->
                    MaskedPhoneRow(
                        phone = phone,
                        revealed = phoneRevealed,
                        onToggle = { phoneRevealed = !phoneRevealed },
                    )
                }
            }
            if (canToggleReady) {
                Checkbox(
                    checked = order.isReadyToDeliver,
                    onCheckedChange = onReadyToDeliverChange,
                )
                Text(
                    stringResource(R.string.ready_deliver),
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable {
                        onReadyToDeliverChange(!order.isReadyToDeliver)
                    },
                )
            }
        }
        Row(Modifier.fillMaxWidth()) {
            CalendarOrderMetric(
                Icons.Default.AccessTime,
                stringResource(R.string.create_date),
                formatCalendarOrderDate(order.createdAt, true),
                Modifier.weight(1f),
            )
            CalendarOrderMetric(
                Icons.Default.ArrowCircleUp,
                stringResource(R.string.pickup_date),
                formatCalendarOrderDate(order.pickupPlanAt),
                Modifier.weight(1f),
            )
            CalendarOrderMetric(
                Icons.Default.ArrowCircleDown,
                stringResource(R.string.return_date),
                formatCalendarOrderDate(order.returnPlanAt),
                Modifier.weight(1f),
            )
        }
        if (expanded) {
            HorizontalDivider()
            when {
                loadingProducts -> Text(
                    stringResource(R.string.loading),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                detail?.items.isNullOrEmpty() -> Text(
                    stringResource(R.string.empty_products),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> detail!!.items.forEach { item ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(72.dp).background(
                                MaterialTheme.colorScheme.surfaceVariant,
                                RoundedCornerShape(8.dp),
                            ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Image, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
                            AsyncImage(
                                model = item.imageUrl,
                                contentDescription = item.productName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.productName?.takeIf { it.isNotBlank() }
                                    ?: stringResource(R.string.unknown_product),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            item.note?.takeIf { it.isNotBlank() }?.let { note ->
                                Text(
                                    note,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                )
                            }
                        }
                        Text(
                            "${formatQuantity(item.quantity)} × ${formatMoney(item.unitPrice)} = ${formatMoney(item.totalPrice)}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
    }
}

@Composable
private fun CalendarOrderMetric(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

private fun formatCalendarOrderDate(value: String?, includeTime: Boolean = false): String {
    if (value.isNullOrBlank() || value.equals("null", true)) return "N/A"
    val dateTime = runCatching { OffsetDateTime.parse(value).toLocalDateTime() }.getOrNull()
        ?: runCatching { LocalDateTime.parse(value.removeSuffix("Z")) }.getOrNull()
    return dateTime?.format(DateTimeFormatter.ofPattern(if (includeTime) "dd/MM/yy HH:mm" else "dd/MM/yy"))
        ?: value.take(10)
}
