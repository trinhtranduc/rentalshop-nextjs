package com.anyrent.pos.ui.orders

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentKind
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentPurpose
import com.anyrent.pos.ui.common.formatMoney

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentCollectionSheet(
    action: PaymentAction,
    selectedMethod: PaymentMethod,
    submitting: Boolean,
    error: String?,
    onMethodSelected: (PaymentMethod) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val title = when {
        action.kind == PaymentKind.REFUND -> stringResource(R.string.refund_payment)
        action.purpose == PaymentPurpose.PICKUP -> stringResource(R.string.collect_remaining_payment)
        action.purpose == PaymentPurpose.DEPOSIT -> stringResource(R.string.collect_deposit)
        else -> stringResource(R.string.collect_payment)
    }

    ModalBottomSheet(
        onDismissRequest = { if (!submitting) onDismiss() },
        sheetState = sheetState,
    ) {
        Column(
            Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                formatMoney(action.amount),
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                if (action.kind == PaymentKind.REFUND) {
                    stringResource(R.string.refund_payment_description)
                } else {
                    stringResource(R.string.collect_payment_description)
                },
            )
            action.collateralDetails?.takeIf { it.isNotBlank() }?.let {
                Text(stringResource(R.string.collateral), style = MaterialTheme.typography.titleMedium)
                Text(it)
            }
            Text(stringResource(R.string.payment_method), style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PaymentMethod.entries.forEach { method ->
                    FilterChip(
                        selected = selectedMethod == method,
                        onClick = { onMethodSelected(method) },
                        enabled = !submitting,
                        label = { Text(method.name) },
                    )
                }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = onConfirm,
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (submitting) stringResource(R.string.loading)
                    else stringResource(R.string.confirm)
                )
            }
            TextButton(
                onClick = onDismiss,
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.back))
            }
        }
    }
}
