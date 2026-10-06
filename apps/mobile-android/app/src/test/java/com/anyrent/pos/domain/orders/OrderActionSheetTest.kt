package com.anyrent.pos.domain.orders

import com.anyrent.pos.domain.orders.OrderActionSheet.Action
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #519 ⋯ sheet of the order detail (board CT-thao-tac): never repeat a button that is already on the screen */
class OrderActionSheetTest {
    private fun rows(type: String, status: String, manage: Boolean = true, deleteCancelled: Boolean = true, canExtend: Boolean = false) =
        OrderActionSheet.rows(
            OrderDetailLogic.actions(type, status, manage, deleteCancelled),
            isSale = type == "SALE",
            canExtend = canExtend,
        )

    @Test fun reservedRentalBoard() {
        // Bottom bar: Sửa đơn + Giao đồ → the sheet has Print, Notes, History (+ Share), red Huỷ đơn
        val r = rows("RENT", "RESERVED")
        assertEquals(listOf(Action.PRINT, Action.NOTES, Action.HISTORY, Action.SHARE), r.main)
        assertEquals(listOf(Action.CANCEL), r.danger)
    }

    @Test fun reservedRentalWithoutEditRightGetsNoEditAnywhere() {
        val r = rows("RENT", "RESERVED", manage = false)
        assertEquals(listOf(Action.PRINT, Action.NOTES, Action.HISTORY, Action.SHARE), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun pickedUpRentalWithExtendOnScreen() {
        val r = rows("RENT", "PICKUPED", canExtend = true)
        assertEquals(listOf(Action.PRINT, Action.NOTES, Action.HISTORY, Action.SHARE), r.main)
        assertEquals(listOf(Action.CANCEL), r.danger)
    }

    @Test fun pickedUpRentalWithoutExtendButtonStaysWithoutExtend() {
        val r = rows("RENT", "PICKED_UP", canExtend = false)
        assertTrue(Action.EXTEND !in r.main)
    }

    @Test fun finishedOrdersPrintAtTheBottom() {
        val returned = rows("RENT", "RETURNED")
        assertEquals(listOf(Action.NOTES, Action.HISTORY, Action.SHARE), returned.main)
        assertTrue(returned.danger.isEmpty())
        val cancelled = rows("RENT", "CANCELLED")
        assertEquals(listOf(Action.NOTES, Action.HISTORY, Action.SHARE), cancelled.main)
        assertEquals(listOf(Action.DELETE), cancelled.danger)
        assertTrue(rows("RENT", "CANCELLED", deleteCancelled = false).danger.isEmpty())
    }

    @Test fun completedSaleHasCancelAndPrintOnScreen() {
        // Bar: Huỷ đơn + In hoá đơn; Sửa đơn is not on the bar, so the sheet offers it
        val r = rows("SALE", "COMPLETED")
        assertEquals(listOf(Action.NOTES, Action.HISTORY, Action.EDIT, Action.SHARE), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun saleWithoutManageRightPrintsAtTheBottom() {
        val r = rows("SALE", "COMPLETED", manage = false)
        assertEquals(listOf(Action.NOTES, Action.HISTORY, Action.SHARE), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun notesSubtitle() {
        assertEquals("Có 1 ghi chú · 2 ảnh", OrderActionSheet.notesSubtitle("khách lấy thêm cà vạt", 2))
        assertEquals("Có 1 ghi chú", OrderActionSheet.notesSubtitle("x", 0))
        assertEquals("Có 3 ảnh", OrderActionSheet.notesSubtitle("  ", 3))
        assertEquals("Thêm ghi chú", OrderActionSheet.notesSubtitle(null, 0))
    }

    @Test fun printerSubtitle() {
        assertEquals("Máy in 192.168.1.199", OrderActionSheet.printerSubtitle("", "192.168.1.199"))
        assertEquals("Máy in Quầy", OrderActionSheet.printerSubtitle("Quầy", "192.168.1.199"))
        assertNull(OrderActionSheet.printerSubtitle(" ", null))
    }
}
