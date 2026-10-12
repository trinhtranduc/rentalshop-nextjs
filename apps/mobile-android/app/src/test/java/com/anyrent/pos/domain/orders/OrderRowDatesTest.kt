package com.anyrent.pos.domain.orders

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** #496 — the two date lines of an order list row, in Vietnam civil days whatever the device zone */
class OrderRowDatesTest {
    private lateinit var saved: TimeZone

    /** The JVM zone must not matter: run under a zone far from Vietnam */
    @Before fun setUp() {
        saved = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
    }

    @After fun tearDown() = TimeZone.setDefault(saved)

    private fun i(s: String) = Instant.parse(s)

    private fun input(
        status: String,
        type: String = "RENT",
        created: String? = "2026-10-02T03:00:00Z", // 02/10/26
        pickup: String? = "2026-10-04T17:30:00Z", // 05/10/26 00:30 in Vietnam, still 04/10/26 in UTC
        returns: String? = "2026-10-07T02:00:00Z", // 07/10/26
        returned: String? = null,
        updated: String? = null,
        late: Boolean = false,
    ) = OrderRowDates.Input(
        code = "0053", orderType = type, status = status,
        createdAt = created?.let(::i), pickupPlanAt = pickup?.let(::i), returnPlanAt = returns?.let(::i),
        returnedAt = returned?.let(::i), updatedAt = updated?.let(::i), late = late,
    )

    @Test
    fun daysAreDayMonthYearWithoutWeekday() {
        val week = (5..11).map { OrderRowDates.day(LocalDate.of(2026, 10, it)) }
        assertEquals(listOf("05/10/26", "06/10/26", "07/10/26", "08/10/26", "09/10/26", "10/10/26", "11/10/26"), week)
        // 17:00 UTC on 10/10/26 is already 11/10/26 in Vietnam
        assertEquals("11/10/26", OrderRowDates.day(i("2026-10-10T17:00:00Z")))
        assertEquals("11/10/26", OrderRowDates.day(i("2026-10-10T17:00:00Z"), weekdays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")))
    }

    @Test
    fun reserved() {
        val lines = OrderRowDates.lines(input("RESERVED"))
        assertEquals("#0053 · tạo 02/10/26 10:00", lines.meta)
        assertEquals("Lấy 05/10/26 · trả 07/10/26", lines.task)
    }

    @Test
    fun pickedUpOnTimeAndLate() {
        assertEquals("Trả 07/10/26", OrderRowDates.lines(input("PICKUPED")).task)
        assertEquals("Hạn trả 07/10/26", OrderRowDates.lines(input("PICKUPED", late = true)).task)
        // Late never changes a reserved line (the no-show chip says it)
        assertEquals("Lấy 05/10/26 · trả 07/10/26", OrderRowDates.lines(input("RESERVED", late = true)).task)
    }

    @Test
    fun returnedSaleAndCancelled() {
        assertEquals("Đã trả 10/10/26", OrderRowDates.lines(input("RETURNED", returned = "2026-10-10T09:00:00Z")).task)
        assertEquals("Bán 02/10/26", OrderRowDates.lines(input("COMPLETED", type = "SALE", pickup = null, returns = null)).task)
        assertEquals("Huỷ 29/09/26", OrderRowDates.lines(input("CANCELLED", updated = "2026-09-29T04:00:00Z")).task)
        // A cancelled sale says "Huỷ", not "Bán"
        assertEquals("Huỷ 29/09/26", OrderRowDates.lines(input("CANCELLED", type = "SALE", updated = "2026-09-29T04:00:00Z")).task)
    }

    @Test
    fun missingDatesAreLeftOut() {
        assertEquals("#0053", OrderRowDates.lines(input("RESERVED", created = null)).meta)
        assertEquals("Lấy 05/10/26", OrderRowDates.lines(input("RESERVED", returns = null)).task)
        assertEquals("Trả 07/10/26", OrderRowDates.lines(input("RESERVED", pickup = null)).task)
        assertNull(OrderRowDates.lines(input("RESERVED", pickup = null, returns = null)).task)
        assertNull(OrderRowDates.lines(input("PICKUPED", returns = null)).task)
        assertNull(OrderRowDates.lines(input("RETURNED")).task)
        assertNull(OrderRowDates.lines(input("CANCELLED")).task)
        assertNull(OrderRowDates.lines(input("COMPLETED", type = "SALE", created = null)).task)
    }

    @Test
    fun englishTemplates() {
        val en = OrderRowDates.Texts(
            weekdays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"),
            created = "created %s", handOver = "Hand over %s", handOverReturn = "return %s",
        )
        val lines = OrderRowDates.lines(input("RESERVED"), en)
        assertEquals("#0053 · created 02/10/26 10:00", lines.meta)
        assertEquals("Hand over 05/10/26 · return 07/10/26", lines.task)
    }
}
