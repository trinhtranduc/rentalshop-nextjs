package com.anyrent.pos.domain.availability

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate
import java.util.TimeZone

/** #518 cart warnings (boards GH-trung-bat, GH-trung-tat): which lines are double-booked, on which Vietnam days */
class OverlapWarningsTest {
    private lateinit var saved: TimeZone

    @Before fun setUp() {
        saved = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
    }

    @After fun tearDown() = TimeZone.setDefault(saved)

    private val pickup = LocalDate.of(2026, 10, 3)
    private val ret = LocalDate.of(2026, 10, 5)

    private fun holder(number: String?, pickupAt: String?, returnAt: String?, quantity: Int = 1) =
        AvailabilityConflict(null, number, quantity, pickupAt, returnAt, "RESERVED", "")

    private fun availability(available: Int, ok: Boolean, vararg holders: AvailabilityConflict) = ProductAvailability(
        productId = 4, productName = "Vest đen slim fit", totalStock = 1, totalRenting = 0,
        effectivelyAvailable = available, requestedQuantity = 1, isAvailable = ok,
        conflicts = holders.toList(), orders = emptyList(), message = null,
    )

    @Test fun boardLines() {
        // Other order #482113 holds the vest 02/10 (VN) → 06/10 (VN): the cart's 03–05/10 are all booked out
        val c = OverlapWarnings.conflict(
            4, "Vest đen slim fit", 1,
            availability(0, false, holder("482113", "2026-10-01T17:00:00.000Z", "2026-10-05T17:00:00.000Z")),
            pickup, ret,
        )
        assertNotNull(c)
        c!!
        assertEquals(LocalDate.of(2026, 10, 3), c.from)
        assertEquals(LocalDate.of(2026, 10, 5), c.to)
        assertEquals(1, c.missing)
        assertEquals("Hết đồ 03–05/10 · đã thuê ở đơn #482113", OverlapWarnings.cartLine(c))
        assertEquals("Vest đen slim fit thiếu 1 bộ ngày 03–05/10 (đã thuê ở #482113).", OverlapWarnings.confirmLine(c))
    }

    @Test fun daysAreTheOverlapInVietnamDays() {
        // 16:59:59Z is still 04/10 in Vietnam, 17:00Z on 04/10 is already 05/10
        val endsOn04 = OverlapWarnings.conflict(
            4, "Vest", 1, availability(0, false, holder("A", "2026-09-30T00:00:00Z", "2026-10-04T16:59:59Z")), pickup, ret,
        )!!
        assertEquals("03–04/10", OverlapWarnings.dayRange(endsOn04.from, endsOn04.to))
        val startsOn05 = OverlapWarnings.conflict(
            4, "Vest", 1, availability(0, false, holder("B", "2026-10-04T17:00:00Z", "2026-10-08T05:00:00Z")), pickup, ret,
        )!!
        assertEquals("05/10", OverlapWarnings.dayRange(startsOn05.from, startsOn05.to))
    }

    @Test fun shortOfStockWithoutOtherOrdersIsNotADoubleBooking() {
        assertNull(OverlapWarnings.conflict(4, "Vest", 2, availability(0, false), pickup, ret))
        assertNull(OverlapWarnings.conflict(4, "Vest", 1, availability(3, true, holder("A", null, null)), pickup, ret))
        assertNull(OverlapWarnings.conflict(4, "Vest", 1, null, pickup, ret))
    }

    @Test fun missingCountAndManyOrders() {
        val c = OverlapWarnings.conflict(
            4, "Áo dài", 3,
            availability(1, false, holder("1", null, null), holder("2", "bad", ""), holder("3", null, null), holder("1", null, null)),
            pickup, ret,
        )!!
        assertEquals(2, c.missing)
        // Unknown days fall back to the cart's range
        assertEquals(pickup, c.from)
        assertEquals(ret, c.to)
        assertEquals("Hết đồ 03–05/10 · đã thuê ở đơn #1, #2 +1", OverlapWarnings.cartLine(c))
        val noNumber = OverlapWarnings.conflict(4, "Áo dài", 1, availability(-2, false, holder(null, null, null)), pickup, ret)!!
        assertEquals(1 + 0, noNumber.missing)
        assertEquals("Hết đồ 03–05/10", OverlapWarnings.cartLine(noNumber))
        assertEquals("Áo dài thiếu 1 bộ ngày 03–05/10.", OverlapWarnings.confirmLine(noNumber))
    }

    @Test fun rangesAcrossMonthAndYear() {
        assertEquals("28/09–02/10", OverlapWarnings.dayRange(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 2)))
        assertEquals("30/12–02/01", OverlapWarnings.dayRange(LocalDate.of(2026, 12, 30), LocalDate.of(2027, 1, 2)))
        assertEquals("03/10", OverlapWarnings.dayRange(pickup, pickup))
        // A year-long rental keeps the order holder's window
        val c = OverlapWarnings.conflict(
            4, "Vest", 1, availability(0, false, holder("9", "2027-02-01T00:00:00Z", "2027-02-10T00:00:00Z")),
            LocalDate.of(2026, 10, 1), LocalDate.of(2027, 9, 30),
        )!!
        assertEquals("01–10/02", OverlapWarnings.dayRange(c.from, c.to))
    }

    @Test fun settingDecidesButtonAndSheet() {
        val c = listOf(OverlapWarnings.LineConflict(1, "Vest", 1, pickup, ret, listOf("1")))
        assertTrue(OverlapWarnings.warnsOnConfirm(true, c))
        assertFalse(OverlapWarnings.blocksCreate(true, c))
        assertTrue(OverlapWarnings.blocksCreate(false, c))
        assertFalse(OverlapWarnings.warnsOnConfirm(false, c))
        assertFalse(OverlapWarnings.blocksCreate(false, emptyList()))
        assertFalse(OverlapWarnings.warnsOnConfirm(true, emptyList()))
    }

    @Test fun orderRefs() {
        assertEquals("#482113", OverlapWarnings.orderRefs(listOf("482113")))
        assertEquals("#ORD-1-0001, #2", OverlapWarnings.orderRefs(listOf("#ORD-1-0001", "2")))
    }
}
