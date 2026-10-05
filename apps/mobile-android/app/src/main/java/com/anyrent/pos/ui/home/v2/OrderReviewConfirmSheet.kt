package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.OrderReviewV2
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS

/**
 * "Thu tiền cọc" / "Thu tiền" sheet before the new cart creates the order (#448), like iOS
 * `PaymentCollectionViewController` for a new order: amount, papers to keep, "Hủy" / "Xác nhận".
 * It only confirms; no payment is recorded and the create request is unchanged.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderReviewConfirmSheet(
    confirm: OrderReviewV2.Confirm,
    collateral: String?,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val deposit = confirm.kind == OrderReviewV2.ConfirmKind.DEPOSIT
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                stringResource(if (deposit) R.string.v2_review_collect_deposit else R.string.v2_review_collect_payment),
                fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted,
            )
            Text(formatMoneyVnd(confirm.amount), fontSize = 34.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            Text(
                stringResource(if (deposit) R.string.v2_review_collect_deposit_text else R.string.v2_review_collect_payment_text),
                fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, textAlign = TextAlign.Center,
            )
            collateral?.let {
                Text(stringResource(R.string.v2_review_collect_papers), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                Text(it, fontSize = DS.TextSize.Body, color = DS.Colors.Text, textAlign = TextAlign.Center)
            }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) { Text(stringResource(R.string.v2_review_cancel), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold) }
                AppPrimaryButton(stringResource(R.string.v2_review_confirm), modifier = Modifier.weight(1f), onClick = onConfirm)
            }
        }
    }
}
