package com.anyrent.pos.ui.orders.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiClient.PageResult
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.dayKey
import com.anyrent.pos.ui.common.formatDayShort
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

enum class OrdersSegment { TODAY, RENT, SALE }

/** What the counter does with a "Việc cần làm" row */
enum class WorkKind { HAND_OVER, TAKE_BACK }

sealed interface OrdersRow {
    val orderId: Int
    val key: String

    data class Work(val row: TodayWorkRow, val kind: WorkKind) : OrdersRow {
        override val orderId get() = row.id
        override val key get() = "work-$kind-${row.id}"
    }

    data class Order(val order: OrderSummary, val lateDays: Int) : OrdersRow {
        override val orderId get() = order.id
        override val key get() = "order-${order.id}"
    }
}

enum class SectionKind { LATE, TODAY, TOMORROW, DAY, PLAIN }

data class OrdersSection(val kind: SectionKind, val rows: List<OrdersRow>, val dayLabel: String? = null) {
    val key: String get() = dayLabel?.let { "$kind-$it" } ?: kind.name
}

/** Rent list filter (sheet) */
data class RentOrdersFilter(val status: String? = null, val sortByPickup: Boolean = true) {
    val isDefault get() = status == null && sortByPickup
    val sortBy get() = if (sortByPickup) "pickupPlanAt" else "createdAt"
}

data class OrdersHomeState(
    val segment: OrdersSegment = OrdersSegment.TODAY,
    val todayAvailable: Boolean = true,
    val filter: RentOrdersFilter = RentOrdersFilter(),
    val query: String = "",
    val sections: List<OrdersSection> = emptyList(),
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
    val hasMore: Boolean = false,
) {
    val isSearching get() = OrdersHomeLogic.isSearch(query)
}

/** Pure helpers (unit tested) */
object OrdersHomeLogic {
    const val MIN_SEARCH_LENGTH = 2

    fun isSearch(query: String) = query.trim().length >= MIN_SEARCH_LENGTH

    /**
     * Days past the planned hand-over (RENT still RESERVED) or return (still PICKUPED), in civil days of [zone].
     * A note ("Trễ N ngày"), never a status. 0 when not late.
     */
    fun lateDays(
        orderType: String,
        status: String,
        pickupPlanAt: Instant?,
        returnPlanAt: Instant?,
        now: Instant = Instant.now(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): Int {
        if (!orderType.equals("RENT", ignoreCase = true)) return 0
        val planned = when (status.uppercase()) {
            "RESERVED" -> pickupPlanAt
            "PICKUPED", "PICKED_UP" -> returnPlanAt
            else -> null
        } ?: return 0
        val days = ChronoUnit.DAYS.between(planned.atZone(zone).toLocalDate(), now.atZone(zone).toLocalDate())
        return days.coerceAtLeast(0).toInt()
    }

    /** TRỄ HẠN (most late first), HÔM NAY, NGÀY MAI; empty groups and a missing NGÀY MAI are left out */
    fun todaySections(work: TodayWork): List<OrdersSection> {
        fun List<TodayWorkRow>.asWork(kind: WorkKind) = map { OrdersRow.Work(it, kind) }
        val late = (work.noShows.asWork(WorkKind.HAND_OVER) + work.overdueReturns.asWork(WorkKind.TAKE_BACK))
            .sortedByDescending { it.row.lateDays }
        val today = work.pickupsToday.asWork(WorkKind.HAND_OVER) + work.returnsToday.asWork(WorkKind.TAKE_BACK)
        val tomorrow = work.tomorrowPickups.orEmpty().asWork(WorkKind.HAND_OVER) +
            work.tomorrowReturns.orEmpty().asWork(WorkKind.TAKE_BACK)
        return listOf(
            OrdersSection(SectionKind.LATE, late),
            OrdersSection(SectionKind.TODAY, today),
            OrdersSection(SectionKind.TOMORROW, tomorrow),
        ).filter { it.rows.isNotEmpty() }
    }

    /** Sale orders under civil-day headers of [zone], keeping the API order (newest first) */
    fun saleSections(rows: List<OrdersRow.Order>, zone: ZoneId = ZoneId.systemDefault()): List<OrdersSection> =
        rows.groupBy { row -> parseInstant(row.order.createdAt)?.let { dayKey(it, zone) } ?: "" }
            .map { (_, group) ->
                val day = parseInstant(group.first().order.createdAt)
                OrdersSection(SectionKind.DAY, group, dayLabel = day?.let { formatDayShort(it, zone) } ?: "—")
            }

    fun parseInstant(value: String?): Instant? =
        value?.takeIf { it.isNotBlank() }?.let { runCatching { Instant.parse(it) }.getOrNull() }
}

/** One page of `GET /api/orders`; replaceable in tests */
fun interface OrdersPageLoader {
    suspend fun load(q: String?, orderType: String?, status: String?, sortBy: String, page: Int): Result<PageResult<OrderSummary>>
}

val LiveOrdersPageLoader = OrdersPageLoader { q, orderType, status, sortBy, page ->
    withContext(Dispatchers.IO) {
        ApiClient.get().searchOrders(
            page = page,
            limit = OrdersHomeViewModel.PAGE_SIZE,
            q = q,
            status = status,
            orderType = orderType,
            sortBy = sortBy,
            sortOrder = "desc",
        )
    }
}

/**
 * Redesigned orders tab (#371): "Việc cần làm", rent orders, sale orders and one search across rent and sale.
 * Every reload cancels the previous request, so a slow answer never overwrites the current list.
 */
class OrdersHomeViewModel(
    private val todayWork: TodayWorkRepository,
    private val orders: OrdersPageLoader = LiveOrdersPageLoader,
    private val now: () -> Instant = Instant::now,
    private val zone: () -> ZoneId = ZoneId::systemDefault,
    private val searchDelayMs: Long = 300,
) : ViewModel() {
    private val _state = MutableStateFlow(OrdersHomeState())
    val state: StateFlow<OrdersHomeState> = _state.asStateFlow()

    private var loadJob: Job? = null
    private var searchJob: Job? = null
    private var page = 1
    private var loaded: List<OrderSummary> = emptyList()

    /** The tab became visible: first load, or a quiet refresh after coming back from a detail */
    fun onShown() {
        if (loadJob == null) reload() else reload(keepRows = true)
    }

    fun select(segment: OrdersSegment) {
        if (segment == _state.value.segment) return
        _state.update { it.copy(segment = segment) }
        reload()
    }

    fun applyFilter(filter: RentOrdersFilter) {
        _state.update { it.copy(filter = filter) }
        if (_state.value.segment == OrdersSegment.RENT && !_state.value.isSearching) reload()
    }

    /** Search as you type; waits [searchDelayMs] after the last change */
    fun onQueryChange(text: String) {
        val wasSearching = _state.value.isSearching
        _state.update { it.copy(query = text) }
        searchJob?.cancel()
        if (OrdersHomeLogic.isSearch(text)) {
            loadJob?.cancel() // drop any answer for the previous text right away
            searchJob = viewModelScope.launch {
                delay(searchDelayMs)
                reload()
            }
        } else if (wasSearching) {
            reload() // back to the segment
        }
    }

    /** Pull to refresh, coming back from a detail, or retry */
    fun reload(fromPull: Boolean = false, keepRows: Boolean = fromPull) {
        loadJob?.cancel()
        page = 1
        loaded = emptyList()
        _state.update {
            it.copy(
                sections = if (keepRows) it.sections else emptyList(),
                loading = !keepRows,
                refreshing = fromPull,
                error = null,
                hasMore = false,
            )
        }
        val current = _state.value
        loadJob = viewModelScope.launch {
            if (!current.isSearching && current.segment == OrdersSegment.TODAY) {
                loadToday()
            } else {
                loadPage(1)
            }
        }
    }

    fun loadMore() {
        val current = _state.value
        if (!current.hasMore || current.loading || loadJob?.isActive == true) return
        loadJob = viewModelScope.launch { loadPage(page + 1) }
    }

    private suspend fun loadToday() {
        todayWork.load()
            .onSuccess { work ->
                _state.update {
                    it.copy(sections = OrdersHomeLogic.todaySections(work), loading = false, refreshing = false)
                }
            }
            .onFailure { error ->
                if (error is CancellationException) throw error
                if (error is AppError.Http && error.statusCode == 403) {
                    // No dashboard permission: the tab works without "Việc cần làm"
                    _state.update { it.copy(todayAvailable = false, segment = OrdersSegment.RENT) }
                    loadPage(1)
                    return
                }
                _state.update { it.copy(loading = false, refreshing = false, error = error.message.orEmpty()) }
            }
    }

    private suspend fun loadPage(pageToLoad: Int) {
        val current = _state.value
        val searching = current.isSearching
        val orderType = when {
            searching -> null
            current.segment == OrdersSegment.SALE -> "SALE"
            else -> "RENT"
        }
        val rentList = !searching && current.segment != OrdersSegment.SALE
        orders.load(
            q = if (searching) current.query.trim() else null,
            orderType = orderType,
            status = if (rentList) current.filter.status else null,
            sortBy = if (rentList) current.filter.sortBy else "createdAt",
            page = pageToLoad,
        ).onSuccess { result ->
            val known = loaded.map { it.id }.toSet()
            loaded = if (pageToLoad == 1) result.items else loaded + result.items.filter { it.id !in known }
            page = pageToLoad
            _state.update {
                it.copy(
                    sections = buildSections(searching, current.segment),
                    loading = false,
                    refreshing = false,
                    hasMore = result.hasMore,
                )
            }
        }.onFailure { error ->
            if (error is CancellationException) throw error
            _state.update {
                if (pageToLoad == 1) {
                    it.copy(loading = false, refreshing = false, error = error.message.orEmpty())
                } else {
                    it.copy(hasMore = false)
                }
            }
        }
    }

    private fun buildSections(searching: Boolean, segment: OrdersSegment): List<OrdersSection> {
        val today = now()
        val zoneId = zone()
        val rows = loaded.map { order ->
            OrdersRow.Order(
                order,
                OrdersHomeLogic.lateDays(
                    order.orderType,
                    order.status,
                    OrdersHomeLogic.parseInstant(order.pickupPlanAt),
                    OrdersHomeLogic.parseInstant(order.returnPlanAt),
                    today,
                    zoneId,
                ),
            )
        }
        if (rows.isEmpty()) return emptyList()
        return if (!searching && segment == OrdersSegment.SALE) {
            OrdersHomeLogic.saleSections(rows, zoneId)
        } else {
            listOf(OrdersSection(SectionKind.PLAIN, rows))
        }
    }

    class Factory(private val todayWork: TodayWorkRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = OrdersHomeViewModel(todayWork) as T
    }

    companion object {
        const val PAGE_SIZE = 20
    }
}
