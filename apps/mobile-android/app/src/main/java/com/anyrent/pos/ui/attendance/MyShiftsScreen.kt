package com.anyrent.pos.ui.attendance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.AttendanceApi
import com.anyrent.pos.data.MyShifts
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.MyShiftDay
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * "Ca và công của tôi" (#910, mockup screen 7): this week's shifts with the worked times, then the month's total
 * hours and days worked. Also opened by a `SHIFT_CHANGED` notification.
 */
@Composable
fun MyShiftsScreen(onBack: () -> Unit) {
    var data by remember { mutableStateOf<MyShifts?>(null) }
    var failed by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(attempt) {
        failed = false
        withContext(Dispatchers.IO) { AttendanceApi.myShifts() }
            .onSuccess { data = it }
            .onFailure { failed = data == null }
    }

    SettingsDetailPage(title = stringResource(R.string.attendance_my_shifts), onBack = onBack) {
        val current = data
        when {
            current != null -> Column(
                Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SectionLabel(stringResource(R.string.attendance_week))
                Column {
                    if (current.week.isEmpty()) {
                        Text(stringResource(R.string.attendance_week_empty), fontSize = DS.TextSize.Secondary, color = AttendanceColors.Faint,
                            modifier = Modifier.padding(vertical = 11.dp))
                    }
                    current.week.forEach { WeekRow(it) }
                }
                SectionLabel(stringResource(R.string.attendance_month_title, AttendanceLogic.monthText(current.month)))
                Column {
                    TotalRow(
                        stringResource(R.string.attendance_total_hours),
                        current.summary.hours?.let { stringResource(R.string.attendance_hours_value, AttendanceLogic.oneDecimal(it)) } ?: "—",
                    )
                    TotalRow(stringResource(R.string.attendance_days_worked), current.summary.days?.toString() ?: "—")
                }
            }
            failed -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.attendance_load_failed), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
                TextButton(onClick = { attempt++ }) { Text(stringResource(R.string.retry)) }
            }
            else -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = AttendanceColors.Faint, letterSpacing = 0.5.sp)
}

/** "T2 12/10" + "Sáng 08–12" ……… "07:58–12:01 · 4,0 g" (amber "· muộn 7′" when late, "—" not worked) */
@Composable
private fun WeekRow(day: MyShiftDay) {
    Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(Modifier.weight(1f)) {
            Text(AttendanceLogic.dayShort(day.date), fontSize = DS.TextSize.Secondary, color = DS.Colors.Text)
            if (day.shifts.isNotEmpty()) {
                Text(day.shifts.joinToString(", ") { AttendanceLogic.shortShift(it) }, fontSize = DS.TextSize.Pill, color = AttendanceColors.Faint)
            }
        }
        val right = when {
            day.pairs.isEmpty() -> "—"
            day.lateMinutes > 0 -> "${AttendanceLogic.pairTimes(day.pairs)} · ${stringResource(R.string.attendance_late, day.lateMinutes)}"
            day.pairs.any { it.outAt != null } ->
                "${AttendanceLogic.pairTimes(day.pairs)} · ${stringResource(R.string.attendance_hours_short, AttendanceLogic.oneDecimal(AttendanceLogic.pairHours(day.pairs)))}"
            else -> AttendanceLogic.pairTimes(day.pairs)
        }
        Text(right, fontSize = DS.TextSize.Secondary, color = if (day.lateMinutes > 0) AttendanceColors.Late else DS.Colors.Text)
    }
    HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
}

@Composable
private fun TotalRow(title: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontSize = DS.TextSize.Secondary, color = DS.Colors.Text, modifier = Modifier.weight(1f))
        Text(value, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
    }
    HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
}
