package com.anyrent.pos.ui.deposit

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.deposit.DepositDueRule
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.theme.DS

/** Colours of the blue radio dot and the amber note (mockup m4, iOS `DepositUI`) */
internal val RadioBlue = Color(0xFF1D4ED8)
private val RadioGrey = Color(0xFF94A3B8)

/** A list row with a radio dot, a bold title and a grey description (settings mode rows, cart template list, methods) */
@Composable
internal fun DepositRadioRow(title: String, detail: String?, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) { role = Role.RadioButton; this.selected = selected }
            .clickable(onClick = onClick)
            .heightIn(min = 56.dp)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(24.dp).clip(CircleShape).background(Color.White)
                .border(BorderStroke(if (selected) 7.dp else 1.5.dp, if (selected) RadioBlue else RadioGrey), CircleShape),
        )
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontSize = DS.TextSize.Input, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, color = DS.Colors.Text)
            if (detail != null) Text(detail, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
    }
}

/** Amber note ("Nhân viên đang dùng app cũ ...") */
@Composable
internal fun DepositWarningBox(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier.fillMaxWidth()
            .background(Color(0xFFFFFBEB), RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFFFDE68A), RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) { Text(text, fontSize = DS.TextSize.Secondary, color = Color(0xFF334155)) }
}

/** A small status pill ("Đã thu", "Chờ thu", "Trễ 2 ngày") */
@Composable
internal fun DepositPill(text: String, colors: DS.Pill, modifier: Modifier = Modifier) {
    Text(
        text, fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = colors.text, maxLines = 1,
        modifier = modifier.background(colors.fill, RoundedCornerShape(10.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
internal fun DepositNote(text: String) {
    Text(text, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp))
}

@Composable
internal fun DepositDivider() = HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)

/** Full-screen page with a back arrow and a title (iOS: a pushed controller under the custom navigation bar) */
@Composable
internal fun DepositFullScreen(title: String, onBack: () -> Unit, bottomBar: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    AppFormSheet(onDismiss = onBack, fullScreen = true) {
        Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg))
                }
                Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            }
            HorizontalDivider(color = DS.Colors.Border)
            Box(Modifier.weight(1f).fillMaxWidth()) { content() }
            bottomBar?.invoke()
        }
    }
}

/** "Tiền mặt" / "Chuyển khoản" / "Séc" for an API payment method */
@Composable
internal fun depositMethodName(method: String): String = stringResource(
    when (method.uppercase()) {
        "TRANSFER" -> R.string.deposit_method_transfer
        "CHECK" -> R.string.deposit_method_check
        "MANUAL" -> R.string.deposit_method_manual
        else -> R.string.deposit_method_cash
    },
)

/** "Lúc đặt" / "Trước ngày lấy 4 ngày" / "Sau ngày đặt 3 ngày" */
@Composable
internal fun depositDueText(rule: DepositDueRule): String = when (rule.kind) {
    DepositDueRule.BEFORE_PICKUP -> stringResource(R.string.deposit_due_before_pickup, rule.days ?: 0)
    DepositDueRule.AFTER_CREATE -> stringResource(R.string.deposit_due_after_create, rule.days ?: 0)
    else -> stringResource(R.string.deposit_due_on_create)
}

/** Chip text and colours of a stage (iOS `InstallmentCardView.chip`) */
@Composable
internal fun installmentChip(stage: OrderInstallment, todayKey: String): Pair<String, DS.Pill> = when (stage.status) {
    "PAID" -> stringResource(R.string.deposit_status_paid) to DS.Status.Done
    "PARTIAL" -> stringResource(R.string.deposit_status_partial) to DS.Status.Waiting
    "VOID" -> stringResource(R.string.deposit_status_void) to DS.Status.Cancelled
    "OVERDUE" -> {
        val late = DepositPlanMath.lateDays(stage.dueDateKey, todayKey)
        (if (late > 0) stringResource(R.string.deposit_status_late, late) else stringResource(R.string.deposit_status_due)) to DS.Status.Late
    }
    "DUE_TODAY" -> stringResource(R.string.deposit_status_today) to DS.Status.Waiting
    else -> stringResource(R.string.deposit_status_pending) to DS.Status.HandOver
}

/** Shows the digits of a money input with dots ("1800000" as "1.800.000"); the typed text stays plain digits */
internal object MoneyGrouping : androidx.compose.ui.text.input.VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString): androidx.compose.ui.text.input.TransformedText {
        val raw = text.text
        // where each typed character lands once the dots are in
        val positions = IntArray(raw.length + 1)
        val shown = StringBuilder()
        raw.forEachIndexed { index, char ->
            if (index > 0 && (raw.length - index) % 3 == 0) shown.append('.')
            positions[index] = shown.length
            shown.append(char)
        }
        positions[raw.length] = shown.length
        val mapping = object : androidx.compose.ui.text.input.OffsetMapping {
            override fun originalToTransformed(offset: Int): Int = positions[offset.coerceIn(0, raw.length)]
            override fun transformedToOriginal(offset: Int): Int =
                shown.take(offset.coerceAtLeast(0)).count { it != '.' }.coerceIn(0, raw.length)
        }
        return androidx.compose.ui.text.input.TransformedText(androidx.compose.ui.text.AnnotatedString(shown.toString()), mapping)
    }
}
