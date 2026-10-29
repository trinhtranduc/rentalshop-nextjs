package com.anyrent.pos.domain.print

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.print.ThermalPrinter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1308: the bill's note and bank QR come from the order's own outlet (server), not from the device */
class OutletPrintSettingsTest {
    private fun order(note: String?, qr: Boolean?, type: String = "RENT") = OrderDetail(
        summary = OrderSummary(
            id = 7, orderNumber = "123456", orderType = type, status = "RESERVED",
            totalAmount = 148_000.0, depositAmount = 0.0, customerName = "Lan", customerPhone = null,
            pickupPlanAt = "2026-10-05T03:00:00.000Z", returnPlanAt = "2026-10-06T03:00:00.000Z",
            createdAt = "2026-10-05T03:00:00.000Z", notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Ao dai", quantity = 1, unitPrice = 148_000.0, totalPrice = 148_000.0)),
        customerId = 1,
        payments = emptyList(),
        outletId = 5,
        outletPrintNote = note,
        outletPrintBankQr = qr,
    )

    private val device = ThermalPrinter.Config(ip = "", note = "DEVICE NOTE", printBankQr = true)

    @Test
    fun noteIsTheServerNoteAndBlankMeansNone() {
        assertEquals("Mang CCCD", OutletPrintSettings.note("Mang CCCD"))
        assertNull(OutletPrintSettings.note(null))
        assertNull(OutletPrintSettings.note(""))
        assertNull(OutletPrintSettings.note("  \n "))
    }

    @Test
    fun qrFollowsTheOutletSwitch() {
        assertTrue(OutletPrintSettings.printsBankQr(true))
        assertFalse(OutletPrintSettings.printsBankQr(false))
        assertFalse(OutletPrintSettings.printsBankQr(null))
    }

    @Test
    fun billConfigUsesTheOrdersOutletNotTheDevice() {
        val cfg = ThermalPrinter.receiptConfig(device, order("Server note", false))
        assertEquals("Server note", cfg.note)
        assertFalse(cfg.printBankQr)
        assertTrue(ThermalPrinter.receiptConfig(device.copy(printBankQr = false), order("x", true)).printBankQr)
    }

    @Test
    fun deviceNoteIsNotPrintedAndBlankServerNoteDropsTheBlock() {
        val withNote = String(ThermalPrinter.buildOrderReceipt(ThermalPrinter.receiptConfig(device, order("Server note", null)), order("Server note", null)))
        assertTrue(withNote.contains("Server note"))
        assertFalse(withNote.contains("DEVICE NOTE"))
        val none = String(ThermalPrinter.buildOrderReceipt(ThermalPrinter.receiptConfig(device, order(null, null)), order(null, null)))
        assertFalse(none.contains("DEVICE NOTE"))
        assertFalse(none.contains("Note"))
        assertTrue(none.contains("Customer Signature"))
    }

    @Test
    fun onlyOwnerAndOutletAdminEdit() {
        assertTrue(OutletPrintSettings.canEdit("MERCHANT"))
        assertTrue(OutletPrintSettings.canEdit("OUTLET_ADMIN"))
        assertFalse(OutletPrintSettings.canEdit("OUTLET_STAFF"))
        assertFalse(OutletPrintSettings.canEdit("OUTLET_INVENTORY"))
        assertFalse(OutletPrintSettings.canEdit(null))
    }

    @Test
    fun ownerGetsTheOldDeviceNoteWhenTheServerHasNone() {
        assertEquals("Cũ", OutletPrintSettings.prefillNote(null, "Cũ", canEdit = true))
        assertEquals("Cũ", OutletPrintSettings.prefillNote(" ", "Cũ", canEdit = true))
    }

    @Test
    fun serverNoteWinsAndStaffNeverSeeTheDeviceNote() {
        assertEquals("Máy chủ", OutletPrintSettings.prefillNote("Máy chủ", "Cũ", canEdit = true))
        assertEquals("", OutletPrintSettings.prefillNote(null, "Cũ", canEdit = false))
        assertEquals("", OutletPrintSettings.prefillNote(null, null, canEdit = true))
        assertEquals("", OutletPrintSettings.prefillNote(null, "  ", canEdit = true))
    }

    @Test
    fun branchOwnThenCurrentThenDefaultThenFirst() {
        val list = listOf(1 to false, 2 to true, 3 to false)
        assertEquals(3, OutletPrintSettings.initialOutletId(own = 3, current = 1, outlets = list))
        assertEquals(1, OutletPrintSettings.initialOutletId(own = null, current = 1, outlets = list))
        assertEquals(2, OutletPrintSettings.initialOutletId(own = null, current = 9, outlets = list))
        assertEquals(5, OutletPrintSettings.initialOutletId(null, null, listOf(5 to false, 6 to false)))
        assertNull(OutletPrintSettings.initialOutletId(null, null, emptyList()))
    }
}
