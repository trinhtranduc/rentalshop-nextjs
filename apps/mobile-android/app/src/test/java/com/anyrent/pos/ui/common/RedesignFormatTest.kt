package com.anyrent.pos.ui.common

import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import com.anyrent.pos.domain.DayText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #370 — day labels in the device time zone, status labels for unknown values; #399 — money without a currency symbol */
class RedesignFormatTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val tokyo = ZoneId.of("Asia/Tokyo")
    private val vi = Locale("vi")

    /** #888 (owner): every single day in the app reads dd/mm/yy, no weekday, in any language (iOS `DayFormatter`) */
    @Test
    fun `short day is dd mm yy of the zone`() {
        assertEquals("02/10/26", formatDayShort(Instant.parse("2026-10-02T16:59:59Z"), vn, vi))
        assertEquals("03/10/26", formatDayShort(Instant.parse("2026-10-02T17:00:00Z"), vn, vi))
        assertEquals("04/10/26", formatDayShort(Instant.parse("2026-10-03T16:00:00Z"), tokyo, vi))
        assertEquals("03/10/26", formatDayShort(Instant.parse("2026-10-03T05:00:00Z"), vn, Locale.ENGLISH))
        assertEquals("01/01/27", formatDayShort(Instant.parse("2026-12-31T17:00:00Z")))
        assertEquals("01/01/27", DayText.dmy(java.time.LocalDate.of(2027, 1, 1)))
        assertEquals("2026-10-04", dayKey(Instant.parse("2026-10-03T16:00:00Z"), tokyo))
    }

    /** #888 (owner): a day with a time reads "05/10/26 14:30" (Vietnam day and clock) */
    @Test
    fun `day and time`() {
        assertEquals("05/10/26 14:30", DayText.dmyTime(Instant.parse("2026-10-05T07:30:00Z"), vn))
        assertEquals("06/10/26 00:00", DayText.dmyTime(Instant.parse("2026-10-05T17:00:00Z"), vn))
        assertEquals("06/10/26 00:00", DayText.dmyTime(Instant.parse("2026-10-05T17:00:00Z")))
    }

    @Test
    fun `money uses dot grouping and no currency symbol`() {
        assertEquals("1.150.000", formatMoneyVnd(1_150_000.0))
        assertEquals("0", formatMoneyVnd(0.0))
        assertEquals("−50.000", formatMoneyVnd(-50_000.0))
        assertEquals("−1.150.000", formatMoneyVnd(-1_150_000.0))
        assertEquals("1.234.567.890", formatMoneyVnd(1_234_567_890.0))
        assertEquals("999", formatMoneyVnd(999.0))
        assertEquals("1.000", formatMoneyVnd(1_000.4))
        assertEquals("0", formatMoneyVnd(-0.4))
    }

    @Test
    fun `unknown statuses have no label and a neutral color`() {
        assertNull(OrderStatusStyle.labelRes("ON_HOLD"))
        assertEquals(OrderStatusStyle.UnknownStatusColor, OrderStatusStyle.badgeColor("ON_HOLD"))
    }
}
