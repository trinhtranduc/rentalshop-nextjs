package com.anyrent.pos.ui.orders.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiClient.PageResult
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.RefreshPolicy
import com.anyrent.pos.domain.RefreshTracker
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.dayKey
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.navigation.OrdersChanged
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

/** [day]: the civil day of a sale-day band (VL-ban) */
data class OrdersSection(
    val kind: SectionKind,
    val rows: List<OrdersRow>,
    val dayLabel: String? = null,
    val day: Instant? = null,
) {
    val key: String get() = dayLabel?.let { "$kind-$it" } ?: kind.name
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
    /** Orders matching the current list or search (API `total`); null for "Việc cần làm" */
    val total: Int? = null,
    /** Red badge of "Việc cần làm", kept while another list shows */
    val todayBadge: Int = 0,
) {
    val isSearching get() = OrdersHomeLogic.isSearch(query)
}

/** Pure helpers (unit tested) */
object OrdersHomeLogic {
    const val MIN_SEARCH_LENGTH = 2

    fun isSearch(query: String) = query.trim().length >= MIN_SEARCH_LENGTH

    /**
     * Days past the planned hand-over (RENT still RESERVED) or return (still PICKUPED), in shop civil days (#602, same rule as `RentedOutLogic.isLate`).
     * A note ("Trễ N ngày"), never a status. 0 when not late.
     */
    fun lateDays(
        orderType: String,
        status: String,
        pickupPlanAt: Instant?,
        returnPlanAt: Instant?,
        now: Instant = Instant.now(),
        zone: ZoneId = ShopTime.zone,
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

    /** Order rows with their late days, in the API order (Orders tab lists and overview drill-down lists, #458) */
    fun orderRows(
        orders: List<OrderSummary>,
        now: Instant = Instant.now(),
        zone: ZoneId = ShopTime.zone,
    ): List<OrdersRow.Order> = orders.map { order ->
        OrdersRow.Order(
            order,
            lateDays(order.orderType, order.status, parseInstant(order.pickupPlanAt), parseInstant(order.returnPlanAt), now, zone),
        )
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
    fun saleSections(rows: List<OrdersRow.Order>, zone: ZoneId = ShopTime.zone): List<OrdersSection> =
        rows.groupBy { row -> parseInstant(row.order.createdAt)?.let { dayKey(it, zone) } ?: "" }
            .map { (_, group) ->
                val day = parseInstant(group.first().order.createdAt)
                OrdersSection(SectionKind.DAY, group, dayLabel = day?.let { formatDayShort(it, zone) } ?: "—", day = day)
            }

    fun parseInstant(value: String?): Instant? =
        value?.takeIf { it.isNotBlank() }?.let { runCatching { Instant.parse(it) }.getOrNull() }
}

/** One page of `GET /api/orders`; replaceable in tests */
fun interface OrdersPageLoader {
    suspend fun load(query: OrdersQuery): Result<PageResult<OrderSummary>>
}

val LiveOrdersPageLoader = OrdersPageLoader { query ->
    withContext(Dispatchers.IO) {
        ApiClient.get().searchOrders(
            page = query.page,
            limit = query.limit,
            q = query.q,
            status = query.status,
            orderType = query.orderType,
            startDate = query.startDate,
            endDate = query.endDate,
            sortBy = query.sortBy,
            sortOrder = "desc",
            dateField = query.dateField,
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
    private val zone: () -> ZoneId = { ShopTime.zone },
    private val searchDelayMs: Long = 300,
    /** App-wide "orders changed" version (#674); replaceable in tests */
    private val changes: () -> Long = { OrdersChanged.version.value },
) : ViewModel() {
    private val _state = MutableStateFlow(OrdersHomeState())
    val state: StateFlow<OrdersHomeState> = _state.asStateFlow()

    private var loadJob: Job? = null
    private var searchJob: Job? = null
    private var page = 1
    private var loaded: List<OrderSummary> = emptyList()

    /** What each segment showed last (#674): a segment switch shows it at once, then refreshes only when needed */
    private data class Snapshot(
        val sections: List<OrdersSection>,
        val loaded: List<OrderSummary>,
        val page: Int,
        val hasMore: Boolean,
        val total: Int?,
        val filter: RentOrdersFilter,
    )
    private val snapshots = mutableMapOf<OrdersSegment, Snapshot>()

    /** Dirty flag and last load time of each list: a segment, or the search (#674) */
    private val trackers = mutableMapOf<String, RefreshTracker>()
    private fun tracker(key: String) = trackers.getOrPut(key) { RefreshTracker(changes) }
    private fun currentKey(state: OrdersHomeState = _state.value) =
        if (state.isSearching) "search" else "segment-${state.segment}"

    /** The current list changed on the server since it was loaded */
    val isDirty: Boolean get() = tracker(currentKey()).isDirty

    /** Dirty, never loaded, or older than 5 minutes */
    val needsRefresh: Boolean get() = tracker(currentKey()).shouldReload(now(), RefreshPolicy.LIST_TTL)

    /** The tab became visible: first load, or (#674) a quiet refresh only when the list is dirty or stale */
    fun onShown() {
        if (loadJob == null) reload() else refreshIfNeeded()
    }

    /** Back from a detail, tab again, or an orders-changed signal while on screen: rows and scroll stay */
    fun refreshIfNeeded() {
        if (loadJob?.isActive == true) return
        val current = _state.value
        when {
            current.error != null -> reload()
            needsRefresh -> reload(keepRows = true)
        }
    }

    fun select(segment: OrdersSegment) {
        if (segment == _state.value.segment) return
        _state.update { it.copy(segment = segment) }
        showSegment()
    }

    /**
     * The segment's last result at once when there is one, then a quiet refresh if it is dirty or stale;
     * otherwise a load with the spinner (#674)
     */
    private fun showSegment() {
        val current = _state.value
        val snapshot = snapshots[current.segment]
            ?.takeIf { !current.isSearching && (current.segment != OrdersSegment.RENT || it.filter == current.filter) }
        if (snapshot == null) {
            reload()
            return
        }
        loadJob?.cancel()
        loaded = snapshot.loaded
        page = snapshot.page
        _state.update {
            it.copy(
                sections = snapshot.sections,
                loading = false,
                refreshing = false,
                error = null,
                hasMore = snapshot.hasMore,
                total = snapshot.total,
            )
        }
        if (needsRefresh) reload(keepRows = true)
    }

    fun applyFilter(filter: RentOrdersFilter) {
        if (filter == _state.value.filter) return
        _state.update { it.copy(filter = filter) }
        if (_state.value.segment == OrdersSegment.RENT && !_state.value.isSearching) reload()
    }

    /** Status chip of "Tất cả đơn" */
    fun selectStatus(status: String?) = applyFilter(_state.value.filter.copy(status = status))

    /** "Xem N đơn" of the filter sheet: the size of the rent list with [filter] (the caller cancels older requests) */
    suspend fun count(filter: RentOrdersFilter): Int? =
        orders.load(OrdersBoardLogic.rentQuery(filter, now = now(), zone = zone())).getOrNull()?.total

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
            showSegment() // back to the segment
        }
    }

    /**
     * Retry, filter or search change, first load: rows cleared and the spinner shows. [keepRows] (pull to refresh,
     * back from a detail, #674): the rows and scroll stay, every loaded page is asked again in one request, and a
     * failure of a non-pull refresh keeps the rows.
     */
    fun reload(fromPull: Boolean = false, keepRows: Boolean = fromPull) {
        loadJob?.cancel()
        val pages = if (keepRows) page.coerceIn(1, MAX_QUIET_PAGES) else 1
        page = 1
        loaded = emptyList()
        _state.update {
            it.copy(
                sections = if (keepRows) it.sections else emptyList(),
                loading = !keepRows,
                refreshing = fromPull,
                error = null,
                hasMore = false,
                total = if (keepRows) it.total else null,
            )
        }
        val current = _state.value
        val key = currentKey(current)
        val version = tracker(key).begin()
        val quiet = keepRows && !fromPull
        loadJob = viewModelScope.launch {
            if (!current.isSearching && current.segment == OrdersSegment.TODAY) {
                loadToday(key, version, quiet)
            } else {
                loadPage(1, pages = pages, key = key, version = version, quiet = quiet)
            }
        }
    }

    fun loadMore() {
        val current = _state.value
        if (!current.hasMore || current.loading || loadJob?.isActive == true) return
        loadJob = viewModelScope.launch { loadPage(page + 1) }
    }

    private suspend fun loadToday(key: String, version: Long, quiet: Boolean) {
        todayWork.load()
            .onSuccess { work ->
                val sections = OrdersHomeLogic.todaySections(work)
                _state.update {
                    it.copy(
                        sections = sections,
                        loading = false,
                        refreshing = false,
                        todayBadge = OrdersBoardLogic.badgeCount(sections),
                    )
                }
                markLoaded(key, version)
            }
            .onFailure { error ->
                if (error is CancellationException) throw error
                if (error is AppError.Http && error.statusCode == 403) {
                    // No dashboard permission: the tab works without "Việc cần làm"
                    _state.update { it.copy(todayAvailable = false, segment = OrdersSegment.RENT) }
                    val rentKey = currentKey()
                    loadPage(1, key = rentKey, version = tracker(rentKey).begin())
                    return
                }
                if (quiet) {
                    _state.update { it.copy(refreshing = false) } // keep the rows; the next show tries again
                    return
                }
                _state.update { it.copy(loading = false, refreshing = false, error = error.message.orEmpty()) }
            }
    }

    /** [pages] > 1 (quiet refresh): page 1 with room for every page already loaded, so the list keeps its length */
    private suspend fun loadPage(
        pageToLoad: Int,
        pages: Int = 1,
        key: String? = null,
        version: Long? = null,
        quiet: Boolean = false,
    ) {
        val current = _state.value
        val searching = current.isSearching
        val query = when {
            searching -> OrdersQuery(q = current.query.trim(), page = pageToLoad)
            current.segment == OrdersSegment.SALE -> OrdersQuery(orderType = "SALE", page = pageToLoad)
            else -> OrdersBoardLogic.rentQuery(current.filter, pageToLoad, now(), zone())
        }.copy(limit = PAGE_SIZE * pages)
        orders.load(query).onSuccess { result ->
            val known = loaded.map { it.id }.toSet()
            loaded = if (pageToLoad == 1) result.items else loaded + result.items.filter { it.id !in known }
            page = if (pageToLoad == 1) pages else pageToLoad
            _state.update {
                it.copy(
                    sections = buildSections(searching, current.segment),
                    loading = false,
                    refreshing = false,
                    hasMore = result.hasMore,
                    total = result.total,
                )
            }
            if (key != null && version != null) markLoaded(key, version) else saveSnapshot()
        }.onFailure { error ->
            if (error is CancellationException) throw error
            if (pageToLoad == 1 && quiet) {
                _state.update { it.copy(refreshing = false) } // keep the rows; the next show tries again
                return
            }
            _state.update {
                if (pageToLoad == 1) {
                    it.copy(loading = false, refreshing = false, error = error.message.orEmpty())
                } else {
                    it.copy(hasMore = false)
                }
            }
        }
    }

    private fun markLoaded(key: String, version: Long) {
        tracker(key).loaded(version, now())
        saveSnapshot()
    }

    private fun saveSnapshot() {
        val current = _state.value
        if (current.isSearching || current.loading || current.error != null) return
        snapshots[current.segment] = Snapshot(current.sections, loaded, page, current.hasMore, current.total, current.filter)
    }

    private fun buildSections(searching: Boolean, segment: OrdersSegment): List<OrdersSection> {
        val today = now()
        val zoneId = zone()
        val rows = OrdersHomeLogic.orderRows(loaded, today, zoneId)
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

        /** A quiet refresh reloads at most this many pages in one request (API `limit` ≤ 100) */
        const val MAX_QUIET_PAGES = 5
    }
}
