package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #388 — product detail strip, chips and rows */
class ProductDetailLogicTest {
    private val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
    private val utc = ZoneId.of("UTC")

    private fun order(
        id: Int = 1,
        status: String,
        type: String = "RENT",
        created: String = "2026-10-02T03:00:00.000Z",
        pickup: String? = "2026-10-04T02:00:00.000Z",
        returns: String? = "2026-10-05T02:00:00.000Z",
        quantities: Map<Int, Int> = mapOf(7 to 2, 8 to 1),
    ) = OrderSummary(
        id = id, orderNumber = "0057", orderType = type, status = status, totalAmount = 1.0, depositAmount = 0.0,
        customerName = "Minh", customerPhone = null, pickupPlanAt = pickup, returnPlanAt = returns, createdAt = created,
        notes = null, productQuantities = quantities,
    )

    @Test
    fun weekKeysCrossMonthEnd() {
        assertEquals(
            listOf("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"),
            ProductDetailLogic.weekKeys("2026-09-29"),
        )
        assertEquals(emptyList<String>(), ProductDetailLogic.weekKeys("bad"))
    }

    @Test
    fun stripTonesTodayAndMissingDays() {
        val strip = ProductDetailLogic.strip("2026-10-03", mapOf("2026-10-03" to 3, "2026-10-04" to 1, "2026-10-05" to 0, "2026-10-06" to -2))
        assertEquals(listOf("03", "04", "05", "06", "07", "08", "09"), strip.map { it.day })
        assertEquals(listOf(3, 1, 0, 0, 0, 0, 0), strip.map { it.free })
        assertEquals(FreeStripDay.Tone.OK, strip[0].tone)
        assertEquals(FreeStripDay.Tone.LOW, strip[1].tone)
        assertEquals(FreeStripDay.Tone.NONE, strip[2].tone)
        assertEquals(listOf("2026-10-03"), strip.filter { it.isToday }.map { it.key })
    }

    @Test
    fun chipStatusesAndSort() {
        assertEquals(listOf("RESERVED"), ProductOrdersChip.UPCOMING.statuses)
        assertEquals(listOf("PICKUPED"), ProductOrdersChip.RENTING.statuses)
        assertEquals(listOf("RETURNED", "COMPLETED"), ProductOrdersChip.DONE.statuses)
        assertFalse(ProductOrdersChip.entries.flatMap { it.statuses }.contains("CANCELLED"))
        assertEquals("pickupPlanAt" to "asc", ProductOrdersChip.UPCOMING.sortBy to ProductOrdersChip.UPCOMING.sortOrder)
        assertEquals("returnPlanAt" to "asc", ProductOrdersChip.RENTING.sortBy to ProductOrdersChip.RENTING.sortOrder)
        assertEquals("createdAt" to "desc", ProductOrdersChip.DONE.sortBy to ProductOrdersChip.DONE.sortOrder)
    }

    @Test
    fun mergeDoneNewestFirstWithoutDuplicates() {
        val returned = listOf(order(1, "RETURNED", created = "2026-09-01T03:00:00.000Z"), order(2, "RETURNED", created = "2026-09-20T03:00:00.000Z"))
        val completed = listOf(order(3, "COMPLETED", type = "SALE", created = "2026-09-10T03:00:00.000Z"), order(2, "RETURNED", created = "2026-09-20T03:00:00.000Z"))
        assertEquals(listOf(2, 3, 1), ProductDetailLogic.mergeDone(listOf(returned, completed)).map { it.id })
        assertEquals(listOf(2, 3), ProductDetailLogic.mergeDone(listOf(returned, completed), limit = 2).map { it.id })
    }

    @Test
    fun metaShowsDatesQuantityAndNumber() {
        val rent = order(status = "RESERVED", pickup = "2026-10-02T17:00:00.000Z", returns = "2026-10-04T17:00:00.000Z")
        assertEquals("03/10 → 05/10 · × 2 · #0057", ProductDetailLogic.meta(rent, 7, vietnam))
        assertEquals("03/10 → 05/10 · × 1 · #0057", ProductDetailLogic.meta(rent, 8, vietnam))
        assertEquals(1, ProductDetailLogic.quantity(9, rent))
        val sale = order(status = "COMPLETED", type = "SALE", created = "2026-09-30T18:00:00.000Z", pickup = null, returns = null)
        assertEquals("01/10 · × 2 · #0057", ProductDetailLogic.meta(sale, 7, vietnam))
        assertEquals("30/09 · × 2 · #0057", ProductDetailLogic.meta(sale, 7, utc))
    }

    @Test
    fun rowStatePerChip() {
        val now = Instant.parse("2026-10-03T05:00:00Z")
        val today = order(status = "RESERVED", pickup = "2026-10-03T00:00:00.000Z")
        assertEquals(ProductOrderRowState.PickupToday, ProductDetailLogic.rowState(today, ProductOrdersChip.UPCOMING, now, vietnam))
        val later = order(status = "RESERVED", pickup = "2026-10-05T02:00:00.000Z")
        assertEquals(ProductOrderRowState.PickupOn("05/10"), ProductDetailLogic.rowState(later, ProductOrdersChip.UPCOMING, now, vietnam))
        val noShow = order(status = "RESERVED", pickup = "2026-10-01T02:00:00.000Z")
        assertEquals(ProductOrderRowState.Late(2), ProductDetailLogic.rowState(noShow, ProductOrdersChip.UPCOMING, now, vietnam))
        // 02/10 18:00 UTC is 03/10 in Vietnam but 02/10 in UTC
        val edge = order(status = "PICKUPED", returns = "2026-10-02T18:00:00.000Z")
        assertEquals(ProductOrderRowState.ReturnToday, ProductDetailLogic.rowState(edge, ProductOrdersChip.RENTING, now, vietnam))
        assertEquals(ProductOrderRowState.Late(1), ProductDetailLogic.rowState(edge, ProductOrdersChip.RENTING, now, utc))
        val due = order(status = "PICKUPED", returns = "2026-10-07T02:00:00.000Z")
        assertEquals(ProductOrderRowState.ReturnOn("07/10"), ProductDetailLogic.rowState(due, ProductOrdersChip.RENTING, now, vietnam))
        assertEquals(ProductOrderRowState.Status, ProductDetailLogic.rowState(order(status = "RETURNED"), ProductOrdersChip.DONE, now, vietnam))
    }
}
