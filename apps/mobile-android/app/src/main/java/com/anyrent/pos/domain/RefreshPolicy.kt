package com.anyrent.pos.domain

import java.time.Duration
import java.time.Instant

/**
 * #674: screens reload on re-show only when their data changed or got old. iOS: `RefreshPolicy.swift`.
 *
 * - The app-wide "orders changed" signal is [com.anyrent.pos.ui.navigation.OrdersChanged], bumped after every order
 *   mutation (Giao đồ, Nhận trả, extend, edit, cancel, delete, note change, create from the cart).
 * - On re-show a screen reloads only when it is dirty or its last load is older than its TTL.
 */
object RefreshPolicy {
    /** Orders, Calendar, rented-out and not-picked-up lists */
    val LIST_TTL: Duration = Duration.ofMinutes(5)

    /** Overview, Settings plan/counts/overlap, unread badge */
    val SUMMARY_TTL: Duration = Duration.ofMinutes(10)

    /** True when nothing was loaded yet, an order changed since the last load, or the last load is [ttl] old */
    fun shouldReload(dirty: Boolean, lastLoadedAt: Instant?, now: Instant, ttl: Duration): Boolean {
        if (dirty || lastLoadedAt == null) return true
        return Duration.between(lastLoadedAt, now) >= ttl
    }
}

/**
 * Freshness of one screen's data against a change counter ([changes], by default the app-wide
 * [com.anyrent.pos.ui.navigation.OrdersChanged] version). A load takes [begin] when it starts and passes it to
 * [loaded], so a change that lands while the request is in flight still leaves the data dirty.
 */
class RefreshTracker(private val changes: () -> Long) {
    private var loadedVersion = Long.MIN_VALUE
    var lastLoadedAt: Instant? = null
        private set

    val isDirty: Boolean get() = lastLoadedAt == null || loadedVersion < changes()

    fun begin(): Long = changes()

    fun loaded(version: Long, at: Instant) {
        loadedVersion = maxOf(loadedVersion, version)
        lastLoadedAt = at
    }

    fun shouldReload(now: Instant, ttl: Duration): Boolean =
        RefreshPolicy.shouldReload(isDirty, lastLoadedAt, now, ttl)
}
