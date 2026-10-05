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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS

/** Hand-over sheet (board Giao-do): what to collect now by the API rule, then PICKUPED */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun HandOverSheet(
    detail: OrderDetail,
    busy: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (papers: String, securityDeposit: Double) -> Unit,
) {
    val s = detail.summary
    // Optional papers and security deposit, prefilled from the order (#427)
    var papers by remember { mutableStateOf(detail.collateralDetails.orEmpty()) }
    var depositText by remember { mutableStateOf(detail.securityDeposit.toLong().takeIf { it > 0 }?.toString().orEmpty()) }
    val securityDeposit = depositText.toDoubleOrNull() ?: 0.0
    val money = OrderDetailLogic.handOver(s.totalAmount, s.depositAmount, securityDeposit, detail.balancePayments())
    val working = busy
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
        OutlinedTextField(
            value = papers,
            onValueChange = { papers = it.take(200) },
            label = { Text(stringResource(R.string.detail_hand_over_papers)) },
            placeholder = { Text(stringResource(R.string.detail_hand_over_papers_hint)) },
            singleLine = true,
            // Same id as iOS `accessibilityIdentifier` so one Maestro flow taps it on both apps (#448)
            modifier = Modifier.fillMaxWidth().testTag("handOver.papers"),
        )
        FeeField(
            stringResource(R.string.detail_hand_over_deposit), depositText, { depositText = it },
            Modifier.fillMaxWidth().testTag("handOver.securityDeposit"),
        )
        MoneyBox {
            MoneyRow(stringResource(R.string.total), formatMoneyVnd(money.total))
            if (money.deposit > 0) MoneyRow(stringResource(R.string.detail_deposit_paid), formatMoneyVnd(-money.deposit))
            if (money.collateralMoney > 0) MoneyRow(stringResource(R.string.detail_collateral_money), "+" + formatMoneyVnd(money.collateralMoney))
            if (money.paidBefore > 0) MoneyRow(stringResource(R.string.detail_paid_before), formatMoneyVnd(-money.paidBefore))
            MoneyRow(stringResource(R.string.detail_collect_now), formatMoneyVnd(money.collectNow), total = true)
        }
        // No payment method: like iOS, hand-over records no payment; the API works the balance out (#448)
        SheetButtons(
            confirm = if (money.collectNow > 0) {
                stringResource(R.string.detail_handed_over_collect, formatMoneyVnd(money.collectNow))
            } else {
                stringResource(R.string.detail_handed_over)
            },
            enabled = !working,
            onDismiss = onDismiss,
            onConfirm = { onConfirm(papers, securityDeposit) },
        )
    }
}

/** Return sheet (board Nhan-tra): late and damage fees, what to give back or collect, then RETURNED */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ReturnSheet(
    detail: OrderDetail,
    busy: Boolean,
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
    val working = busy
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
                if (lateDays > 0) pluralStringResource(R.plurals.detail_late_fee_days, lateDays, lateDays) else stringResource(R.string.detail_late_fee),
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
            Text("${stringResource(R.string.collateral)}: $it", fontSize = DS.TextSize.Body, color = DS.Colors.Text)
        }
        // No payment method: like iOS, the return records no payment (#448)
        error?.let { Text(it, color = DS.Status.Late.text, fontSize = DS.TextSize.Secondary) }
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
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalComposeUiApi::class)
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
                // A sheet is its own window: expose test tags as resource ids here too (#448)
                .semantics { testTagsAsResourceId = true }
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
    Column(verticalArrangement = Arrangement.spacedBy(DS.Gap.LineTight)) {
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        Text(subtitle, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
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
                Text(item.productName ?: "—", fontSize = DS.TextSize.Body, modifier = Modifier.weight(1f))
                Text("× ${item.quantity}", fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
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
