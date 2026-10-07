package com.anyrent.pos.domain

import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * The shop's zone: the one place the app reads it for day decisions (#602, iOS `Date.shopTimeZone`, #601).
 *
 * A shop works in Vietnam civil days (timezone-dates). Every business day (cart pickup/return, extension, list
 * filters, today, late days, day labels, the `timeZone` sent to day-based endpoints) uses this zone, whatever the
 * phone is set to. A phone set to Vietnam therefore sends exactly what it sent before. Clock times (HH:mm) may stay
 * in the device zone. #567 phase 4 swaps this getter for the shop's own zone.
 */
object ShopTime {
    private const val VIETNAM = "Asia/Ho_Chi_Minh"

    /** Vietnam today; computed so a per-shop zone can replace it later */
    val zone: ZoneId get() = ZoneId.of(VIETNAM)

    /** IANA id sent as `timeZone` on day-based API calls */
    val zoneId: String get() = zone.id

    /** `timeZone` query value, URL-encoded (`Asia%2FHo_Chi_Minh`) */
    fun timeZoneParam(): String = URLEncoder.encode(zoneId, "UTF-8")

    /** The shop's civil day at [now] */
    fun today(now: Instant = Instant.now()): LocalDate = now.atZone(zone).toLocalDate()
}
