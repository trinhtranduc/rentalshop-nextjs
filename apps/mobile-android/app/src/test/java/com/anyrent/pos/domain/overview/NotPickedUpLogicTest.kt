package com.anyrent.pos.domain.overview

import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #496 — "Chưa lấy đồ": RESERVED rent orders split at the start of today's Vietnam civil day */
class NotPickedUpLogicTest {
    private fun order(id: Int, pickup: String?, status: String = "RESERVED", type: String = "RENT") = OrderSummary(
        id = id, orderNumber = "ORD-1-$id", orderType = type, status = status, totalAmount = 500000.0, depositAmount = 0.0,
        customerName = "Lan", customerPhone = null, pickupPlanAt = pickup, returnPlanAt = null, createdAt = null, notes = null,
    )

    // 06/10 01:00 in Vietnam, still 05/10 in UTC
    private val now = Instant.parse("2026-10-05T18:00:00Z")

    @Test
    fun splitAtTheStartOfTheVietnamDay() {
        val orders = listOf(
            order(1, "2026-10-08T02:00:00Z"),
            order(2, "2026-10-05T16:59:00Z"), // 05/10 23:59 in Vietnam: yesterday, overdue
            order(3, "2026-10-05T17:00:00Z"), // 06/10 00:00 in Vietnam: today, not overdue
            order(4, "2026-10-01T02:00:00Z"),
            order(5, null),
            order(6, "2026-10-01T02:00:00Z", status = "PICKUPED"),
            order(7, "2026-10-01T02:00:00Z", type = "SALE"),
            order(4, "2026-10-01T02:00:00Z"),
        )
        val groups = NotPickedUpLogic.groups(orders, now)
        assertEquals(listOf(4, 2), groups.overdue.map { it.id })
        assertEquals("by pickup ascending, no pickup day last", listOf(3, 1, 5), groups.upcoming.map { it.id })
        assertEquals(5, groups.total)
    }

    @Test
    fun overdueDaysAreCivilDays() {
        assertEquals(5, NotPickedUpLogic.overdueDays(order(1, "2026-10-01T02:00:00Z"), now))
        assertEquals(1, NotPickedUpLogic.overdueDays(order(2, "2026-10-05T16:59:00Z"), now))
        assertEquals(0, NotPickedUpLogic.overdueDays(order(3, "2026-10-05T17:00:00Z"), now))
        assertEquals(0, NotPickedUpLogic.overdueDays(order(4, "2026-10-09T02:00:00Z"), now))
        assertEquals(0, NotPickedUpLogic.overdueDays(order(5, null), now))
        // Another zone gives other days; the default is Vietnam whatever the device says
        assertEquals(0, NotPickedUpLogic.overdueDays(order(2, "2026-10-05T16:59:00Z"), now, ZoneId.of("UTC")))
    }

    @Test
    fun onlyReservedRentOrders() {
        assertFalse(NotPickedUpLogic.isNotPickedUp(order(1, null, status = "PICKUPED")))
        assertFalse(NotPickedUpLogic.isNotPickedUp(order(1, null, type = "SALE")))
    }
}
