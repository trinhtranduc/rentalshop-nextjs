package com.anyrent.pos.domain.orders

import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Chosen rental days ↔ the `pickupPlanAt` / `returnPlanAt` instants sent to the API (#413).
 *
 * Same instants as iOS (`Date.startOfDay()` / `Date.endOfDay()` in the device zone, then
 * `dateServerISOString()`): pickup = start of the day, return = the last second of the day.
 * In Vietnam 04/10 → 05/10 is `2026-10-03T17:00:00.000Z` → `2026-10-05T16:59:59.000Z`.
 */
object OrderPlanDays {
    private val wire: DateTimeFormatter =
        DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    fun pickupInstant(day: LocalDate, zone: ZoneId = ZoneId.systemDefault()): String =
        wire.format(day.atStartOfDay(zone).toInstant())

    fun returnInstant(day: LocalDate, zone: ZoneId = ZoneId.systemDefault()): String =
        wire.format(day.plusDays(1).atStartOfDay(zone).toInstant().minusSeconds(1))

    /** The day an API instant falls on in [zone]; a plain `YYYY-MM-DD` is that day. */
    fun dayOf(raw: String?, zone: ZoneId = ZoneId.systemDefault()): LocalDate? {
        val trimmed = raw?.trim().orEmpty()
        if (trimmed.isEmpty()) return null
        if (trimmed.length == 10) return runCatching { LocalDate.parse(trimmed) }.getOrNull()
        return runCatching { Instant.parse(trimmed).atZone(zone).toLocalDate() }.getOrNull()
            ?: runCatching { OffsetDateTime.parse(trimmed).atZoneSameInstant(zone).toLocalDate() }.getOrNull()
            // "2024-01-15 00:00:00" style, no zone: keep its day
            ?: runCatching { LocalDate.parse(trimmed.take(10)) }.getOrNull()
    }
}
