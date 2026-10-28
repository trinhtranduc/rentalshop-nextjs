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

    private fun bar(type: String, status: String, manage: Boolean = true, canExtend: Boolean = false) =
        OrderActionSheet.onScreen(OrderDetailLogic.actions(type, status, manage, true), isSale = type == "SALE", canExtend = canExtend)

    @Test fun secondaryBottomButtonIsAlwaysPrint() {
        // #930: In + Giao đồ / In + Nhận trả; Sửa đơn and Gia hạn move into the sheet
        assertEquals(setOf(Action.PRINT), bar("RENT", "RESERVED"))
        assertEquals(setOf(Action.PRINT), bar("RENT", "RESERVED", manage = false))
        assertEquals(setOf(Action.PRINT), bar("RENT", "PICKUPED", canExtend = true))
        assertEquals(setOf(Action.PRINT), bar("RENT", "PICKUPED"))
        assertEquals(setOf(Action.PRINT), bar("RENT", "RETURNED"))
        assertEquals(setOf(Action.PRINT), bar("RENT", "CANCELLED"))
        assertEquals(setOf(Action.CANCEL, Action.PRINT), bar("SALE", "COMPLETED"))
        assertEquals(setOf(Action.PRINT), bar("SALE", "COMPLETED", manage = false))
    }

    @Test fun reservedRentalBoard() {
        // Bottom bar: In + Giao đồ → the sheet (iOS order): Share, Notes, Edit, History, red Huỷ đơn
        val r = rows("RENT", "RESERVED")
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.EDIT, Action.HISTORY), r.main)
        assertEquals(listOf(Action.CANCEL), r.danger)
    }

    @Test fun staffSheetHasNoHistory() {
        // #670: OUTLET_STAFF cannot read change history
        for (type in listOf("RENT", "SALE")) for (status in listOf("RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED")) {
            val r = OrderActionSheet.rows(OrderDetailLogic.actions(type, status, false, false), isSale = type == "SALE", canExtend = false, canViewHistory = false)
            assertTrue("$type $status", Action.HISTORY !in r.main)
        }
        val r = OrderActionSheet.rows(OrderDetailLogic.actions("RENT", "RESERVED", false, false), isSale = false, canExtend = false, canViewHistory = false)
        assertEquals(listOf(Action.SHARE, Action.NOTES), r.main)
    }

    @Test fun reservedRentalWithoutEditRightGetsNoEditAnywhere() {
        val r = rows("RENT", "RESERVED", manage = false)
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.HISTORY), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun pickedUpRentalWithExtendInTheSheet() {
        val r = rows("RENT", "PICKUPED", canExtend = true)
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.EXTEND, Action.HISTORY), r.main)
        assertEquals(listOf(Action.CANCEL), r.danger)
    }

    @Test fun pickedUpRentalWithoutExtendButtonStaysWithoutExtend() {
        val r = rows("RENT", "PICKED_UP", canExtend = false)
        assertTrue(Action.EXTEND !in r.main)
    }

    @Test fun finishedOrdersPrintAtTheBottom() {
        val returned = rows("RENT", "RETURNED")
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.HISTORY), returned.main)
        assertTrue(returned.danger.isEmpty())
        val cancelled = rows("RENT", "CANCELLED")
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.HISTORY), cancelled.main)
        assertEquals(listOf(Action.DELETE), cancelled.danger)
        assertTrue(rows("RENT", "CANCELLED", deleteCancelled = false).danger.isEmpty())
    }

    @Test fun completedSaleHasCancelAndPrintOnScreen() {
        // Bar: Huỷ đơn + In hoá đơn; Sửa đơn is not on the bar, so the sheet offers it
        val r = rows("SALE", "COMPLETED")
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.EDIT, Action.HISTORY), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun saleWithoutManageRightPrintsAtTheBottom() {
        val r = rows("SALE", "COMPLETED", manage = false)
        assertEquals(listOf(Action.SHARE, Action.NOTES, Action.HISTORY), r.main)
        assertTrue(r.danger.isEmpty())
    }

    @Test fun notesSubtitle() {
        assertEquals("Có 1 ghi chú · 2 ảnh", OrderActionSheet.notesSubtitle("khách lấy thêm cà vạt", 2))
        assertEquals("Có 1 ghi chú", OrderActionSheet.notesSubtitle("x", 0))
        assertEquals("Có 3 ảnh", OrderActionSheet.notesSubtitle("  ", 3))
        assertEquals("Thêm ghi chú hoặc ảnh cho đơn", OrderActionSheet.notesSubtitle(null, 0))
    }

    @Test fun printerSubtitle() {
        assertEquals("Máy in 192.168.1.199", OrderActionSheet.printerSubtitle("", "192.168.1.199"))
        assertEquals("Máy in Quầy", OrderActionSheet.printerSubtitle("Quầy", "192.168.1.199"))
        assertNull(OrderActionSheet.printerSubtitle(" ", null))
    }
}
