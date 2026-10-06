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
        created: String? = "2026-10-02T03:00:00Z", // Fri 02/10
        pickup: String? = "2026-10-04T17:30:00Z", // Mon 05/10 00:30 in Vietnam, still Sun 04/10 in UTC
        returns: String? = "2026-10-07T02:00:00Z", // Wed 07/10
        returned: String? = null,
        updated: String? = null,
        late: Boolean = false,
    ) = OrderRowDates.Input(
        code = "0053", orderType = type, status = status,
        createdAt = created?.let(::i), pickupPlanAt = pickup?.let(::i), returnPlanAt = returns?.let(::i),
        returnedAt = returned?.let(::i), updatedAt = updated?.let(::i), late = late,
    )

    @Test
    fun weekdayShortNamesMondayToSunday() {
        val week = (5..11).map { OrderRowDates.day(LocalDate.of(2026, 10, it)) }
        assertEquals(listOf("T2 05/10", "T3 06/10", "T4 07/10", "T5 08/10", "T6 09/10", "T7 10/10", "CN 11/10"), week)
        // 17:00 UTC on Sat 10/10 is already Sun 11/10 in Vietnam
        assertEquals("CN 11/10", OrderRowDates.day(i("2026-10-10T17:00:00Z")))
        assertEquals("Sun 11/10", OrderRowDates.day(i("2026-10-10T17:00:00Z"), weekdays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")))
    }

    @Test
    fun reserved() {
        val lines = OrderRowDates.lines(input("RESERVED"))
        assertEquals("#0053 · tạo T6 02/10", lines.meta)
        assertEquals("Giao T2 05/10 · trả T4 07/10", lines.task)
    }

    @Test
    fun pickedUpOnTimeAndLate() {
        assertEquals("Trả T4 07/10", OrderRowDates.lines(input("PICKUPED")).task)
        assertEquals("Hạn trả T4 07/10", OrderRowDates.lines(input("PICKUPED", late = true)).task)
        // Late never changes a reserved line (the no-show chip says it)
        assertEquals("Giao T2 05/10 · trả T4 07/10", OrderRowDates.lines(input("RESERVED", late = true)).task)
    }

    @Test
    fun returnedSaleAndCancelled() {
        assertEquals("Đã trả T7 10/10", OrderRowDates.lines(input("RETURNED", returned = "2026-10-10T09:00:00Z")).task)
        assertEquals("Bán T6 02/10", OrderRowDates.lines(input("COMPLETED", type = "SALE", pickup = null, returns = null)).task)
        assertEquals("Huỷ T3 29/09", OrderRowDates.lines(input("CANCELLED", updated = "2026-09-29T04:00:00Z")).task)
        // A cancelled sale says "Huỷ", not "Bán"
        assertEquals("Huỷ T3 29/09", OrderRowDates.lines(input("CANCELLED", type = "SALE", updated = "2026-09-29T04:00:00Z")).task)
    }

    @Test
    fun missingDatesAreLeftOut() {
        assertEquals("#0053", OrderRowDates.lines(input("RESERVED", created = null)).meta)
        assertEquals("Giao T2 05/10", OrderRowDates.lines(input("RESERVED", returns = null)).task)
        assertEquals("Trả T4 07/10", OrderRowDates.lines(input("RESERVED", pickup = null)).task)
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
        assertEquals("#0053 · created Fri 02/10", lines.meta)
        assertEquals("Hand over Mon 05/10 · return Wed 07/10", lines.task)
    }
}
