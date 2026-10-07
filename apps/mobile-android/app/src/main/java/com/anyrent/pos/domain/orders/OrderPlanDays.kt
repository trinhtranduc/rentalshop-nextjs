package com.anyrent.pos.domain.orders

import com.anyrent.pos.domain.ShopTime
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Chosen rental days ↔ the `pickupPlanAt` / `returnPlanAt` instants sent to the API (#413).
 *
 * Same instants as iOS (`CartV2Logic.rentalBounds`, #601): pickup = start of the shop day, return = its last
 * second, in the shop zone ([ShopTime.zone], #602) whatever the phone zone.
 * 04/10 → 05/10 is `2026-10-03T17:00:00.000Z` → `2026-10-05T16:59:59.000Z`.
 */
object OrderPlanDays {
    private val wire: DateTimeFormatter =
        DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    fun pickupInstant(day: LocalDate, zone: ZoneId = ShopTime.zone): String =
        wire.format(day.atStartOfDay(zone).toInstant())

    fun returnInstant(day: LocalDate, zone: ZoneId = ShopTime.zone): String =
        wire.format(day.plusDays(1).atStartOfDay(zone).toInstant().minusSeconds(1))

    /** The day an API instant falls on in [zone]; a plain `YYYY-MM-DD` is that day. */
    fun dayOf(raw: String?, zone: ZoneId = ShopTime.zone): LocalDate? {
        val trimmed = raw?.trim().orEmpty()
        if (trimmed.isEmpty()) return null
        if (trimmed.length == 10) return runCatching { LocalDate.parse(trimmed) }.getOrNull()
        return runCatching { Instant.parse(trimmed).atZone(zone).toLocalDate() }.getOrNull()
            ?: runCatching { OffsetDateTime.parse(trimmed).atZoneSameInstant(zone).toLocalDate() }.getOrNull()
            // "2024-01-15 00:00:00" style, no zone: keep its day
            ?: runCatching { LocalDate.parse(trimmed.take(10)) }.getOrNull()
    }
}
