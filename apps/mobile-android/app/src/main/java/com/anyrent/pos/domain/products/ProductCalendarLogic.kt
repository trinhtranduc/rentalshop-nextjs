package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.OrderRowDates
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * #642 "Lịch trống" month screen (mockups/lich-trong.png): grid, cell colours, the chosen range and the orders that
 * hold the product on a day. Every day is a Vietnam civil day (timezone-dates); pure and unit tested.
 */
object ProductCalendarLogic {
    /** Colour of a day cell */
    enum class Tone {
        /** Before today: grey, no count */
        PAST,
        /** available == stock: green */
        FULL,
        /** 0 < available < stock: orange */
        LOW,
        /** 0 available: red */
        NONE,
        /** No answer for the day yet: neutral, no count */
        UNKNOWN,
    }

    /** Place of a day in the chosen range */
    enum class RangeRole { NONE, START, END, BETWEEN }

    data class Cell(val date: LocalDate, val tone: Tone, val available: Int?, val isToday: Boolean)

    /** First tap = start; a tap on or after the start = end; a tap before the start (or after a full range) restarts */
    data class Range(val start: LocalDate? = null, val end: LocalDate? = null) {
        val isComplete: Boolean get() = start != null && end != null
    }

    /** Blank cells before day 1 in a Monday-first week (1 Oct 2026, a Thursday → 3) */
    fun leadingBlanks(month: YearMonth): Int = month.atDay(1).dayOfWeek.value - 1

    /** Grid of the month: null for the leading blanks, then every day */
    fun grid(month: YearMonth): List<LocalDate?> =
        List(leadingBlanks(month)) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }

    /** `from` / `to` keys of the availability call for [month] */
    fun monthKeys(month: YearMonth): Pair<String, String> = month.atDay(1).toString() to month.atEndOfMonth().toString()

    /** The previous month is reachable only from a month after the current one */
    fun canGoPrevious(month: YearMonth, today: LocalDate): Boolean = month.isAfter(YearMonth.from(today))

    fun tone(date: LocalDate, today: LocalDate, available: Int?, stock: Int): Tone = when {
        date.isBefore(today) -> Tone.PAST
        available == null -> Tone.UNKNOWN
        available <= 0 -> Tone.NONE
        available >= stock -> Tone.FULL
        else -> Tone.LOW
    }

    fun cell(date: LocalDate, today: LocalDate, available: Map<String, Int>, stock: Int): Cell {
        val count = available[date.toString()]?.coerceAtLeast(0)
        val tone = tone(date, today, count, stock)
        return Cell(date, tone, count.takeIf { tone != Tone.PAST }, date == today)
    }

    /** Next range after a tap on [date]; past days cannot be picked */
    fun tap(range: Range, date: LocalDate, today: LocalDate): Range = when {
        date.isBefore(today) -> range
        range.start == null || range.end != null -> Range(start = date)
        date.isBefore(range.start) -> Range(start = date)
        else -> range.copy(end = date)
    }

    fun role(date: LocalDate, range: Range): RangeRole {
        val start = range.start ?: return RangeRole.NONE
        val end = range.end
        return when {
            date == start -> RangeRole.START
            end != null && date == end -> RangeRole.END
            end != null && date.isAfter(start) && date.isBefore(end) -> RangeRole.BETWEEN
            else -> RangeRole.NONE
        }
    }

    /** Days in the range, both ends included (a same-day range is 1 day) */
    fun dayCount(start: LocalDate, end: LocalDate): Int = (ChronoUnit.DAYS.between(start, end) + 1).toInt().coerceAtLeast(1)

    /** Fewest units free on any day of the range; a day without an answer counts as 0 */
    fun minAvailable(start: LocalDate, end: LocalDate, available: Map<String, Int>): Int =
        generateSequence(start) { it.plusDays(1) }.takeWhile { !it.isAfter(end) }
            .minOf { (available[it.toString()] ?: 0).coerceAtLeast(0) }

    /** Months touched by the range, to load the ones not on screen */
    fun months(start: LocalDate, end: LocalDate): List<YearMonth> =
        generateSequence(YearMonth.from(start)) { it.plusMonths(1) }.takeWhile { !it.isAfter(YearMonth.from(end)) }.toList()

    /** "Thêm vào giỏ với ngày này": a full range with a free unit, or the shop lets orders overlap */
    fun canAdd(range: Range, minAvailable: Int?, allowOverlap: Boolean): Boolean =
        range.isComplete && minAvailable != null && (minAvailable > 0 || allowOverlap)

    /** The orange note: nothing free but the shop allows overlapping orders */
    fun showsOverlapNote(range: Range, minAvailable: Int?, allowOverlap: Boolean): Boolean =
        range.isComplete && minAvailable == 0 && allowOverlap

    /**
     * Open orders (RESERVED / PICKUPED) whose rental days cover [day], both ends included in shop days, so a
     * same-day pickup and return still holds that day. An order without a return day holds its pickup day only.
     */
    fun ordersCovering(day: LocalDate, orders: List<OrderSummary>, zone: ZoneId = OrderRowDates.shopZone): List<OrderSummary> =
        orders.distinctBy { it.id }.filter { order ->
            val status = order.status.uppercase()
            if (status != "RESERVED" && status != "PICKUPED" && status != "PICKED_UP") return@filter false
            val pickup = parseDay(order.pickupPlanAt, zone) ?: return@filter false
            val ret = parseDay(order.returnPlanAt, zone) ?: pickup
            !day.isBefore(pickup) && !day.isAfter(ret)
        }.sortedBy { it.pickupPlanAt.orEmpty() }

    /** "Giao T4 07/10 · trả T6 09/10" of an order row */
    fun orderDates(order: OrderSummary, texts: OrderRowDates.Texts = OrderRowDates.Texts(), zone: ZoneId = OrderRowDates.shopZone): String {
        val pickup = parseDay(order.pickupPlanAt, zone)?.let { texts.handOver.format(OrderRowDates.day(it, texts.weekdays)) }
        val ret = parseDay(order.returnPlanAt, zone)?.let { texts.handOverReturn.format(OrderRowDates.day(it, texts.weekdays)) }
        return listOfNotNull(pickup, ret).joinToString(" · ")
    }

    /** Units of [productId] in [order]; 1 when the list did not say */
    fun quantity(order: OrderSummary, productId: Int): Int = order.productQuantities[productId]?.takeIf { it > 0 } ?: 1

    private fun parseDay(raw: String?, zone: ZoneId): LocalDate? =
        raw?.let { runCatching { Instant.parse(it) }.getOrNull() }?.atZone(zone)?.toLocalDate()
}
