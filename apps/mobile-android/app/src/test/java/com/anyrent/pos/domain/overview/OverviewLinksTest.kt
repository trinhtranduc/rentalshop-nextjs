package com.anyrent.pos.domain.overview

import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #388 — overview "Trễ hạn" list */
class OverviewLinksTest {
    private val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")

    private fun rented(id: Int, returns: String) = OrderSummary(
        id = id, orderNumber = "$id", orderType = "RENT", status = "PICKUPED", totalAmount = 1.0, depositAmount = 0.0,
        customerName = null, customerPhone = null, pickupPlanAt = "2026-09-20T02:00:00.000Z", returnPlanAt = returns,
        createdAt = "2026-09-19T02:00:00.000Z", notes = null,
    )

    @Test
    fun latePageStopsAtFirstNotLate() {
        val now = Instant.parse("2026-10-03T05:00:00Z")
        val rows = listOf(
            rented(1, "2026-09-30T02:00:00.000Z"),
            rented(2, "2026-10-02T02:00:00.000Z"),
            rented(3, "2026-10-03T02:00:00.000Z"),
            rented(4, "2026-10-05T02:00:00.000Z"),
        )
        val (late, more) = OverviewLinks.latePage(rows, hasMore = true, now = now, zone = vietnam)
        assertEquals(listOf(1, 2), late.map { it.id })
        assertFalse(more)
        val (allLate, allMore) = OverviewLinks.latePage(rows.take(2), hasMore = true, now = now, zone = vietnam)
        assertEquals(2, allLate.size)
        assertTrue(allMore)
    }

    /** #434: the "New orders" card counts both types and later-cancelled orders; its list carries the card title */
    @Test
    fun newOrdersListHasTheCardTitle() {
        assertEquals(R.string.overview_v2_new_orders, OverviewLinks.listTitle(OverviewLinks.NEW))
        assertEquals(R.string.overview_v2_new_orders, OverviewLinks.listTitle("NEW"))
        assertEquals(R.string.overview_v2_rented_out, OverviewLinks.listTitle(OverviewLinks.RENTED))
        assertEquals(R.string.overview_v2_late_returns, OverviewLinks.listTitle(OverviewLinks.LATE))
        assertEquals(R.string.cancelled, OverviewLinks.listTitle("cancelled"))
        assertEquals(R.string.orders, OverviewLinks.listTitle("other"))
    }
}
