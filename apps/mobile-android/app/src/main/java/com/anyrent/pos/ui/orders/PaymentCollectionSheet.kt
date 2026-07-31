package com.anyrent.pos.ui.orders

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Row
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.ui.common.formatMoney
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentCollectionSheet(
    totalAmount: Double,
    alreadyPaid: Double,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, method: String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val remaining = (totalAmount - alreadyPaid).coerceAtLeast(0.0)
    var amountText by remember { mutableStateOf(if (remaining > 0) remaining.toString() else "") }
    var method by remember { mutableStateOf("CASH") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(stringResource(R.string.collect_payment), style = MaterialTheme.typography.titleLarge)
            Text("${stringResource(R.string.total)}: ${formatMoney(totalAmount)}")
            Text("${stringResource(R.string.deposit)}: ${formatMoney(alreadyPaid)}")
            Text("${stringResource(R.string.remaining)}: ${formatMoney(remaining)}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("CASH", "TRANSFER", "CARD").forEach { m ->
                    FilterChip(selected = method == m, onClick = { method = m }, label = { Text(m) })
                }
            }
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it },
                label = { Text(stringResource(R.string.payment_amount)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull() ?: return@Button
                    onConfirm(amount, method)
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.record_payment)) }
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.back))
            }
        }
    }
}
