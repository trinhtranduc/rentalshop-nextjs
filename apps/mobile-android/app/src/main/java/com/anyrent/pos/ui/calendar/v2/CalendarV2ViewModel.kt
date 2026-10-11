package com.anyrent.pos.ui.calendar.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.RefreshPolicy
import com.anyrent.pos.domain.RefreshTracker
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.calendar.CalendarDayOrder
import com.anyrent.pos.domain.calendar.CalendarDayRow
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.calendar.CalendarMonthCounts
import com.anyrent.pos.ui.navigation.OrdersChanged
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
import java.time.Instant
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
    private val today: () -> LocalDate = { ShopTime.today() },
    private val now: () -> Instant = Instant::now,
    /** App-wide "orders changed" version (#674); replaceable in tests */
    changes: () -> Long = { OrdersChanged.version.value },
) : ViewModel() {
    private val _state = MutableStateFlow(
        today().let { CalendarV2State(YearMonth.from(it), it.toString()) },
    )
    val state: StateFlow<CalendarV2State> = _state.asStateFlow()
    private var monthJob: Job? = null
    private var dayJob: Job? = null
    private var loadedKey: String? = null
    /** #674: the day list reloads on show only when an order changed or it is 5 minutes old */
    private val freshness = RefreshTracker(changes)

    val todayKey: String get() = today().toString()

    /** Called each time the tab is shown (first show, back from an order) and on an orders-changed signal while shown */
    fun onShown() {
        if (dayJob?.isActive == true) return
        if (!freshness.shouldReload(now(), RefreshPolicy.LIST_TTL)) return
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

    private fun loadMonth() {
        monthJob?.cancel()
        val month = _state.value.month
        monthJob = viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val json = fetch(CalendarLogic.monthCountPath(month))
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
        // Same day again (back from an order): keep the rows on screen while they reload
        val sameDay = key == loadedKey && _state.value.dayError == null
        _state.update { it.copy(dayLoading = !sameDay, dayError = null, rows = if (sameDay) it.rows else emptyList()) }
        val version = freshness.begin()
        dayJob = viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    coroutineScope {
                        val base = CalendarLogic.dayPath(key)
                        val pickups = async { orders(fetch("$base&status=RESERVED")) }
                        val returns = async { orders(fetch("$base&kind=return")) }
                        CalendarLogic.rows(key, todayKey, pickups.await(), returns.await())
                    }
                }
            }
            if (result.exceptionOrNull() is CancellationException || _state.value.selectedKey != key) return@launch
            result.onSuccess { rows ->
                loadedKey = key
                freshness.loaded(version, now())
                _state.update { it.copy(rows = rows, dayLoading = false, refreshing = false) }
            }.onFailure { error ->
                if (sameDay) {
                    // Quiet refresh of the rows on screen (#674): keep them; the next show tries again
                    _state.update { it.copy(dayLoading = false, refreshing = false) }
                } else {
                    _state.update { it.copy(dayLoading = false, dayError = error.message ?: "", refreshing = false) }
                }
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
