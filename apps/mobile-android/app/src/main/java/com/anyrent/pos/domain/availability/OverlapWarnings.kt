package com.anyrent.pos.domain.availability

import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId

/**
 * #518 "Cho tạo đơn khi trùng lịch" in the cart (boards GH-trung-bat, GH-trung-tat).
 *
 * A rental line is double-booked when the batch availability the cart already fetches says it cannot be
 * fulfilled AND other orders hold the product on those dates (a product short of stock with no other order is
 * not a double booking; same rule as the API's `schedule-conflict`). The shop setting then decides:
 * - ON (default): red line on the item, orange "Trùng lịch" block in the confirm sheet, button "Vẫn tạo đơn".
 * - OFF: red line on the item, "Tạo đơn" disabled with a notice (the API also answers 409 ORDER_SCHEDULE_CONFLICT).
 *
 * Days are Vietnam civil days ([shopZone]) whatever the device zone. Pure and unit tested.
 */
object OverlapWarnings {
    val shopZone: ZoneId get() = com.anyrent.pos.domain.ShopTime.zone

    data class LineConflict(
        val productId: Int,
        val name: String,
        /** Units short for the dates, at least 1 */
        val missing: Int,
        /** Booked-out days inside the cart's range */
        val from: LocalDate,
        val to: LocalDate,
        /** Other orders holding the product, as the API numbers them */
        val orderNumbers: List<String>,
    )

    /** Copy; the defaults are the boards' Vietnamese, the screens pass string resources */
    data class Texts(
        val cartLine: String = "Hết đồ %1\$s · đã thuê ở đơn %2\$s",
        val cartLineNoOrder: String = "Hết đồ %1\$s",
        val confirmLine: String = "%1\$s thiếu %2\$d bộ ngày %3\$s (đã thuê ở %4\$s).",
        val confirmLineNoOrder: String = "%1\$s thiếu %2\$d bộ ngày %3\$s.",
    )

    /** The line's double booking for [pickup]..[returnDate], or null (free, short of stock only, or unknown) */
    fun conflict(
        productId: Int,
        name: String,
        requested: Int,
        availability: ProductAvailability?,
        pickup: LocalDate,
        returnDate: LocalDate,
        zone: ZoneId = shopZone,
    ): LineConflict? {
        if (availability == null || availability.isAvailable) return null
        val holders = availability.conflicts
        if (holders.isEmpty()) return null
        val start = minOf(pickup, returnDate)
        val end = maxOf(pickup, returnDate)
        val firstHeld = holders.mapNotNull { day(it.pickupAt, zone) }.minOrNull()
        val lastHeld = holders.mapNotNull { day(it.returnAt, zone) }.maxOrNull()
        var from = if (firstHeld != null && firstHeld.isAfter(start)) firstHeld else start
        var to = if (lastHeld != null && lastHeld.isBefore(end)) lastHeld else end
        if (to.isBefore(from)) {
            from = start
            to = end
        }
        val missing = (requested - availability.effectivelyAvailable.coerceAtLeast(0)).coerceAtLeast(1)
        val numbers = holders.mapNotNull { it.orderNumber?.trim()?.takeIf { n -> n.isNotEmpty() } }.distinct()
        return LineConflict(productId, name, missing, from, to, numbers)
    }

    /** Tạo đơn is locked: the shop does not allow overlapping rentals and a line is double-booked */
    fun blocksCreate(allowOverlapping: Boolean, conflicts: List<LineConflict>): Boolean =
        !allowOverlapping && conflicts.isNotEmpty()

    /** The confirm sheet shows "Trùng lịch" and "Vẫn tạo đơn" */
    fun warnsOnConfirm(allowOverlapping: Boolean, conflicts: List<LineConflict>): Boolean =
        allowOverlapping && conflicts.isNotEmpty()

    /** "03–05/10", "28/09–02/10" across months, "03/10" for one day */
    fun dayRange(from: LocalDate, to: LocalDate): String {
        fun ddmm(d: LocalDate) = "%02d/%02d".format(d.dayOfMonth, d.monthValue)
        return when {
            from == to -> ddmm(from)
            from.monthValue == to.monthValue && from.year == to.year -> "%02d–%s".format(from.dayOfMonth, ddmm(to))
            else -> "${ddmm(from)}–${ddmm(to)}"
        }
    }

    /** "#482113", "#482113, #482114", "#482113, #482114 +1" */
    fun orderRefs(numbers: List<String>, max: Int = 2): String {
        val shown = numbers.take(max).joinToString(", ") { "#" + it.removePrefix("#") }
        val more = numbers.size - max
        return if (more > 0) "$shown +$more" else shown
    }

    /** Red line under the cart item */
    fun cartLine(conflict: LineConflict, texts: Texts = Texts()): String {
        val range = dayRange(conflict.from, conflict.to)
        return if (conflict.orderNumbers.isEmpty()) texts.cartLineNoOrder.format(range)
        else texts.cartLine.format(range, orderRefs(conflict.orderNumbers))
    }

    /** One sentence of the orange "Trùng lịch" block */
    fun confirmLine(conflict: LineConflict, texts: Texts = Texts()): String {
        val range = dayRange(conflict.from, conflict.to)
        return if (conflict.orderNumbers.isEmpty()) texts.confirmLineNoOrder.format(conflict.name, conflict.missing, range)
        else texts.confirmLine.format(conflict.name, conflict.missing, range, orderRefs(conflict.orderNumbers))
    }

    /** ISO instant (or a plain YYYY-MM-DD) → Vietnam civil day */
    internal fun day(value: String?, zone: ZoneId = shopZone): LocalDate? {
        val raw = value?.trim()?.takeIf { it.isNotEmpty() && !it.equals("null", true) } ?: return null
        return runCatching { Instant.parse(raw).atZone(zone).toLocalDate() }
            .recoverCatching { OffsetDateTime.parse(raw).atZoneSameInstant(zone).toLocalDate() }
            .recoverCatching { LocalDate.parse(raw.take(10)) }
            .getOrNull()
    }
}
