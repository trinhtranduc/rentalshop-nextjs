package com.anyrent.pos.domain.overview

import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #484 — "Đang cho thuê": late group first, both by return day, late = Vietnam civil day before today */
class RentedOutLogicTest {
    private fun order(id: Int, returns: String?, status: String = "PICKUPED", type: String = "RENT") = OrderSummary(
        id = id, orderNumber = "$id", orderType = type, status = status, totalAmount = 1.0, depositAmount = 0.0,
        customerName = null, customerPhone = null, pickupPlanAt = "2026-09-20T02:00:00.000Z", returnPlanAt = returns,
        createdAt = "2026-09-19T02:00:00.000Z", notes = null,
    )

    @Test
    fun groupsLateFirstSortedByReturn() {
        val now = Instant.parse("2026-10-03T05:00:00Z") // 12:00 on 3 Oct in Vietnam
        val groups = RentedOutLogic.groups(
            listOf(
                order(1, "2026-10-05T02:00:00.000Z"),
                order(2, "2026-10-02T02:00:00.000Z"),
                order(3, "2026-10-03T02:00:00.000Z"),
                order(4, "2026-09-30T02:00:00.000Z"),
                order(5, null),
                order(6, "2026-09-01T02:00:00.000Z", status = "RETURNED"),
                order(7, "2026-09-01T02:00:00.000Z", type = "SALE"),
                order(2, "2026-10-02T02:00:00.000Z"),
            ),
            now,
        )
        assertEquals(listOf(4, 2), groups.late.map { it.id })
        // Due today is not late; no return plan goes last
        assertEquals(listOf(3, 1, 5), groups.onTime.map { it.id })
        assertEquals(5, groups.total)
    }

    @Test
    fun vietnamMidnightBoundary() {
        // Return planned 2 Oct 16:59:59Z = 23:59:59 on 2 Oct in Vietnam
        val due = order(1, "2026-10-02T16:59:59Z")
        assertFalse(RentedOutLogic.isLate(due, Instant.parse("2026-10-02T16:59:59Z")))
        // 17:00:00Z is already 3 Oct in Vietnam (still 2 Oct in UTC): late
        assertTrue(RentedOutLogic.isLate(due, Instant.parse("2026-10-02T17:00:00Z")))
        // Return planned 17:00:00Z is 3 Oct in Vietnam: not late on that day
        assertFalse(RentedOutLogic.isLate(order(2, "2026-10-02T17:00:00Z"), Instant.parse("2026-10-03T16:59:59Z")))
        assertTrue(RentedOutLogic.isLate(order(2, "2026-10-02T17:00:00Z"), Instant.parse("2026-10-03T17:00:00Z")))
    }

    @Test
    fun monthAndYearEdges() {
        assertTrue(RentedOutLogic.isLate(order(1, "2026-12-31T10:00:00Z"), Instant.parse("2027-01-01T01:00:00Z")))
        assertFalse(RentedOutLogic.isLate(order(2, "2027-12-31T10:00:00Z"), Instant.parse("2027-01-01T01:00:00Z")))
        assertTrue(RentedOutLogic.isLate(order(3, "2026-09-30T10:00:00Z"), Instant.parse("2026-10-01T00:00:00Z")))
        assertFalse(RentedOutLogic.isLate(order(4, "garbage"), Instant.parse("2026-10-01T00:00:00Z")))
    }
}
