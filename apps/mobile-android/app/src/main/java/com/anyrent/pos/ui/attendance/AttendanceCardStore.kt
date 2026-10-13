package com.anyrent.pos.ui.attendance

import com.anyrent.pos.data.AttendanceApi
import com.anyrent.pos.data.PunchOutcome
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.AttendanceMe
import com.anyrent.pos.domain.attendance.AttendanceStatus
import com.anyrent.pos.domain.attendance.WorkedPair
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

/**
 * State of the Cài đặt clock card (#927) kept across the trip to the scanner route: the last `me` and today's
 * records of the signed-in user, and the last scan result. Values of another user are never shown.
 */
object AttendanceCardStore {
    data class Snapshot(val userId: Int?, val me: AttendanceMe?, val todayPairs: List<WorkedPair>)

    /** The last scan; [seen] once Cài đặt showed it after the scanner closed */
    data class LastScan(val outcome: PunchOutcome, val seen: Boolean = false)

    private val _state = MutableStateFlow(Snapshot(null, null, emptyList()))
    val state: StateFlow<Snapshot> = _state.asStateFlow()

    private val _scan = MutableStateFlow<LastScan?>(null)
    val scan: StateFlow<LastScan?> = _scan.asStateFlow()

    /** `me` of the signed-in user, or null (another user's cache, not loaded) */
    fun meFor(snapshot: Snapshot): AttendanceMe? = snapshot.me?.takeIf { snapshot.userId == SessionStore.userId }

    suspend fun refresh() {
        val userId = SessionStore.userId
        val me = withContext(Dispatchers.IO) { AttendanceApi.me() }.getOrElse {
            // Failed (module off, network): keep what we had for this user, drop another user's
            if (_state.value.userId != userId) _state.value = Snapshot(userId, null, emptyList())
            return
        }
        val pairs = if (me.status() == AttendanceStatus.DONE) {
            withContext(Dispatchers.IO) { AttendanceApi.todayPairs() }.getOrDefault(emptyList())
        } else {
            emptyList()
        }
        _state.value = Snapshot(userId, me, pairs)
    }

    /** From the scanner: keep the result and flip the button at once; [refresh] confirms it */
    fun onScanned(outcome: PunchOutcome) {
        _scan.value = LastScan(outcome)
        val done = outcome as? PunchOutcome.Done ?: return
        val current = _state.value
        val me = meFor(current) ?: return
        _state.value = current.copy(
            me = me.copy(
                openRecord = if (done.result.isIn) done.result.record else null,
                lastAction = done.result.action,
                lastActionAt = done.result.record?.checkOutAt ?: done.result.record?.checkInAt,
                apiStatus = if (done.result.isIn) "IN_SHIFT" else "DONE",
            ),
        )
    }

    /** Cài đặt shows: a result seen before goes away, a fresh one is shown once */
    fun onSettingsShown() {
        val scan = _scan.value ?: return
        _scan.value = if (scan.seen) null else scan.copy(seen = true)
    }

    /** Hours of the record a Ra ca of this scan closed (the card's day total while today's records cannot be read) */
    fun lastOutHours(scan: LastScan?): Double? =
        (scan?.outcome as? PunchOutcome.Done)?.result?.takeIf { !it.isIn }?.let { AttendanceLogic.hours(it.record) }

    fun clearScan() {
        _scan.value = null
    }
}
