package com.anyrent.pos.domain.orders

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * #496 the two lines under the customer name of an order list row (boards Main, VL-*, DT-*, Lich):
 * line 1 (muted) "#0053 · tạo 05/10/26", line 2 (by status) "Lấy 05/10/26 · trả 07/10/26" (dd/mm/yy since #888).
 * Every day is a Vietnam civil day ([shopZone]), whatever the device zone (timezone-dates). Pure and unit tested.
 */
object OrderRowDates {
    /** Day logic runs in shop days, never the device zone */
    val shopZone: ZoneId get() = com.anyrent.pos.domain.ShopTime.zone

    /** Templates; the defaults are the Vietnamese copy, the screens pass the string resources */
    data class Texts(
        /** Monday first: T2 … T7, CN */
        val weekdays: List<String> = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN"),
        val created: String = "tạo %s",
        val handOver: String = "Lấy %s",
        val handOverReturn: String = "trả %s",
        val returns: String = "Trả %s",
        val returnDue: String = "Hạn trả %s",
        val returned: String = "Đã trả %s",
        val sold: String = "Bán %s",
        val cancelled: String = "Huỷ %s",
    )

    /** What a row knows about its order; any date may be missing */
    data class Input(
        /** The code as the row shows it, without "#" */
        val code: String,
        val orderType: String?,
        val status: String?,
        val createdAt: Instant? = null,
        val pickupPlanAt: Instant? = null,
        val returnPlanAt: Instant? = null,
        val returnedAt: Instant? = null,
        val updatedAt: Instant? = null,
        /** A rented-out order past its return day (the row keeps its late chip) */
        val late: Boolean = false,
    )

    /** [task] is null when nothing can be said (no date for the status) */
    data class Lines(val meta: String, val task: String?)

    /** "05/10/26" in [zone] (#888) */
    fun day(instant: Instant, zone: ZoneId = shopZone, weekdays: List<String> = Texts().weekdays): String =
        day(instant.atZone(zone).toLocalDate(), weekdays)

    /** #888: dd/mm/yy everywhere ([weekdays] kept for callers, unused) */
    @Suppress("UNUSED_PARAMETER")
    fun day(date: LocalDate, weekdays: List<String> = Texts().weekdays): String = com.anyrent.pos.domain.DayText.dmy(date)

    /** #888 "05/10/26": dd/mm/yy of the Vietnam civil day, whatever the device zone */
    fun dmy(instant: Instant, zone: ZoneId = shopZone): String = com.anyrent.pos.domain.DayText.dmy(instant, zone)

    /** #888 one date of a "Tất cả đơn" row, [marked] when the list is sorted by it */
    data class Part(val text: String, val marked: Boolean)

    /** #888 "Lấy 14/10/26", "Trả 16/10/26"; a missing day is left out */
    fun rentPlan(
        pickupPlanAt: Instant?, returnPlanAt: Instant?, markPickup: Boolean, markReturn: Boolean,
        texts: Texts = Texts(), zone: ZoneId = shopZone,
    ): List<Part> = listOfNotNull(
        pickupPlanAt?.let { Part(texts.handOver.format(dmy(it, zone)), markPickup) },
        returnPlanAt?.let { Part(texts.returns.format(dmy(it, zone)), markReturn) },
    )

    fun lines(input: Input, texts: Texts = Texts(), zone: ZoneId = shopZone): Lines {
        fun fmt(instant: Instant) = dmy(instant, zone)
        val meta = listOfNotNull("#${input.code}", input.createdAt?.let { texts.created.format(fmt(it)) }).joinToString(" · ")
        val status = input.status.orEmpty().uppercase()
        val isRent = input.orderType.equals("RENT", ignoreCase = true)
        val task = when {
            status == "CANCELLED" -> input.updatedAt?.let { texts.cancelled.format(fmt(it)) }
            !isRent -> input.createdAt?.let { texts.sold.format(fmt(it)) }
            status == "RESERVED" -> {
                val pickup = input.pickupPlanAt?.let { fmt(it) }
                val ret = input.returnPlanAt?.let { fmt(it) }
                when {
                    pickup != null && ret != null -> "${texts.handOver.format(pickup)} · ${texts.handOverReturn.format(ret)}"
                    pickup != null -> texts.handOver.format(pickup)
                    // No hand-over day: the return part alone, capitalised like a line start
                    ret != null -> texts.returns.format(ret)
                    else -> null
                }
            }
            status == "PICKUPED" || status == "PICKED_UP" ->
                input.returnPlanAt?.let { (if (input.late) texts.returnDue else texts.returns).format(fmt(it)) }
            status == "RETURNED" -> input.returnedAt?.let { texts.returned.format(fmt(it)) }
            else -> null
        }
        return Lines(meta, task)
    }
}
