package com.anyrent.pos.ui.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.anyrent.shared.model.OrderStatusFlow
import com.anyrent.shared.model.SharedOrderStatus
import com.anyrent.shared.model.SharedOrderType
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun EmptyOrError(message: String) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private val commaNumberFormatter: NumberFormat =
    NumberFormat.getNumberInstance(Locale.US).apply {
        isGroupingUsed = true
        maximumFractionDigits = 2
        minimumFractionDigits = 0
    }

fun formatMoney(amount: Double): String = synchronized(commaNumberFormatter) {
    commaNumberFormatter.format(amount)
}

fun formatQuantity(value: Number): String = synchronized(commaNumberFormatter) {
    commaNumberFormatter.format(value)
}

/**
 * App-wide display formats — match iOS `dateInString()` / full create datetime.
 * - Date only: `dd/MM/yy` (order list, check, overview, cart dates)
 * - Date + time: `dd/MM/yyyy HH:mm` (order detail create date)
 */
val DisplayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yy")
val DisplayDateTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

private val zone: ZoneId get() = ZoneId.systemDefault()

fun formatDisplayDate(date: LocalDate): String = date.format(DisplayDateFormatter)

fun formatDisplayDate(value: String?): String {
    val raw = value
        ?.trim()
        ?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }
        ?: return "N/A"
    return runCatching {
        Instant.parse(raw).atZone(zone).toLocalDate().format(DisplayDateFormatter)
    }.recoverCatching {
        OffsetDateTime.parse(raw.replace(" ", "T")).atZoneSameInstant(zone)
            .toLocalDate().format(DisplayDateFormatter)
    }.recoverCatching {
        LocalDate.parse(raw.take(10)).format(DisplayDateFormatter)
    }.getOrDefault("N/A")
}

fun formatDisplayDateTime(dateTime: LocalDateTime): String =
    dateTime.format(DisplayDateTimeFormatter)

fun formatDisplayDateTime(value: String?): String {
    val raw = value
        ?.trim()
        ?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }
        ?: return "N/A"
    val normalized = raw.replace(" ", "T")
    return runCatching {
        OffsetDateTime.parse(normalized).atZoneSameInstant(zone).format(DisplayDateTimeFormatter)
    }.recoverCatching {
        Instant.parse(raw).atZone(zone).format(DisplayDateTimeFormatter)
    }.recoverCatching {
        LocalDateTime.parse(normalized).format(DisplayDateTimeFormatter)
    }.getOrElse {
        formatDisplayDate(raw)
    }
}

fun nextOrderStatuses(orderType: String, status: String): List<String> {
    val type = runCatching { SharedOrderType.valueOf(orderType.uppercase()) }.getOrDefault(SharedOrderType.RENT)
    val current = runCatching { SharedOrderStatus.valueOf(status.uppercase()) }
        .getOrDefault(SharedOrderStatus.RESERVED)
    return OrderStatusFlow.next(type, current).map { it.name }
}

fun orderStatusColor(status: String): Color = when (status.uppercase()) {
    "RESERVED" -> Color(0xFF2563EB)
    "PICKUPED" -> Color(0xFFD97706)
    "RETURNED", "COMPLETED" -> Color(0xFF16A34A)
    "CANCELLED" -> Color(0xFFDC2626)
    else -> Color(0xFF6B7280)
}
