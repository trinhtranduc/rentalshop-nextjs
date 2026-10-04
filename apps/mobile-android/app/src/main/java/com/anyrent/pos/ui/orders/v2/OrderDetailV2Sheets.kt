package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.payment.PaymentQrDialog
import com.anyrent.pos.ui.payment.PaymentUiState
import com.anyrent.pos.ui.theme.DS
import java.io.File

/** Hand-over sheet (board Giao-do): what to collect now by the API rule, then PICKUPED */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun HandOverSheet(
    detail: OrderDetail,
    payment: PaymentUiState,
    busy: Boolean,
    onMethod: (PaymentMethod) -> Unit,
    onShowQr: () -> Unit,
    onClearQr: () -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val s = detail.summary
    val money = OrderDetailLogic.handOver(s.totalAmount, s.depositAmount, detail.securityDeposit, detail.balancePayments())
    val working = busy || payment.submitting
    SheetFrame(onDismiss = { if (!working) onDismiss() }) {
        SheetTitle(
            stringResource(R.string.detail_hand_over),
            stringResource(
                R.string.detail_hand_over_subtitle,
                s.customerName.orEmpty(),
                "#${s.orderNumber}",
                "${shortDay(s.pickupPlanAt)} → ${shortDay(s.returnPlanAt)}",
            ),
        )
        SheetItems(detail)
        MoneyBox {
            MoneyRow(stringResource(R.string.total), formatMoneyVnd(money.total))
            if (money.deposit > 0) MoneyRow(stringResource(R.string.detail_deposit_paid), formatMoneyVnd(-money.deposit))
            if (money.collateralMoney > 0) MoneyRow(stringResource(R.string.detail_collateral_money), "+" + formatMoneyVnd(money.collateralMoney))
            if (money.paidBefore > 0) MoneyRow(stringResource(R.string.detail_paid_before), formatMoneyVnd(-money.paidBefore))
            MoneyRow(stringResource(R.string.detail_collect_now), formatMoneyVnd(money.collectNow), total = true)
        }
        detail.collateralDetails?.takeIf { it.isNotBlank() }?.let {
            Text("${stringResource(R.string.collateral)}: $it", fontSize = 14.sp, color = DS.Colors.Text)
        }
        if (money.collectNow > 0) MethodPicker(payment, working, onMethod, onShowQr)
        payment.error?.let { Text(it, color = DS.Status.Late.text, fontSize = 13.sp) }
        SheetButtons(
            confirm = if (money.collectNow > 0) {
                stringResource(R.string.detail_handed_over_collect, formatMoneyVnd(money.collectNow))
            } else {
                stringResource(R.string.detail_handed_over)
            },
            enabled = !working,
            onDismiss = onDismiss,
            onConfirm = onConfirm,
        )
    }
    payment.qr?.let { PaymentQrDialog(qr = it, onDismiss = onClearQr) }
}

/** Return sheet (board Nhan-tra): late and damage fees, what to give back or collect, then RETURNED */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ReturnSheet(
    detail: OrderDetail,
    payment: PaymentUiState,
    busy: Boolean,
    onMethod: (PaymentMethod) -> Unit,
    onShowQr: () -> Unit,
    onClearQr: () -> Unit,
    onDismiss: () -> Unit,
    onConfirm: (lateFee: Double, damageFee: Double, onError: (String) -> Unit) -> Unit,
) {
    val s = detail.summary
    var lateText by remember { mutableStateOf(detail.lateFee.toLong().takeIf { it > 0 }?.toString().orEmpty()) }
    var damageText by remember { mutableStateOf(detail.damageFee.toLong().takeIf { it > 0 }?.toString().orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    val late = lateText.toDoubleOrNull() ?: 0.0
    val damage = damageText.toDoubleOrNull() ?: 0.0
    val money = OrderDetailLogic.returnMoney(late, damage, detail.securityDeposit, detail.balancePayments())
    val lateDays = OrdersHomeLogic.lateDays(
        s.orderType, s.status, OrdersHomeLogic.parseInstant(s.pickupPlanAt), OrdersHomeLogic.parseInstant(s.returnPlanAt),
    )
    val working = busy || payment.submitting
    SheetFrame(onDismiss = { if (!working) onDismiss() }) {
        SheetTitle(
            stringResource(R.string.detail_take_return),
            if (lateDays > 0) {
                pluralStringResource(R.plurals.detail_return_late_subtitle, lateDays, s.customerName.orEmpty(), "#${s.orderNumber}", lateDays)
            } else {
                stringResource(
                    R.string.detail_hand_over_subtitle,
                    s.customerName.orEmpty(),
                    "#${s.orderNumber}",
                    "${shortDay(s.pickupPlanAt)} → ${shortDay(s.returnPlanAt)}",
                )
            },
        )
        SheetItems(detail)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FeeField(
                if (lateDays > 0) stringResource(R.string.detail_late_fee_days, lateDays) else stringResource(R.string.detail_late_fee),
                lateText,
                { lateText = it },
                Modifier.weight(1f),
            )
            FeeField(stringResource(R.string.damage_fee), damageText, { damageText = it }, Modifier.weight(1f))
        }
        MoneyBox {
            MoneyRow(stringResource(R.string.detail_fees), formatMoneyVnd(money.fees))
            if (money.collateralMoney > 0) MoneyRow(stringResource(R.string.detail_collateral_held), formatMoneyVnd(-money.collateralMoney))
            if (money.settledBefore > 0) MoneyRow(stringResource(R.string.detail_settled_before), formatMoneyVnd(-money.settledBefore))
            if (money.refund > 0) {
                MoneyRow(stringResource(R.string.detail_give_back), formatMoneyVnd(money.refund), total = true, valueColor = DS.Status.Done.text)
            } else {
                MoneyRow(stringResource(R.string.detail_collect_more), formatMoneyVnd(money.collect), total = true)
            }
        }
        detail.collateralDetails?.takeIf { it.isNotBlank() }?.let {
            Text("${stringResource(R.string.collateral)}: $it", fontSize = 14.sp, color = DS.Colors.Text)
        }
        if (money.net != 0.0) MethodPicker(payment, working, onMethod, onShowQr)
        (error ?: payment.error)?.let { Text(it, color = DS.Status.Late.text, fontSize = 13.sp) }
        SheetButtons(
            confirm = when {
                money.refund > 0 -> stringResource(R.string.detail_received_refund, formatMoneyVnd(money.refund))
                money.collect > 0 -> stringResource(R.string.detail_received_collect, formatMoneyVnd(money.collect))
                else -> stringResource(R.string.detail_received)
            },
            enabled = !working,
            onDismiss = onDismiss,
            onConfirm = {
                error = null
                onConfirm(late, damage) { error = it }
            },
        )
    }
    payment.qr?.let { PaymentQrDialog(qr = it, onDismiss = onClearQr) }
}

/** Notes with up to [OrderDetailLogic.MAX_NOTE_PHOTOS] photos (board CT-sua, GHI CHÚ) */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotesSheet(
    text: String,
    onTextChange: (String) -> Unit,
    kept: List<String>,
    files: List<File>,
    busy: Boolean,
    error: String?,
    onRemoveKept: (String) -> Unit,
    onRemoveFile: (File) -> Unit,
    onAdd: () -> Unit,
    onPreview: (Any) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
) {
    val count = kept.size + files.size
    val max = OrderDetailLogic.MAX_NOTE_PHOTOS
    SheetFrame(onDismiss = onDismiss) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.notes), fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text(stringResource(R.string.detail_photos_count, count, max), fontSize = 13.sp, color = DS.Colors.TextMuted)
        }
        OutlinedTextField(
            value = text,
            onValueChange = onTextChange,
            placeholder = { Text(stringResource(R.string.add_notes_hint)) },
            minLines = 4,
            modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            kept.forEach { url -> RemovableThumb(url, { onPreview(url) }) { onRemoveKept(url) } }
            files.forEach { file -> RemovableThumb(file, { onPreview(file) }) { onRemoveFile(file) } }
            if (count < max) {
                IconButton(
                    onClick = onAdd,
                    modifier = Modifier.size(56.dp).background(DS.Colors.Divider, RoundedCornerShape(10.dp)),
                ) {
                    Icon(Icons.Outlined.PhotoCamera, contentDescription = stringResource(R.string.add_photos), tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Md))
                }
            }
        }
        error?.let { Text(it, color = DS.Status.Late.text, fontSize = 13.sp) }
        SheetButtons(confirm = stringResource(R.string.save_notes), enabled = !busy, onDismiss = onDismiss, onConfirm = onSave)
    }
}

@Composable
private fun RemovableThumb(model: Any, onOpen: () -> Unit, onRemove: () -> Unit) {
    Box {
        Thumb(model, 56.dp, onOpen)
        IconButton(
            onClick = onRemove,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(24.dp)
                .background(Color.White.copy(alpha = 0.85f), RoundedCornerShape(12.dp)),
        ) {
            Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.delete), modifier = Modifier.size(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SheetFrame(onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            content = content,
        )
    }
}

@Composable
private fun SheetTitle(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        Text(subtitle, fontSize = 14.sp, color = DS.Colors.TextMuted)
    }
}

@Composable
private fun SheetItems(detail: OrderDetail) {
    Column {
        detail.items.forEach { item ->
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Thumb(item.imageUrl, 40.dp)
                Text(item.productName ?: "—", fontSize = 15.sp, modifier = Modifier.weight(1f))
                Text("× ${item.quantity}", fontSize = 14.sp, color = DS.Colors.TextMuted)
            }
        }
    }
}

@Composable
private fun MoneyBox(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(Color(0xFFF8FAFC), RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 6.dp),
        content = content,
    )
}

@Composable
private fun MethodPicker(
    payment: PaymentUiState,
    working: Boolean,
    onMethod: (PaymentMethod) -> Unit,
    onShowQr: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(stringResource(R.string.payment_method), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AppFilterChip(
                label = stringResource(R.string.payment_method_cash),
                selected = payment.selectedMethod == PaymentMethod.CASH,
                onClick = { if (!working) onMethod(PaymentMethod.CASH) },
                modifier = Modifier.weight(1f),
            )
            AppFilterChip(
                label = stringResource(R.string.payment_method_transfer),
                selected = payment.selectedMethod == PaymentMethod.TRANSFER,
                onClick = { if (!working) onMethod(PaymentMethod.TRANSFER) },
                modifier = Modifier.weight(1f),
            )
        }
        if (payment.selectedMethod == PaymentMethod.TRANSFER) {
            OutlinedButton(onClick = onShowQr, enabled = !working && !payment.loadingQr, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.QrCode2, contentDescription = null, modifier = Modifier.size(DS.Icon.Sm))
                Text(
                    if (payment.loadingQr) stringResource(R.string.loading) else stringResource(R.string.show_payment_qr),
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun FeeField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { onChange(it.filter(Char::isDigit).take(12)) },
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier,
    )
}

@Composable
private fun SheetButtons(confirm: String, enabled: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        SecondaryBarButton(stringResource(R.string.cancel), Modifier.weight(1f), true, onClick = onDismiss)
        PrimaryBarButton(confirm, Modifier.weight(2f), enabled, onConfirm)
    }
}
