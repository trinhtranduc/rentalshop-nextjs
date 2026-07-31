package com.anyrent.pos.ui.orders

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.nextOrderStatuses
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.Modifier

@Composable
fun OrderActionPanel(
    detail: OrderDetail,
    onReload: () -> Unit,
    onDeleted: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf<String?>(null) }
    var ready by remember(detail) { mutableStateOf(detail.summary.isReadyToDeliver) }
    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.change_status), style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            nextOrderStatuses(detail.summary.orderType, detail.summary.status).forEach { next ->
                AssistChip(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                com.anyrent.pos.data.ApiClient.get().updateOrderStatus(detail.summary.id, next)
                            }
                            onReload()
                        }
                    },
                    label = { Text(next) },
                )
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(stringResource(R.string.ready_to_deliver))
            Switch(
                checked = ready,
                onCheckedChange = { value ->
                    ready = value
                    scope.launch {
                        withContext(Dispatchers.IO) {
                            ApiParity.setReadyToDeliver(detail.summary.id, value)
                        }
                        onReload()
                    }
                },
            )
        }

        detail.summary.customerPhone?.let { phone ->
            Button(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.call_customer)) }
        }

        Button(
            onClick = {
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiParity.fetchOrderQrPayload(detail.summary.id)
                    }
                    result.onSuccess { message = it }
                        .onFailure { message = it.message }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.payment_qr)) }

        Button(
            onClick = {
                val config = ThermalPrinter.Config(
                    ip = prefs.getString("printerIp", "") ?: "",
                    port = prefs.getString("printerPort", "9100")?.toIntOrNull() ?: 9100,
                    paperWidthMm = prefs.getString("paperWidth", "80")?.toIntOrNull() ?: 80,
                    name = prefs.getString("printerName", "") ?: "",
                )
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ThermalPrinter.printOrder(config, detail)
                    }
                    message = when (result) {
                        is ThermalPrinter.Result.Success -> "Printed"
                        is ThermalPrinter.Result.Failure -> result.message
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.print_receipt)) }

        if (detail.payments.isNotEmpty()) {
            Text("Payments", style = MaterialTheme.typography.titleMedium)
            detail.payments.forEach { p ->
                Text("${p.paymentMethod ?: "PAY"} · ${formatMoney(p.amount)} · ${p.status ?: ""}")
            }
        }

        Button(
            onClick = {
                scope.launch {
                    withContext(Dispatchers.IO) { ApiParity.deleteOrder(detail.summary.id) }
                    onDeleted()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.delete_order)) }

        message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
    }
}
