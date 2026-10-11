package com.anyrent.pos.print

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #700 — Tạo đơn prints only when a bill printer IP is saved */
class CreatedOrderAutoPrintTest {
    @Test
    fun printsOnlyWithASavedPrinter() {
        assertFalse(CreatedOrderAutoPrint.shouldPrint(null))
        assertFalse(CreatedOrderAutoPrint.shouldPrint(""))
        assertFalse(CreatedOrderAutoPrint.shouldPrint("  "))
        assertTrue(CreatedOrderAutoPrint.shouldPrint("192.168.1.50"))
    }
}
