package com.anyrent.pos.ui.overview.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.WeeklySummary
import com.anyrent.pos.domain.overview.WeeklySummaryLogic
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/** What the summary sheet shows */
sealed interface WeeklySheetPhase {
    /** "AI đang đọc số liệu tuần trước…" */
    data object Loading : WeeklySheetPhase

    /** READY (text and figures) or NO_ORDERS (empty state) */
    data class Shown(val summary: WeeklySummary) : WeeklySheetPhase

    /** "Chưa tạo được tóm tắt." + Thử lại */
    data object Failed : WeeklySheetPhase
}

data class WeeklySummaryState(
    /** GET answer: the button shows when it is `available`; null (not loaded, 403, any error) hides it */
    val summary: WeeklySummary? = null,
    val sheetOpen: Boolean = false,
    val phase: WeeklySheetPhase = WeeklySheetPhase.Loading,
)

/**
 * #1612 "✦ Tóm tắt tuần" on Tổng quan (owner and branch manager). GET once on load and on pull to refresh (never
 * calls AI); the sheet POSTs, which returns the stored summary or writes it now (one AI call, a few seconds).
 */
class WeeklySummaryViewModel(
    private val get: () -> JSONObject = { ApiClient.get().authedGet(WeeklySummaryLogic.path()) },
    private val post: () -> JSONObject = {
        ApiClient.get().authedPost(WeeklySummaryLogic.path(), "{}".toRequestBody("application/json; charset=utf-8".toMediaType()))
    },
    role: String? = SessionStore.role,
    private val io: CoroutineDispatcher = Dispatchers.IO,
) : ViewModel() {
    /** Roles that see revenue on Tổng quan; the API answers 403 for any other (the button then stays hidden) */
    private val enabled = OverviewLogic.showsRevenue(role)
    private val _state = MutableStateFlow(WeeklySummaryState())
    val state: StateFlow<WeeklySummaryState> = _state.asStateFlow()
    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        load()
    }

    /** GET: button and red dot. Any error hides the button. */
    fun load() {
        if (!enabled) return
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val answer = withContext(io) { runCatching { parse(get()) } }
            // A sheet that already wrote this week's summary keeps its newer answer (no dot)
            if (writeJob?.isActive == true) return@launch
            _state.update { it.copy(summary = answer.getOrNull()) }
        }
    }

    /** Tap on the button: a stored summary shows at once, otherwise the loading state; POST either way */
    fun open() {
        val stored = _state.value.summary
        _state.update {
            it.copy(
                sheetOpen = true,
                phase = if (WeeklySummaryLogic.isShowable(stored)) WeeklySheetPhase.Shown(stored!!) else WeeklySheetPhase.Loading,
            )
        }
        write()
    }

    fun retry() {
        _state.update { it.copy(phase = WeeklySheetPhase.Loading) }
        write()
    }

    /** Closing does not cancel a write: the summary is still stored and the dot goes when it lands */
    fun close() {
        _state.update { it.copy(sheetOpen = false) }
    }

    private fun write() {
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            val answer = withContext(io) { runCatching { parse(post()) } }.getOrNull()
            _state.update { state ->
                when {
                    answer != null && WeeklySummaryLogic.isShowable(answer) ->
                        state.copy(summary = answer, phase = WeeklySheetPhase.Shown(answer))
                    // A failure keeps a stored summary already on screen
                    state.phase is WeeklySheetPhase.Shown -> state
                    else -> state.copy(phase = WeeklySheetPhase.Failed)
                }
            }
        }
    }

    private fun parse(json: JSONObject): WeeklySummary = WeeklySummaryLogic.fromJson(json.optJSONObject("data") ?: JSONObject())

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = WeeklySummaryViewModel() as T
    }
}
