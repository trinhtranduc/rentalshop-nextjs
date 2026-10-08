package com.anyrent.pos.ui.overview.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.RefreshPolicy
import com.anyrent.pos.domain.RefreshTracker
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewNow
import com.anyrent.pos.domain.overview.OverviewPeriod
import com.anyrent.pos.domain.overview.OverviewPreset
import com.anyrent.pos.domain.overview.OverviewReport
import com.anyrent.pos.ui.navigation.OrdersChanged
import java.time.Instant
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
import org.json.JSONObject
import java.time.LocalDate

data class OverviewV2State(
    val period: OverviewPeriod = OverviewPeriod.Preset(OverviewPreset.LAST_7),
    val showsRevenue: Boolean = false,
    val showsOperations: Boolean = false,
    val report: OverviewReport? = null,
    val now: OverviewNow? = null,
    val loading: Boolean = true,
    val reportError: String? = null,
    val refreshing: Boolean = false,
)

/** Redesigned overview (#374): one period of `analytics/period` plus the "now" figures of outlet-operations */
class OverviewV2ViewModel(
    private val fetch: (String) -> JSONObject = { ApiClient.get().authedGet(it) },
    private val today: () -> LocalDate = { ShopTime.today() },
    role: String? = SessionStore.role,
    private val clock: () -> Instant = Instant::now,
    /** App-wide "orders changed" version (#674); replaceable in tests */
    changes: () -> Long = { OrdersChanged.version.value },
) : ViewModel() {
    private val _state = MutableStateFlow(
        OverviewV2State(showsRevenue = OverviewLogic.showsRevenue(role), showsOperations = OverviewLogic.showsOperations(role)),
    )
    val state: StateFlow<OverviewV2State> = _state.asStateFlow()
    private var job: Job? = null
    /** #674: re-show reloads (quietly) only when an order changed or the figures are 10 minutes old */
    private val freshness = RefreshTracker(changes)

    fun today(): LocalDate = today.invoke()

    init {
        load()
    }

    fun select(period: OverviewPeriod) {
        _state.update { it.copy(period = period) }
        load()
    }

    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        load(quiet = true)
    }

    /** The tab shows again or an order changed while it shows: quiet reload only when dirty or stale */
    fun onShown() {
        if (job?.isActive == true) return
        if (freshness.shouldReload(clock(), RefreshPolicy.SUMMARY_TTL)) load(quiet = true)
    }

    /** [quiet] (#674: re-show, pull): the figures on screen stay until the answer replaces them; a failure keeps them */
    fun load(quiet: Boolean = false) {
        job?.cancel()
        val snapshot = _state.value
        val range = OverviewLogic.range(snapshot.period, today())
        val keep = quiet && snapshot.reportError == null &&
            (if (snapshot.showsRevenue) snapshot.report != null else snapshot.now != null)
        if (!keep) _state.update { it.copy(loading = true, report = null, reportError = null) }
        val version = freshness.begin()
        job = viewModelScope.launch {
            val (report, now) = withContext(Dispatchers.IO) {
                coroutineScope {
                    val report = async {
                        if (!snapshot.showsRevenue) null
                        else runCatching {
                            val json = fetch(OverviewLogic.periodPath(range))
                            OverviewLogic.reportFromJson(json.optJSONObject("data") ?: JSONObject())
                        }
                    }
                    val now = async {
                        if (!snapshot.showsOperations) null
                        else runCatching {
                            OverviewLogic.nowFromJson(fetch(OverviewLogic.outletOperationsPath()).optJSONObject("data") ?: JSONObject())
                        }.getOrNull()
                    }
                    report.await() to now.await()
                }
            }
            if (report?.exceptionOrNull() is CancellationException) return@launch
            if (keep && report?.isFailure == true) {
                _state.update { it.copy(now = now ?: it.now, refreshing = false) }
                return@launch
            }
            if (report?.isFailure != true) freshness.loaded(version, clock())
            _state.update {
                it.copy(
                    report = report?.getOrNull(),
                    reportError = report?.exceptionOrNull()?.let { e -> e.message ?: "" },
                    now = now ?: it.now,
                    loading = false,
                    refreshing = false,
                )
            }
        }
    }

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = OverviewV2ViewModel() as T
    }
}
