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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.domain.payment.PaymentPolicy
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.nextOrderStatuses
import com.anyrent.pos.ui.payment.PaymentQrDialog
import com.anyrent.pos.ui.payment.PaymentViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * iOS [OrderViewModel.availableActions] cancel rules:
 * - SALE + COMPLETED + canManageOrders
 * - RENT + RESERVED + canManageOrders
 * Cancel is never a primary footer button — only under ⋯.
 */
fun canCancelOrder(orderType: String, status: String): Boolean {
    if (!PermissionManager.canManageOrders()) return false
    val type = orderType.uppercase()
    val st = status.uppercase()
    return (type == "SALE" && st == "COMPLETED") || (type == "RENT" && st == "RESERVED")
}

/** iOS: delete only for CANCELLED + merchant/outlet admin (or system admin). */
fun canDeleteCancelledOrder(status: String): Boolean =
    status.equals("CANCELLED", ignoreCase = true) && PermissionManager.canDeleteCancelledOrders()

@Composable
fun OrderActionPanel(
    detail: OrderDetail,
    onReload: () -> Unit,
    onDeleted: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf<String?>(null) }
    var showPayment by remember { mutableStateOf(false) }
    var pendingStatus by remember { mutableStateOf<String?>(null) }
    var editPickup by remember { mutableStateOf(detail.summary.pickupPlanAt?.take(10).orEmpty()) }
    var editReturn by remember { mutableStateOf(detail.summary.returnPlanAt?.take(10).orEmpty()) }
    var ready by remember(detail) { mutableStateOf(detail.summary.isReadyToDeliver) }
    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    val app = context.applicationContext as AnyRentApp
    val paymentFactory = remember {
        PaymentViewModel.Factory(app.container.paymentRepository)
    }
    val paymentViewModel: PaymentViewModel = viewModel(
        key = "payment-${detail.summary.id}",
        factory = paymentFactory,
    )
    val paymentState by paymentViewModel.state.collectAsState()

    LaunchedEffect(detail) {
        paymentViewModel.setOrder(detail)
    }

    Column(
        Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(stringResource(R.string.change_status), style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            nextOrderStatuses(detail.summary.orderType, detail.summary.status).forEach { next ->
                AssistChip(
                    onClick = {
                        paymentViewModel.clearError()
                        paymentViewModel.setOrder(detail)
                        val needsSheet = next == "PICKUPED" || next == "RETURNED" ||
                            (next == "COMPLETED" && PaymentPolicy.actionFor(detail)?.amount?.let { it > 0 } == true)
                        if (needsSheet && PaymentPolicy.actionFor(detail) != null) {
                            pendingStatus = next
                            showPayment = true
                        } else {
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    com.anyrent.pos.data.ApiClient.get()
                                        .updateOrderStatus(detail.summary.id, next)
                                }
                                onReload()
                            }
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

        androidx.compose.material3.OutlinedTextField(
            value = editPickup,
            onValueChange = { editPickup = it },
            label = { Text(stringResource(R.string.pickup_date)) },
            modifier = Modifier.fillMaxWidth(),
        )
        androidx.compose.material3.OutlinedTextField(
            value = editReturn,
            onValueChange = { editReturn = it },
            label = { Text(stringResource(R.string.return_date)) },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = {
                scope.launch {
                    withContext(Dispatchers.IO) {
                        ApiParity.updateOrderFull(
                            id = detail.summary.id,
                            notes = detail.summary.notes,
                            depositAmount = null,
                            pickupPlanAt = editPickup.takeIf { it.length >= 10 }?.let { "${it}T00:00:00Z" },
                            returnPlanAt = editReturn.takeIf { it.length >= 10 }?.let { "${it}T23:59:00Z" },
                        )
                    }
                    onReload()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.edit_order)) }

        paymentState.action?.let {
            Button(
                onClick = {
                    paymentViewModel.clearError()
                    showPayment = true
                },
                enabled = !paymentState.submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (it.kind.name == "REFUND") stringResource(R.string.refund_payment)
                    else stringResource(R.string.collect_payment)
                )
            }
        }

        if (showPayment && paymentState.action != null) {
            PaymentCollectionSheet(
                action = paymentState.action!!,
                selectedMethod = paymentState.selectedMethod,
                submitting = paymentState.submitting,
                error = paymentState.error,
                onMethodSelected = paymentViewModel::selectMethod,
                onDismiss = {
                    showPayment = false
                    pendingStatus = null
                    paymentViewModel.clearQr()
                },
                onConfirm = {
                    val next = pendingStatus
                    paymentViewModel.submit {
                        if (next == null) {
                            showPayment = false
                            onReload()
                            return@submit
                        }
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                com.anyrent.pos.data.ApiClient.get()
                                    .updateOrderStatus(detail.summary.id, next)
                            }
                            showPayment = false
                            pendingStatus = null
                            onReload()
                        }
                    }
                },
                qr = paymentState.qr,
                loadingQr = paymentState.loadingQr,
                onShowQr = paymentViewModel::loadQr,
                onClearQr = paymentViewModel::clearQr,
            )
        }

        Button(
            onClick = {
                paymentViewModel.loadQr()
            },
            enabled = !paymentState.loadingQr,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                if (paymentState.loadingQr) stringResource(R.string.loading)
                else stringResource(R.string.payment_qr)
            )
        }

        paymentState.qr?.let { qr ->
            PaymentQrDialog(qr = qr, onDismiss = paymentViewModel::clearQr)
        }

        Button(
            onClick = {
                val config = ThermalPrinter.configFromPrefs(prefs)
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

        (message ?: paymentState.error)?.let {
            Text(
                it,
                color = if (paymentState.error != null) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.primary
                },
            )
        }
    }
}
