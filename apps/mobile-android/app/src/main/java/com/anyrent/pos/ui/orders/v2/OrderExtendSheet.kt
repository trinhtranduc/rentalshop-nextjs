package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.repository.DefaultAvailabilityRepository
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.domain.products.MoneyInput
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * "Gia hạn" (#390): pick a later return day, check the added days with the batch availability call at the order's
 * outlet, then `PUT /api/orders/{id}` with the new `returnPlanAt` and day count, plus the new total when the staff
 * typed extra rent (#425). Nothing is saved when an item is short.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderExtendSheet(detail: OrderDetail, onDismiss: () -> Unit, onExtended: (LocalDate) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val zone = remember { ZoneId.systemDefault() }
    val current = remember(detail) {
        RentalExtension.currentReturnDay(detail.summary.returnPlanAt, zone) ?: LocalDate.now(zone)
    }
    val first = RentalExtension.firstSelectableDay(current)
    val picker = rememberDatePickerState(
        initialSelectedDateMillis = first.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        initialDisplayedMonthMillis = first.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        selectableDates = remember(first) {
            object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean =
                    !Instant.ofEpochMilli(utcTimeMillis).atZone(ZoneOffset.UTC).toLocalDate().isBefore(first)

                override fun isSelectableYear(year: Int): Boolean = year >= first.year
            }
        },
    )
    val chosen = picker.selectedDateMillis?.let { Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate() }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var extraText by remember { mutableStateOf("") }
    val extra = MoneyInput.parse(extraText)
    val newTotal = RentalExtension.newTotal(detail.summary.totalAmount, extra)
    fun dayText(day: LocalDate) = formatDayShort(day.atStartOfDay(zone).toInstant(), zone)
    val window = chosen?.let { RentalExtension.window(current, it) }
    val unavailableTemplate = stringResource(R.string.extend_rental_unavailable)

    ModalBottomSheet(
        onDismissRequest = { if (!busy) onDismiss() },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = {
            Box(Modifier.padding(top = 8.dp).size(width = 40.dp, height = 5.dp).background(Color(0xFFCBD5E1), RoundedCornerShape(999.dp)))
        },
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.extend_rental_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            Text(stringResource(R.string.extend_rental_current, dayText(current)), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
            DatePicker(
                state = picker,
                title = null,
                headline = null,
                showModeToggle = false,
                colors = DatePickerDefaults.colors(containerColor = DS.Colors.Surface),
            )
            if (window != null && chosen != null) {
                val extra = RentalExtension.extraDays(current, chosen)
                Text(pluralStringResource(R.plurals.extend_rental_extra_days, extra, extra), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            }
            OutlinedTextField(
                value = extraText,
                onValueChange = { extraText = MoneyInput.display(MoneyInput.parse(it.filter(Char::isDigit).take(12))) },
                label = { Text(stringResource(R.string.extend_rental_extra_rent)) },
                placeholder = { Text("0") },
                singleLine = true,
                enabled = !busy,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
            newTotal?.let {
                Text(stringResource(R.string.extend_rental_new_total, formatMoneyVnd(it)), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            }
            error?.let { Text(it, fontSize = DS.TextSize.Body, color = DS.Status.Late.text) }
            AppPrimaryButton(
                text = chosen?.takeIf { window != null }?.let { stringResource(R.string.extend_rental_confirm, dayText(it)) }
                    ?: stringResource(R.string.extend_rental_pick),
                enabled = window != null && !busy,
                loading = busy,
                onClick = {
                    val day = chosen ?: return@AppPrimaryButton
                    val days = window ?: return@AppPrimaryButton
                    busy = true
                    error = null
                    scope.launch {
                        val outcome = runCatching {
                            // The order's own outlet; the session outlet when the detail has none
                            val repository = DefaultAvailabilityRepository(outletIdProvider = { detail.outletId ?: SessionStore.outletId })
                            val blocked = ValidateRentalCartAvailability(repository)(RentalExtension.lines(detail.items), days.first, days.second)
                            if (blocked.isNotEmpty()) {
                                unavailableTemplate.format(blocked.joinToString(", ") { it.productName })
                            } else {
                                withContext(Dispatchers.IO) {
                                    ApiParity.extendOrder(
                                        id = detail.summary.id,
                                        update = RentalExtension.update(detail.summary.pickupPlanAt, day, detail.summary.totalAmount, extra, zone),
                                    ).getOrThrow()
                                }
                                null
                            }
                        }
                        busy = false
                        outcome
                            .onSuccess { message -> if (message == null) onExtended(day) else error = message }
                            .onFailure {
                                val failure = AppError.from(it)
                                error = ApiErrorMessages.resolve(context, failure.code, failure.message.orEmpty())
                            }
                    }
                },
            )
        }
    }
}
