package com.anyrent.pos.ui.common

import org.junit.Assert.assertEquals
import org.junit.Test

/** #1067 (iOS testKeypadFirstKeyReplacesTheOpeningValue): the first key replaces the opening value, then keys append */
class NumericPadEntryTest {
    private fun type(start: String, vararg keys: String): String {
        var entry = NumericPadEntry(start)
        keys.forEach { entry = entry.press(it) }
        return entry.text
    }

    @Test
    fun firstKeyReplacesTheOpeningValue() {
        assertEquals("7", type("50000", "7"))
        assertEquals("77", type("50000", "7", "7"))
        assertEquals("77000", type("50000", "7", "7", "000"))
        assertEquals("7700", type("50000", "7", "7", "000", "⌫"))
    }

    @Test
    fun backspaceClearsTheOpeningValue() {
        assertEquals("0", type("50000", "⌫"))
        assertEquals("5", type("50000", "⌫", "5"))
    }

    @Test
    fun zeroStartsAsBefore() {
        assertEquals("0", type("0", "000"))
        assertEquals("4", type("0", "000", "4"))
        assertEquals("0", type("0", "4", "⌫"))
        assertEquals("0", type("50000", "000"))
    }

    @Test
    fun stillCappedAtTwelveDigits() {
        assertEquals("123456789012", type("0", "1234567890", "1", "2", "3", "4"))
    }
}
