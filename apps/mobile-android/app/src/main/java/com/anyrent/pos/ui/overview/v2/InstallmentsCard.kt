package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.domain.deposit.InstallmentReminderRow
import com.anyrent.pos.domain.deposit.InstallmentReminders
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.deposit.DepositPill
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.theme.DS

/**
 * "Cần thu hôm nay" and "Sắp đến hạn" (#1199, iOS `installmentsCard`): deposit stages due today or late, and due
 * tomorrow. Only a reminder for staff; the card shows on today's range, like the "Hôm nay" counters.
 */
@Composable
internal fun InstallmentsCard(reminders: InstallmentReminders, onOpenOrder: (Int) -> Unit) {
    OVCard(Modifier.testTag("overview.installments")) {
        Section(R.string.overview_installments_today, reminders.due, tomorrow = false, onOpenOrder)
        Section(R.string.overview_installments_soon, reminders.tomorrow, tomorrow = true, onOpenOrder)
        Text(stringResource(R.string.overview_installments_note), fontSize = DS.TextSize.Pill, color = OV.Muted)
    }
}

@Composable
private fun Section(titleRes: Int, rows: List<InstallmentReminderRow>, tomorrow: Boolean, onOpenOrder: (Int) -> Unit) {
    if (rows.isEmpty()) return
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            stringResource(titleRes), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink,
            modifier = Modifier.weight(1f).semantics { heading() },
        )
        Text(stringResource(R.string.overview_installments_count, rows.size), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Blue)
    }
    rows.forEach { row -> RowItem(row, tomorrow, onOpenOrder) }
}

@Composable
private fun RowItem(row: InstallmentReminderRow, tomorrow: Boolean, onOpenOrder: (Int) -> Unit) {
    val short = OrdersBoardLogic.shortNumber(row.orderNumber)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp)
            .clickable(role = Role.Button) { onOpenOrder(row.orderId) }.padding(vertical = 6.dp)
            .testTag("overview.installments.row.${row.orderId}"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(row.customerName?.takeIf { it.isNotBlank() } ?: "#$short", fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink)
            Text(stringResource(R.string.overview_installments_row, row.label, short), fontSize = DS.TextSize.Pill, color = OV.Muted)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(formatMoneyVnd(row.remaining), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OV.Ink)
            if (row.lateDays > 0) DepositPill(stringResource(R.string.deposit_status_late, row.lateDays), DS.Status.Late)
            else if (tomorrow) DepositPill(stringResource(R.string.deposit_status_tomorrow), DS.Status.HandOver)
        }
    }
}
