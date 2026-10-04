package com.anyrent.pos.ui.common

import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #370 — day labels in the device time zone, Vietnamese money, status labels for unknown values */
class RedesignFormatTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val tokyo = ZoneId.of("Asia/Tokyo")
    private val vi = Locale("vi")

    @Test
    fun `short day in Vietnamese follows the device zone`() {
        assertEquals("T6 02/10", formatDayShort(Instant.parse("2026-10-02T16:59:59Z"), vn, vi))
        assertEquals("T7 03/10", formatDayShort(Instant.parse("2026-10-02T17:00:00Z"), vn, vi))
        assertEquals("CN 04/10", formatDayShort(Instant.parse("2026-10-03T16:00:00Z"), tokyo, vi))
        assertEquals("Sat 03/10", formatDayShort(Instant.parse("2026-10-03T05:00:00Z"), vn, Locale.ENGLISH))
        assertEquals("2026-10-04", dayKey(Instant.parse("2026-10-03T16:00:00Z"), tokyo))
    }

    @Test
    fun `money uses dot grouping and the dong sign`() {
        assertEquals("1.150.000đ", formatMoneyVnd(1_150_000.0))
        assertEquals("0đ", formatMoneyVnd(0.0))
        assertEquals("−50.000đ", formatMoneyVnd(-50_000.0))
    }

    @Test
    fun `unknown statuses have no label and a neutral color`() {
        assertNull(OrderStatusStyle.labelRes("ON_HOLD"))
        assertEquals(OrderStatusStyle.UnknownStatusColor, OrderStatusStyle.badgeColor("ON_HOLD"))
    }
}
