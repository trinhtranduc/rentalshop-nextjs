package com.anyrent.pos.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.orderStatusColor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import androidx.compose.ui.Modifier

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

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.calendar), style = MaterialTheme.typography.headlineSmall)
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(onClick = { yearMonth = yearMonth.minusMonths(1) }) { Text("<") }
            Text(
                yearMonth.format(DateTimeFormatter.ofPattern("MM / yyyy")),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Button(onClick = { yearMonth = yearMonth.plusMonths(1) }) { Text(">") }
        }

        when {
            loadingMonth && counts.isEmpty() -> LoadingBox()
            error != null && counts.isEmpty() -> EmptyOrError(error!!)
            else -> {
                MonthGrid(
                    yearMonth = yearMonth,
                    counts = counts,
                    selectedDate = selectedDate,
                    today = today,
                    onSelect = { loadDay(it) },
                )
                Spacer(Modifier.height(4.dp))
                Text(selectedDate, style = MaterialTheme.typography.titleMedium)
                when {
                    loadingDay -> Text(stringResource(R.string.loading))
                    dayOrders.isEmpty() -> Text(
                        stringResource(R.string.empty_day_orders),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    else -> LazyColumn(
                        Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(dayOrders, key = { it.id }) { order ->
                            CalendarOrderCard(order = order, onClick = { onOpenOrder(order.id) })
                        }
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
                                            MaterialTheme.colorScheme.primaryContainer,
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
                                )
                                if (count > 0) {
                                    Box(
                                        Modifier
                                            .size(6.dp)
                                            .background(MaterialTheme.colorScheme.primary, CircleShape),
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
private fun CalendarOrderCard(order: OrderSummary, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(order.orderNumber, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            AssistChip(
                onClick = {},
                enabled = false,
                label = { Text(order.status, color = Color.White) },
                colors = androidx.compose.material3.AssistChipDefaults.assistChipColors(
                    disabledContainerColor = orderStatusColor(order.status),
                    disabledLabelColor = Color.White,
                ),
            )
        }
        order.customerName?.let { Text(it) }
        order.customerPhone?.let {
            Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            listOfNotNull(
                order.pickupPlanAt?.take(10),
                order.returnPlanAt?.take(10),
            ).joinToString(" → "),
            style = MaterialTheme.typography.labelMedium,
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(formatMoney(order.totalAmount), fontWeight = FontWeight.Medium)
            if (order.isReadyToDeliver) {
                Text(stringResource(R.string.ready_badge), color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
