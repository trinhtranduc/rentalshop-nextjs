package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.products.ProductCalendarLogic.Range
import com.anyrent.pos.domain.products.ProductCalendarLogic.RangeRole
import com.anyrent.pos.domain.products.ProductCalendarLogic.Tone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

/** #642 — "Lịch trống" month screen */
class ProductCalendarLogicTest {
    private val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
    private val today = LocalDate.of(2026, 10, 7)
    private fun d(day: Int, month: Int = 10) = LocalDate.of(2026, month, day)

    private fun order(
        id: Int,
        pickup: String?,
        returns: String?,
        status: String = "RESERVED",
        quantities: Map<Int, Int> = emptyMap(),
    ) = OrderSummary(
        id = id, orderNumber = "48211$id", orderType = "RENT", status = status, totalAmount = 1.0, depositAmount = 0.0,
        customerName = "Mai", customerPhone = null, pickupPlanAt = pickup, returnPlanAt = returns, createdAt = null,
        notes = null, productQuantities = quantities,
    )

    @Test
    fun october2026StartsOnThursdayWithThreeBlanks() {
        val month = YearMonth.of(2026, 10)
        assertEquals(3, ProductCalendarLogic.leadingBlanks(month))
        val grid = ProductCalendarLogic.grid(month)
        assertEquals(3 + 31, grid.size)
        assertEquals(listOf(null, null, null, d(1)), grid.take(4))
        assertEquals(d(31), grid.last())
        assertEquals("2026-10-01" to "2026-10-31", ProductCalendarLogic.monthKeys(month))
        // June 2026 starts on a Monday: no blank
        assertEquals(0, ProductCalendarLogic.leadingBlanks(YearMonth.of(2026, 6)))
    }

    @Test
    fun previousMonthOnlyAfterTheCurrentMonth() {
        assertFalse(ProductCalendarLogic.canGoPrevious(YearMonth.of(2026, 10), today))
        assertTrue(ProductCalendarLogic.canGoPrevious(YearMonth.of(2026, 11), today))
    }

    @Test
    fun cellTonePerAvailableStockPastAndToday() {
        val available = mapOf("2026-10-06" to 3, "2026-10-07" to 2, "2026-10-08" to 3, "2026-10-09" to 0, "2026-10-10" to -1)
        assertEquals(Tone.PAST, ProductCalendarLogic.cell(d(6), today, available, 3).tone)
        assertNull(ProductCalendarLogic.cell(d(6), today, available, 3).available)
        val todayCell = ProductCalendarLogic.cell(d(7), today, available, 3)
        assertEquals(Tone.LOW, todayCell.tone)
        assertTrue(todayCell.isToday)
        assertEquals(2, todayCell.available)
        assertEquals(Tone.FULL, ProductCalendarLogic.cell(d(8), today, available, 3).tone)
        assertEquals(Tone.NONE, ProductCalendarLogic.cell(d(9), today, available, 3).tone)
        assertEquals(Tone.NONE, ProductCalendarLogic.cell(d(10), today, available, 3).tone)
        assertEquals(Tone.UNKNOWN, ProductCalendarLogic.cell(d(11), today, available, 3).tone)
        assertFalse(ProductCalendarLogic.cell(d(8), today, available, 3).isToday)
    }

    @Test
    fun rangeRules() {
        var range = Range()
        // A past day cannot be picked
        range = ProductCalendarLogic.tap(range, d(6), today)
        assertEquals(Range(), range)
        range = ProductCalendarLogic.tap(range, d(9), today)
        assertEquals(Range(d(9), null), range)
        // A tap before the start restarts
        range = ProductCalendarLogic.tap(range, d(8), today)
        assertEquals(Range(d(8), null), range)
        range = ProductCalendarLogic.tap(range, d(16), today)
        assertEquals(Range(d(8), d(16)), range)
        assertTrue(range.isComplete)
        assertEquals(RangeRole.START, ProductCalendarLogic.role(d(8), range))
        assertEquals(RangeRole.BETWEEN, ProductCalendarLogic.role(d(12), range))
        assertEquals(RangeRole.END, ProductCalendarLogic.role(d(16), range))
        assertEquals(RangeRole.NONE, ProductCalendarLogic.role(d(17), range))
        assertEquals(9, ProductCalendarLogic.dayCount(d(8), d(16)))
        // A full range: the next tap starts again
        range = ProductCalendarLogic.tap(range, d(20), today)
        assertEquals(Range(d(20), null), range)
        // Same day as the start = a one-day range
        range = ProductCalendarLogic.tap(range, d(20), today)
        assertEquals(Range(d(20), d(20)), range)
        assertEquals(1, ProductCalendarLogic.dayCount(d(20), d(20)))
    }

    @Test
    fun minAvailableAndAddRules() {
        val available = mapOf("2026-10-07" to 2, "2026-10-08" to 1, "2026-10-09" to 3, "2026-10-17" to 0)
        assertEquals(1, ProductCalendarLogic.minAvailable(d(7), d(9), available))
        assertEquals(2, ProductCalendarLogic.minAvailable(d(7), d(7), available))
        assertEquals(0, ProductCalendarLogic.minAvailable(d(9), d(17), available))
        assertEquals(listOf(YearMonth.of(2026, 10), YearMonth.of(2026, 11)), ProductCalendarLogic.months(d(30), d(2, 11)))

        val full = Range(d(7), d(9))
        assertFalse(ProductCalendarLogic.canAdd(Range(d(7), null), 2, false))
        assertTrue(ProductCalendarLogic.canAdd(full, 1, false))
        assertFalse(ProductCalendarLogic.canAdd(full, 0, false))
        assertTrue(ProductCalendarLogic.canAdd(full, 0, true))
        assertTrue(ProductCalendarLogic.showsOverlapNote(full, 0, true))
        assertFalse(ProductCalendarLogic.showsOverlapNote(full, 1, true))
        assertFalse(ProductCalendarLogic.showsOverlapNote(full, 0, false))
    }

    @Test
    fun ordersCoveringADayInVietnamDays() {
        val orders = listOf(
            // Giao T4 07/10 · trả T6 09/10 (Vietnam)
            order(1, "2026-10-07T02:00:00.000Z", "2026-10-09T02:00:00.000Z", quantities = mapOf(5 to 2)),
            // Same-day pickup and return on 08/10 still holds the day
            order(2, "2026-10-08T01:00:00.000Z", "2026-10-08T10:00:00.000Z", status = "PICKUPED"),
            // 17:30 UTC on the 7th is 00:30 on 08/10 in Vietnam: it holds from the 8th, not the 7th
            order(3, "2026-10-07T17:30:00.000Z", "2026-10-10T02:00:00.000Z"),
            // Done or cancelled orders hold nothing
            order(4, "2026-10-07T02:00:00.000Z", "2026-10-09T02:00:00.000Z", status = "RETURNED"),
            order(5, "2026-10-07T02:00:00.000Z", "2026-10-09T02:00:00.000Z", status = "CANCELLED"),
            // Ends before
            order(6, "2026-10-01T02:00:00.000Z", "2026-10-07T02:00:00.000Z"),
        )
        assertEquals(listOf(1, 3, 2), ProductCalendarLogic.ordersCovering(d(8), orders, vietnam).map { it.id })
        assertEquals(listOf(6, 1), ProductCalendarLogic.ordersCovering(d(7), orders, vietnam).map { it.id })
        assertEquals(listOf(3), ProductCalendarLogic.ordersCovering(d(10), orders, vietnam).map { it.id })
        assertEquals(emptyList<Int>(), ProductCalendarLogic.ordersCovering(d(11), orders, vietnam).map { it.id })

        assertEquals("Giao T4 07/10 · trả T6 09/10", ProductCalendarLogic.orderDates(orders[0], zone = vietnam))
        assertEquals(2, ProductCalendarLogic.quantity(orders[0], 5))
        assertEquals(1, ProductCalendarLogic.quantity(orders[1], 5))
    }
}
