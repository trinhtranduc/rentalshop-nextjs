package com.anyrent.pos.print

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.bank.OutletBankAccount
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** #622 — bill bytes with the bank QR switch: off → unchanged, no account → unchanged, on → block + ESC/POS QR */
class BankQrReceiptTest {
    private val vcb = OutletBankAccount(
        id = 1, bankName = "Vietcombank", accountNumber = "0123456789", accountHolderName = "Nguyễn Văn A",
        bankCode = "VCB", isDefault = true,
    )
    private val vcbPayload = "00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN63046A15"

    private fun order(type: String) = OrderDetail(
        summary = OrderSummary(
            id = 7, orderNumber = "123456", orderType = type, status = if (type == "RENT") "RESERVED" else "COMPLETED",
            totalAmount = 148_000.0, depositAmount = 0.0, customerName = "Lan", customerPhone = null,
            pickupPlanAt = "2026-10-05T03:00:00.000Z", returnPlanAt = "2026-10-06T03:00:00.000Z",
            createdAt = "2026-10-05T03:00:00.000Z", notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Áo dài", quantity = 1, unitPrice = 148_000.0, totalPrice = 148_000.0)),
        customerId = 1,
        payments = emptyList(),
        outletId = 5,
    )

    private val off = ThermalPrinter.Config(ip = "", printBankQr = false)
    private val on = off.copy(printBankQr = true, bankTitle = "CHUYỂN KHOẢN", bankAccountLabel = "STK: %1\$s")

    private fun ByteArray.indexOf(part: ByteArray): Int =
        (0..size - part.size).firstOrNull { start -> part.indices.all { this[start + it] == part[it] } } ?: -1

    @Test
    fun switchOffKeepsBillBytesIdentical() {
        for (type in listOf("RENT", "SALE")) {
            val before = ThermalPrinter.buildOrderReceipt(off, order(type))
            assertArrayEquals(type, before, ThermalPrinter.billBytes(off, order(type), vcb))
            assertEquals(type, -1, before.indexOf("QRIBFTTA".toByteArray()))
            assertEquals(type, -1, before.indexOf(byteArrayOf(0x1D, 0x28, 0x6B)))
        }
    }

    @Test
    fun noAccountPrintsBillAsBefore() {
        for (type in listOf("RENT", "SALE")) {
            assertArrayEquals(type, ThermalPrinter.buildOrderReceipt(on, order(type)), ThermalPrinter.billBytes(on, order(type), null))
        }
    }

    @Test
    fun switchOnAddsBankBlockAndQrBeforeThankYou() {
        for (type in listOf("RENT", "SALE")) {
            val bytes = ThermalPrinter.billBytes(on, order(type), vcb)
            val qr = bytes.indexOf(ThermalPrinter.escPosQr(vcbPayload))
            assertTrue(type, qr > 0)
            assertTrue(type, bytes.indexOf("CHUYỂN KHOẢN".toByteArray()) in 0 until qr)
            assertTrue(type, bytes.indexOf("STK: 0123456789".toByteArray()) in 0 until qr)
            assertTrue("holder in capitals", bytes.indexOf("NGUYỄN VĂN A".toByteArray()) in 0 until qr)
            assertTrue("QR before the thank-you line", qr < bytes.indexOf("THANK YOU FOR SHOPPING".toByteArray()))
        }
    }

    @Test
    fun bankWithoutBinPrintsTextOnly() {
        val odd = vcb.copy(bankName = "Ngân hàng Lạ", bankCode = null)
        val bytes = ThermalPrinter.billBytes(on, order("SALE"), odd)
        assertTrue(bytes.indexOf("0123456789".toByteArray()) > 0)
        assertEquals(-1, bytes.indexOf(byteArrayOf(0x1D, 0x28, 0x6B)))
    }

    @Test
    fun qrCommandStoresPayloadWithLength() {
        val bytes = ThermalPrinter.escPosQr(vcbPayload)
        val length = vcbPayload.length + 3
        assertArrayEquals("model 2", byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00), bytes.copyOfRange(0, 9))
        assertArrayEquals("module size 6", byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06), bytes.copyOfRange(9, 17))
        assertArrayEquals("level M", byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31), bytes.copyOfRange(17, 25))
        assertArrayEquals(
            byteArrayOf(0x1D, 0x28, 0x6B, (length and 0xFF).toByte(), (length shr 8).toByte(), 0x31, 0x50, 0x30),
            bytes.copyOfRange(25, 33),
        )
        assertArrayEquals(vcbPayload.toByteArray(), bytes.copyOfRange(33, 33 + vcbPayload.length))
        assertArrayEquals("print", byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30), bytes.copyOfRange(bytes.size - 8, bytes.size))
    }

    @Test
    fun accountIsLoadedOnlyWhenTheSwitchIsOn() {
        val asked = mutableListOf<Int>()
        // Blank IP: the send fails after the lookup, so nothing goes over the network
        ThermalPrinter.printOrder(off, order("SALE")) { asked += it; vcb }
        assertEquals(emptyList<Int>(), asked)
        ThermalPrinter.printOrder(on, order("SALE")) { asked += it; vcb }
        assertEquals(listOf(5), asked)
    }

    @Test
    fun failingLookupStillPrints() {
        // The lookup throws: printOrder goes on to send (and fails only on the blank IP)
        val result = ThermalPrinter.printOrder(on, order("RENT")) { error("network down") }
        assertEquals(ThermalPrinter.Result.Failure("Printer IP required"), result)
    }
}
