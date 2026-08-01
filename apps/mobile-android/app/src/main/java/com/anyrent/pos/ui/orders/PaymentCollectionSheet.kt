package com.anyrent.pos.ui.orders

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentKind
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentPurpose
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppPrimaryButton
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
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(
            Modifier.padding(horizontal = 20.dp, vertical = 8.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                formatMoney(action.amount),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                if (action.kind == PaymentKind.REFUND) {
                    stringResource(R.string.refund_payment_description)
                } else {
                    stringResource(R.string.collect_payment_description)
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            action.collateralDetails?.takeIf { it.isNotBlank() }?.let {
                Text(stringResource(R.string.collateral), style = MaterialTheme.typography.titleMedium)
                Text(it, style = MaterialTheme.typography.bodyLarge)
            }
            Text(
                stringResource(R.string.payment_method),
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                ),
            )
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PaymentMethod.entries.forEach { method ->
                    AppFilterChip(
                        label = method.name,
                        selected = selectedMethod == method,
                        onClick = { if (!submitting) onMethodSelected(method) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            AppPrimaryButton(
                text = if (submitting) stringResource(R.string.loading)
                else stringResource(R.string.confirm),
                onClick = onConfirm,
                enabled = !submitting,
            )
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
