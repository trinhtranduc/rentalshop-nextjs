package com.anyrent.pos.ui.calendar

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.CalendarDay
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar

@Composable
fun CalendarScreen(onOpenOrder: (Int) -> Unit) {
    val now = remember { Calendar.getInstance() }
    var month by remember { mutableIntStateOf(now.get(Calendar.MONTH) + 1) }
    var year by remember { mutableIntStateOf(now.get(Calendar.YEAR)) }
    var days by remember { mutableStateOf<List<CalendarDay>>(emptyList()) }
    var selected by remember { mutableStateOf<CalendarDay?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().calendarOrders(month, year)
            }
            loading = false
            result.onSuccess {
                days = it.filter { day -> day.orderCount > 0 || day.orders.isNotEmpty() }
                selected = days.firstOrNull()
            }.onFailure { error = it.message }
        }
    }

    LaunchedEffect(month, year) { load() }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.calendar), style = MaterialTheme.typography.headlineSmall)
        Text("$month / $year")
        androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            androidx.compose.material3.Button(onClick = {
                if (month == 1) {
                    month = 12; year -= 1
                } else month -= 1
            }) { Text("<") }
            androidx.compose.material3.Button(onClick = {
                if (month == 12) {
                    month = 1; year += 1
                } else month += 1
            }) { Text(">") }
        }
        when {
            loading -> LoadingBox()
            error != null -> EmptyOrError(error!!)
            days.isEmpty() -> EmptyOrError(stringResource(R.string.empty_calendar))
            else -> {
                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(days, key = { it.date }) { day ->
                        Text(
                            "${day.date} · ${day.orderCount} orders",
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selected = day }
                                .padding(8.dp),
                            style = if (selected?.date == day.date) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
                selected?.orders?.let { orders ->
                    Text(stringResource(R.string.orders), style = MaterialTheme.typography.titleMedium)
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(orders, key = { it.id }) { order ->
                            Text(
                                "${order.orderNumber} · ${order.status}",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onOpenOrder(order.id) }
                                    .padding(8.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
