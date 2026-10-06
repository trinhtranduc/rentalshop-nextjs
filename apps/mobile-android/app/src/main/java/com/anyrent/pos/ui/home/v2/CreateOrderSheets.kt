package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.CreateOrderSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS

private val SheetShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
private val OutlineGrey = Color(0xFFCBD5E1)

/** "Tạo đơn thuê?" / "Bán & thu tiền?" on the new cart (#476, board Gio-hang-xac-nhan); iOS `CreateOrderConfirmSheet` */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateOrderConfirmSheet(
    confirm: CreateOrderSheet.Confirm,
    busy: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    /** #518 (board GH-trung-bat): one sentence per double-booked line; non-empty = "Trùng lịch" + "Vẫn tạo đơn" */
    overlapLines: List<String> = emptyList(),
) {
    ModalBottomSheet(
        onDismissRequest = { if (!busy) onDismiss() },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { !busy }),
        shape = SheetShape,
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                stringResource(if (confirm.isSale) R.string.v2_create_confirm_sale_title else R.string.v2_create_confirm_rent_title),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                ConfirmRow(stringResource(R.string.v2_create_confirm_customer), confirm.customer)
                if (confirm.range != null && confirm.days != null) {
                    ConfirmRow(
                        stringResource(R.string.v2_create_confirm_dates),
                        confirm.range + " · " + pluralStringResource(R.plurals.v2_cart_days, confirm.days, confirm.days),
                    )
                }
                ConfirmRow(stringResource(R.string.v2_create_confirm_items), confirm.items)
                ConfirmRow(stringResource(R.string.v2_cart_total), formatMoneyVnd(confirm.total), bold = true)
            }
            if (overlapLines.isNotEmpty()) {
                OverlapNotice(
                    title = stringResource(R.string.v2_create_overlap_title),
                    text = overlapLines.joinToString("\n"),
                    background = Color(0xFFFFF7ED), borderColor = Color(0xFFFED7AA), tint = Color(0xFFC2410C), textColor = Color(0xFF9A3412),
                )
            }
            val navy = Color(0xFF1E3A8A)
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color(0xFFEFF6FF))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(if (confirm.isSale) R.string.v2_create_confirm_collect_sale else R.string.v2_create_confirm_collect_deposit),
                    fontSize = DS.TextSize.Body, color = navy, modifier = Modifier.weight(1f),
                )
                Text(formatMoneyVnd(confirm.collect), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = navy)
            }
            Row(Modifier.fillMaxWidth().padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SheetOutlineButton(stringResource(R.string.v2_review_cancel), Modifier.weight(1f), enabled = !busy, onClick = onDismiss)
                AppPrimaryButton(
                    stringResource(
                        when {
                            confirm.isSale -> R.string.v2_cart_sell_and_collect
                            overlapLines.isNotEmpty() -> R.string.v2_create_anyway
                            else -> R.string.v2_cart_create
                        },
                    ),
                    modifier = Modifier.weight(1.6f),
                    loading = busy,
                    onClick = onConfirm,
                )
            }
        }
    }
}

/**
 * #518 warning box of boards GH-trung-bat (orange, with [title]) and GH-trung-tat (red notice above "Tạo đơn"):
 * a warning triangle and the text, in the colours given.
 */
@Composable
internal fun OverlapNotice(
    text: String,
    background: Color,
    borderColor: Color,
    tint: Color,
    textColor: Color,
    modifier: Modifier = Modifier,
    title: String? = null,
) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .semantics { liveRegion = LiveRegionMode.Polite }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (title != null) Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = textColor)
            Text(text, fontSize = DS.TextSize.Secondary, color = textColor)
        }
    }
}

/** "Đã tạo đơn #0063" (#476, board Gio-hang-da-tao); iOS `OrderCreatedSheet` */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreatedSheet(
    created: CreateOrderSheet.Created,
    onDismiss: () -> Unit,
    onNewOrder: () -> Unit,
    onViewOrder: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = SheetShape,
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier.size(56.dp).clip(CircleShape).background(Color(0xFFD1FAE5)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = Color(0xFF047857), modifier = Modifier.size(28.dp))
            }
            Text(
                stringResource(R.string.v2_create_done_title, created.shortNumber),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, textAlign = TextAlign.Center,
            )
            val paid = stringResource(
                if (created.isSale) R.string.v2_create_done_paid_sale else R.string.v2_create_done_paid_deposit,
                formatMoneyVnd(created.paid),
            )
            Text(
                created.subtitle + "\n" + paid,
                fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, textAlign = TextAlign.Center, lineHeight = 22.sp,
            )
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SheetOutlineButton(stringResource(R.string.v2_create_done_new_order), Modifier.weight(1f), onClick = onNewOrder)
                AppPrimaryButton(stringResource(R.string.v2_create_done_view_order), modifier = Modifier.weight(1f), onClick = onViewOrder)
            }
        }
    }
}

@Composable
private fun ConfirmRow(title: String, value: String, bold: Boolean = false) {
    Row(Modifier.fillMaxWidth().heightIn(min = 30.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(title, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        Text(
            value,
            fontSize = DS.TextSize.Body, color = DS.Colors.Text, textAlign = TextAlign.End,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun SheetOutlineButton(text: String, modifier: Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(50.dp),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, OutlineGrey),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = DS.Colors.Text),
    ) { Text(text, fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold) }
}
