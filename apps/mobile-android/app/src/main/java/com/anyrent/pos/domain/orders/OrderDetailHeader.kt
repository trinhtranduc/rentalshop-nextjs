package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * #643 calmer order detail header (mockup `.agent/changes/643-order-header/mockups/header-truoc-sau.png`, iOS reference):
 * title "Đơn thuê #n" / "Đơn bán #n", customer name + small phone + round call button, one light box with the status
 * pill, the note "N ngày · trả sau K ngày" and three steps with two-line labels ("Đặt / T2 14/09").
 *
 * Every day is a Vietnam civil day (timezone-dates), whatever the phone zone. Pure and unit tested; the screen maps
 * the enums to string resources.
 */
object OrderDetailHeader {
    /** Day logic runs in shop days */
    private val shopZone: ZoneId get() = com.anyrent.pos.domain.ShopTime.zone

    /** First line of a step label */
    enum class StepTitle { BOOKED, HAND_OVER, HANDED_OVER, RETURN, RETURNED }

    /** One step under the bar: [title] / [day] ("T4 01/10", "—" without a date); [accent] colours the day */
    data class Step(val title: StepTitle, val day: String, val done: Boolean, val accent: Boolean)

    /** Right part of the note after "N ngày" */
    sealed interface Due {
        /** Picked up: "trả sau K ngày" */
        data class ReturnIn(val days: Int) : Due

        /** Picked up, return planned today: "trả hôm nay" */
        data object ReturnToday : Due

        /** Reserved: "giao sau K ngày" */
        data class HandOverIn(val days: Int) : Due

        /** Reserved, hand-over planned today: "giao hôm nay" */
        data object HandOverToday : Due

        /** Reserved past the planned hand-over: "quá ngày lấy K ngày" (the Overview's wording, never "trễ") */
        data class PastPickup(val days: Int) : Due

        /** Returned: "đã trả" */
        data object Returned : Due
    }

    /** The note right of the pill: "[rentalDays] ngày · [due]"; either part may be missing */
    data class Note(val rentalDays: Int?, val due: Due?) {
        val isEmpty: Boolean get() = rentalDays == null && due == null
    }

    fun isRent(orderType: String): Boolean = orderType.equals("RENT", ignoreCase = true)

    private fun normalized(status: String): String = status.uppercase().let { if (it == "PICKED_UP") "PICKUPED" else it }

    /** The customer name, or null for a walk-in order (the screen shows "Khách lẻ") */
    fun customerName(name: String?): String? = name?.trim()?.takeIf { it.isNotEmpty() }

    /** The number dialled by the call button (spaces removed), or null: no button */
    fun dialNumber(phone: String?): String? = phone?.filterNot { it.isWhitespace() }?.takeIf { it.isNotEmpty() }

    /** Shop civil day of an ISO instant */
    fun dayOf(value: String?, zone: ZoneId = shopZone): LocalDate? =
        value?.let { parse(it) }?.atZone(zone)?.toLocalDate()

    private fun parse(value: String): Instant? =
        runCatching { Instant.parse(value) }.getOrNull()
            ?: runCatching { java.time.OffsetDateTime.parse(value).toInstant() }.getOrNull()

    /** "T4 01/10" in the shop zone; "—" without a date */
    fun dayLabel(value: String?, weekdays: List<String> = OrderRowDates.Texts().weekdays, zone: ZoneId = shopZone): String =
        dayOf(value, zone)?.let { OrderRowDates.day(it, weekdays) } ?: "—"

    /** Note of a rent ("7 ngày · trả sau 2 ngày"); a sale or a cancelled rent has none beyond the day count */
    fun note(summary: OrderSummary, now: Instant = Instant.now(), zone: ZoneId = shopZone): Note {
        if (!isRent(summary.orderType)) return Note(null, null)
        val days = OrderDetailLogic.rentalDays(summary.pickupPlanAt, summary.returnPlanAt, zone)
        val today = now.atZone(zone).toLocalDate()
        fun until(value: String?): Long? = dayOf(value, zone)?.let { ChronoUnit.DAYS.between(today, it) }
        val due = when (normalized(summary.status)) {
            "RESERVED" -> until(summary.pickupPlanAt)?.let {
                when {
                    it > 0 -> Due.HandOverIn(it.toInt())
                    it == 0L -> Due.HandOverToday
                    else -> Due.PastPickup((-it).toInt())
                }
            }
            // A late return: the red banner says it; the note keeps only "N ngày"
            "PICKUPED" -> until(summary.returnPlanAt)?.let {
                when {
                    it > 0 -> Due.ReturnIn(it.toInt())
                    it == 0L -> Due.ReturnToday
                    else -> null
                }
            }
            "RETURNED" -> Due.Returned
            else -> null
        }
        return Note(days, due)
    }

    /**
     * The three steps of a rent: "Đặt" (created day), "Giao"/"Đã giao" (actual or planned hand-over), "Trả"/"Đã trả"
     * (actual or planned return). No time. Empty for a sale or a cancelled order.
     */
    fun steps(
        summary: OrderSummary,
        weekdays: List<String> = OrderRowDates.Texts().weekdays,
        zone: ZoneId = shopZone,
    ): List<Step> {
        val status = normalized(summary.status)
        if (!isRent(summary.orderType) || status == "CANCELLED") return emptyList()
        val reached = when (status) {
            "RESERVED" -> 1
            "PICKUPED" -> 2
            "RETURNED" -> 3
            else -> 0
        }
        val days = OrderDetailLogic.progressDays(summary)
        val handedOver = reached >= 2
        val returned = reached >= 3
        return listOf(
            Step(StepTitle.BOOKED, dayLabel(days.booked, weekdays, zone), done = reached >= 1, accent = false),
            Step(
                if (handedOver) StepTitle.HANDED_OVER else StepTitle.HAND_OVER,
                dayLabel(days.handOver, weekdays, zone),
                done = handedOver,
                accent = handedOver,
            ),
            Step(
                if (returned) StepTitle.RETURNED else StepTitle.RETURN,
                dayLabel(days.returned, weekdays, zone),
                done = returned,
                accent = returned,
            ),
        )
    }

    /** Right of the pill on a sale: the sale day "T4 01/10" */
    fun saleDay(summary: OrderSummary, weekdays: List<String> = OrderRowDates.Texts().weekdays, zone: ZoneId = shopZone): String =
        dayLabel(summary.createdAt, weekdays, zone)
}
