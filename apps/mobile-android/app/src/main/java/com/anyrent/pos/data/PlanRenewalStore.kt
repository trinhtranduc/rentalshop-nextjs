package com.anyrent.pos.data

import com.anyrent.pos.domain.settings.PlanRenewal
import com.anyrent.pos.domain.settings.PlanRenewalStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.Instant

/**
 * #1459 the shop's plan as the app knows it: the last GET /api/subscriptions/status (Home line, Settings),
 * the expired signal (403 `SUBSCRIPTION_EXPIRED` / `_PERIOD_ENDED` / `_CANCELLED` from any call), and the one-line notice after a renewal.
 */
object PlanRenewalStore {
    private val _status = MutableStateFlow<PlanRenewalStatus?>(null)
    val status: StateFlow<PlanRenewalStatus?> = _status.asStateFlow()
    @Volatile private var fetchedAt: Instant? = null

    /** The period ended: the nav host opens the expired screen. Never a sign-out. */
    private val _ended = MutableSharedFlow<Unit>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val ended: SharedFlow<Unit> = _ended.asSharedFlow()
    @Volatile private var lastEndedAt: Long = 0

    /** "Đã gia hạn đến …" waiting for Home (a purchase confirmed on the expired screen) */
    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice.asStateFlow()

    private val TTL: Duration = Duration.ofMinutes(10)

    /** Called by ApiClient on a 403 SUBSCRIPTION_EXPIRED / _PERIOD_ENDED / _CANCELLED; many screens fail at once, one signal every 3 s */
    fun notifyEnded() {
        val now = System.currentTimeMillis()
        if (now - lastEndedAt < 3_000) return
        lastEndedAt = now
        _ended.tryEmit(Unit)
    }

    fun postNotice(text: String) {
        _notice.value = text
    }

    fun consumeNotice(): String? = _notice.value.also { _notice.value = null }

    /** Keeps the status and the period end a cold start reads */
    fun store(status: PlanRenewalStatus) {
        _status.value = status
        fetchedAt = Instant.now()
        status.currentPeriodEnd?.let { SessionStore.planPeriodEnd = it.toString() }
    }

    /** GET /api/subscriptions/status, at most every 10 minutes unless forced; null on failure (the last value stays) */
    suspend fun refresh(force: Boolean = false): PlanRenewalStatus? {
        val last = fetchedAt
        if (!force && last != null && Duration.between(last, Instant.now()) < TTL) return _status.value
        return withContext(Dispatchers.IO) {
            ApiClient.get().subscriptionRenewalStatus().getOrNull()?.also { store(it) }
        }
    }

    /** The saved period end is in the past (login or last status read) */
    fun periodOverFromCache(now: Instant = Instant.now()): Boolean = PlanRenewal.isPeriodOver(SessionStore.planPeriodEnd, now)

    fun reset() {
        _status.value = null
        fetchedAt = null
        _notice.value = null
    }
}
