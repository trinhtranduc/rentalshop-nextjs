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
import androidx.compose.ui.unit.dp
import com.anyrent.shared.model.OrderStatusFlow
import com.anyrent.shared.model.SharedOrderStatus
import com.anyrent.shared.model.SharedOrderType
import java.text.NumberFormat
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

fun formatMoney(amount: Double): String =
    NumberFormat.getNumberInstance(Locale("vi", "VN")).format(amount)

fun nextOrderStatuses(orderType: String, status: String): List<String> {
    val type = runCatching { SharedOrderType.valueOf(orderType.uppercase()) }.getOrDefault(SharedOrderType.RENT)
    val current = runCatching { SharedOrderStatus.valueOf(status.uppercase()) }
        .getOrDefault(SharedOrderStatus.RESERVED)
    return OrderStatusFlow.next(type, current).map { it.name }
}
