package com.anyrent.pos.ui.overview.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewNow
import com.anyrent.pos.domain.overview.OverviewPeriod
import com.anyrent.pos.domain.overview.OverviewPreset
import com.anyrent.pos.domain.overview.OverviewReport
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
import org.json.JSONObject
import java.net.URLEncoder
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
    private val today: () -> LocalDate = { LocalDate.now() },
    role: String? = SessionStore.role,
) : ViewModel() {
    private val _state = MutableStateFlow(
        OverviewV2State(showsRevenue = OverviewLogic.showsRevenue(role), showsOperations = OverviewLogic.showsOperations(role)),
    )
    val state: StateFlow<OverviewV2State> = _state.asStateFlow()
    private var job: Job? = null

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
        load()
    }

    fun load() {
        job?.cancel()
        val snapshot = _state.value
        val range = OverviewLogic.range(snapshot.period, today())
        _state.update { it.copy(loading = true, report = null, reportError = null) }
        job = viewModelScope.launch {
            val (report, now) = withContext(Dispatchers.IO) {
                coroutineScope {
                    val report = async {
                        if (!snapshot.showsRevenue) null
                        else runCatching {
                            val zone = URLEncoder.encode(deviceTimeZoneId(), "UTF-8")
                            val json = fetch(
                                "/api/analytics/period?startDate=${range.start}&endDate=${range.end}" +
                                    "&groupBy=${OverviewLogic.groupBy(range)}&limit=3&timeZone=$zone",
                            )
                            OverviewLogic.reportFromJson(json.optJSONObject("data") ?: JSONObject())
                        }
                    }
                    val now = async {
                        if (!snapshot.showsOperations) null
                        else runCatching {
                            val zone = URLEncoder.encode(deviceTimeZoneId(), "UTF-8")
                            OverviewLogic.nowFromJson(fetch("/api/analytics/outlet-operations?timeZone=$zone").optJSONObject("data") ?: JSONObject())
                        }.getOrNull()
                    }
                    report.await() to now.await()
                }
            }
            if (report?.exceptionOrNull() is CancellationException) return@launch
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
