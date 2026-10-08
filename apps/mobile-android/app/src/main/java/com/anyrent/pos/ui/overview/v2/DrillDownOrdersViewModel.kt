package com.anyrent.pos.ui.overview.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.RefreshPolicy
import com.anyrent.pos.domain.RefreshTracker
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant

/** [orders] null until the first answer; [error] shows only while there is no list */
data class DrillDownOrdersState(
    val orders: List<OrderSummary>? = null,
    val error: String? = null,
    val refreshing: Boolean = false,
)

/**
 * "Đang cho thuê" (#484) and "Chưa lấy đồ" (#496) lists. #674: the list outlives a trip to an order detail, and
 * coming back reloads it (quietly, rows kept) only when an order changed or it is 5 minutes old.
 */
class DrillDownOrdersViewModel(
    private val loader: suspend () -> Result<List<OrderSummary>>,
    private val now: () -> Instant = Instant::now,
    changes: () -> Long = { OrdersChanged.version.value },
) : ViewModel() {
    private val _state = MutableStateFlow(DrillDownOrdersState())
    val state: StateFlow<DrillDownOrdersState> = _state.asStateFlow()
    private val freshness = RefreshTracker(changes)
    private var job: Job? = null

    /** First show, back from a detail, or an orders-changed signal while shown */
    fun onShown() {
        if (job?.isActive == true) return
        if (freshness.shouldReload(now(), RefreshPolicy.LIST_TTL)) load()
    }

    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        load()
    }

    private fun load() {
        job?.cancel()
        val version = freshness.begin()
        job = viewModelScope.launch {
            val result = loader()
            if (result.exceptionOrNull() is CancellationException) return@launch
            result.onSuccess { orders ->
                freshness.loaded(version, now())
                _state.update { it.copy(orders = orders, error = null, refreshing = false) }
            }.onFailure { failure ->
                _state.update { it.copy(error = failure.message ?: "", refreshing = false) }
            }
        }
    }

    class Factory(private val loader: suspend () -> Result<List<OrderSummary>>) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = DrillDownOrdersViewModel(loader) as T
    }
}
