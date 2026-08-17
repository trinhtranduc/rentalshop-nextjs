package com.anyrent.pos.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Shared calendar range sheet used by cart rental dates, export, and Overview custom range.
 * Material DateRangePicker lives here so screens do not recreate the layout or fall back
 * to the system DatePickerDialog.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppDateRangePickerSheet(
    title: String,
    subtitle: String,
    startLabel: String,
    endLabel: String,
    initialStart: LocalDate?,
    initialEnd: LocalDate?,
    onDismiss: () -> Unit,
    onConfirm: (LocalDate, LocalDate) -> Unit,
    minDate: LocalDate? = null,
    maxDate: LocalDate? = null,
) {
    val rangeState = rememberDateRangePickerState(
        initialSelectedStartDateMillis = initialStart?.toUtcMillis(),
        initialSelectedEndDateMillis = initialEnd?.toUtcMillis(),
        selectableDates = remember(minDate, maxDate) {
            BoundedSelectableDates(minDate, maxDate)
        },
    )
    val formatter = remember { DateTimeFormatter.ofPattern("dd/MM/yyyy") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                }
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
            ) {
                Row(
                    Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(
                            startLabel,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            rangeState.selectedStartDateMillis.toDisplayDate(formatter),
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(Modifier.weight(1f).padding(start = 16.dp)) {
                        Text(
                            endLabel,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            rangeState.selectedEndDateMillis.toDisplayDate(formatter),
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }

            DateRangePicker(
                state = rangeState,
                modifier = Modifier.fillMaxWidth().height(420.dp),
                title = null,
                headline = null,
                showModeToggle = false,
                colors = DatePickerDefaults.colors(
                    containerColor = Color.White,
                    selectedDayContainerColor = MaterialTheme.colorScheme.primary,
                    todayDateBorderColor = MaterialTheme.colorScheme.primary,
                    dayInSelectionRangeContainerColor =
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                    dayInSelectionRangeContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f).height(52.dp),
                ) {
                    Text(stringResource(R.string.cancel))
                }
                Button(
                    enabled = rangeState.selectedStartDateMillis != null &&
                        rangeState.selectedEndDateMillis != null,
                    modifier = Modifier.weight(2f).height(52.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                    ),
                    onClick = {
                        val startUtc = rangeState.selectedStartDateMillis ?: return@Button
                        val endUtc = rangeState.selectedEndDateMillis ?: return@Button
                        onConfirm(startUtc.toLocalDateUtc(), endUtc.toLocalDateUtc())
                    },
                ) {
                    Text(stringResource(R.string.confirm), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private fun LocalDate.toUtcMillis(): Long =
    atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

private fun Long.toLocalDateUtc(): LocalDate =
    Instant.ofEpochMilli(this).atZone(ZoneOffset.UTC).toLocalDate()

private fun Long?.toDisplayDate(formatter: DateTimeFormatter): String =
    this?.toLocalDateUtc()?.format(formatter) ?: "—"

@OptIn(ExperimentalMaterial3Api::class)
private class BoundedSelectableDates(
    private val minDate: LocalDate?,
    private val maxDate: LocalDate?,
) : SelectableDates {
    override fun isSelectableDate(utcTimeMillis: Long): Boolean {
        val date = utcTimeMillis.toLocalDateUtc()
        if (minDate != null && date.isBefore(minDate)) return false
        if (maxDate != null && date.isAfter(maxDate)) return false
        return true
    }

    override fun isSelectableYear(year: Int): Boolean {
        if (minDate != null && year < minDate.year) return false
        if (maxDate != null && year > maxDate.year) return false
        return true
    }
}
