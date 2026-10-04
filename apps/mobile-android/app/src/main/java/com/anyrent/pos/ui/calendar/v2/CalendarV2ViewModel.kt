package com.anyrent.pos.ui.calendar.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.calendar.CalendarDayOrder
import com.anyrent.pos.domain.calendar.CalendarDayRow
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.calendar.CalendarMonthCounts
import com.anyrent.pos.ui.common.deviceTimeZoneId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URLEncoder
import java.time.LocalDate
import java.time.YearMonth

data class CalendarV2State(
    val month: YearMonth,
    val selectedKey: String,
    val counts: CalendarMonthCounts? = null,
    val rows: List<CalendarDayRow> = emptyList(),
    val dayLoading: Boolean = true,
    val dayError: String? = null,
    val refreshing: Boolean = false,
)

/** Redesigned calendar (#374): month marks and the hand-overs and returns of the selected day */
class CalendarV2ViewModel(
    private val fetch: (String) -> org.json.JSONObject = { ApiClient.get().authedGet(it) },
    private val today: () -> LocalDate = { LocalDate.now() },
) : ViewModel() {
    private val _state = MutableStateFlow(
        today().let { CalendarV2State(YearMonth.from(it), it.toString()) },
    )
    val state: StateFlow<CalendarV2State> = _state.asStateFlow()
    private var monthJob: Job? = null
    private var dayJob: Job? = null

    val todayKey: String get() = today().toString()

    init {
        loadMonth()
        loadDay()
    }

    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        loadMonth()
        loadDay()
    }

    fun select(key: String) {
        if (key == _state.value.selectedKey) return
        _state.update { it.copy(selectedKey = key) }
        loadDay()
    }

    fun moveMonth(delta: Long) {
        val month = _state.value.month.plusMonths(delta)
        _state.update { it.copy(month = month, selectedKey = CalendarLogic.defaultSelection(month, todayKey), counts = null) }
        loadMonth()
        loadDay()
    }

    private fun zone() = URLEncoder.encode(deviceTimeZoneId(), "UTF-8")

    private fun loadMonth() {
        monthJob?.cancel()
        val month = _state.value.month
        monthJob = viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val json = fetch("/api/calendar/orders/count?month=${month.monthValue}&year=${month.year}&timeZone=${zone()}")
                    CalendarLogic.countsFromJson(json.optJSONObject("data") ?: org.json.JSONObject())
                }
            }
            if (result.exceptionOrNull() is CancellationException || _state.value.month != month) return@launch
            _state.update { it.copy(counts = result.getOrNull() ?: it.counts, refreshing = false) }
        }
    }

    private fun loadDay() {
        dayJob?.cancel()
        val key = _state.value.selectedKey
        _state.update { it.copy(dayLoading = true, dayError = null, rows = emptyList()) }
        dayJob = viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    coroutineScope {
                        val base = "/api/calendar/orders/by-date?date=$key&timeZone=${zone()}&limit=200"
                        val pickups = async { orders(fetch("$base&status=RESERVED")) }
                        val returns = async { orders(fetch("$base&kind=return")) }
                        CalendarLogic.rows(key, todayKey, pickups.await(), returns.await())
                    }
                }
            }
            if (result.exceptionOrNull() is CancellationException || _state.value.selectedKey != key) return@launch
            result.onSuccess { rows ->
                _state.update { it.copy(rows = rows, dayLoading = false, refreshing = false) }
            }.onFailure { error ->
                _state.update { it.copy(dayLoading = false, dayError = error.message ?: "", refreshing = false) }
            }
        }
    }

    fun retryDay() = loadDay()

    private fun orders(json: org.json.JSONObject): List<CalendarDayOrder> =
        CalendarLogic.dayOrdersFromJson(json.optJSONObject("data") ?: org.json.JSONObject())

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = CalendarV2ViewModel() as T
    }
}
