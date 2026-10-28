package com.anyrent.pos.domain.products

import org.junit.Assert.assertEquals
import org.junit.Test

/** #1162 — quantity from the shared number pad */
class QuantityEntryTest {
    @Test
    fun keepsAWholeNumber() {
        assertEquals(20, QuantityEntry.fromPad(20.0, 0))
        assertEquals(0, QuantityEntry.fromPad(0.0, 0))
    }

    @Test
    fun clampsBelowTheMinimumAndAboveTheCap() {
        assertEquals(1, QuantityEntry.fromPad(0.0, 1))
        assertEquals(QuantityEntry.maximum, QuantityEntry.fromPad(10_000.0, 0))
        assertEquals(QuantityEntry.maximum, QuantityEntry.fromPad(1_000_000.0, 0))
    }
}
