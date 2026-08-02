package com.anyrent.pos.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentKind
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentPurpose
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatMoney

/**
 * iOS `PaymentCollectionViewController` parity — shows how much to collect/refund
 * and which collateral documents to collect or return before pickup/return confirm.
 */
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
    val isRefund = action.kind == PaymentKind.REFUND
    val title = when {
        isRefund -> stringResource(R.string.refund_payment)
        action.purpose == PaymentPurpose.PICKUP -> stringResource(R.string.collect_remaining_payment)
        action.purpose == PaymentPurpose.DEPOSIT -> stringResource(R.string.collect_deposit)
        else -> stringResource(R.string.collect_payment)
    }
    val amountDescription = when {
        isRefund -> stringResource(R.string.refund_payment_description)
        action.purpose == PaymentPurpose.PICKUP -> stringResource(R.string.collect_remaining_payment_description)
        action.purpose == PaymentPurpose.DEPOSIT -> stringResource(R.string.collect_deposit_description)
        else -> stringResource(R.string.collect_payment_description)
    }
    val collateralTitle = when {
        action.purpose == PaymentPurpose.RETURN_ADJUSTMENT ->
            stringResource(R.string.return_collateral_documents)
        else -> stringResource(R.string.collect_collateral_documents)
    }
    val primary = MaterialTheme.colorScheme.primary
    val orange = Color(0xFFE67E22)

    ModalBottomSheet(
        onDismissRequest = { if (!submitting) onDismiss() },
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(
            Modifier
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Column(
                Modifier
                    .fillMaxWidth()
                    .border(2.dp, primary.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .background(primary.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    formatMoney(action.amount),
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 40.sp,
                    ),
                    color = primary,
                    textAlign = TextAlign.Center,
                )
                Text(
                    amountDescription,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }

            action.collateralDetails?.takeIf { it.isNotBlank() }?.let { details ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .border(2.dp, orange.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                        .background(orange.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        collateralTitle,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        details,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            if (action.amount > 0.0) {
                Text(
                    stringResource(R.string.payment_method),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                    modifier = Modifier.fillMaxWidth(),
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
            }

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.fillMaxWidth())
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TextButton(
                    onClick = onDismiss,
                    enabled = !submitting,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.cancel))
                }
                AppPrimaryButton(
                    text = if (submitting) stringResource(R.string.loading)
                    else stringResource(R.string.confirm),
                    onClick = onConfirm,
                    enabled = !submitting,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
