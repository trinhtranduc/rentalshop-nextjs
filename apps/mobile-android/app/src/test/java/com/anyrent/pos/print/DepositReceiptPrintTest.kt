package com.anyrent.pos.print

import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.deposit.DepositPlanInfo
import com.anyrent.pos.domain.deposit.InstallmentSummary
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.orders.ShareText
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1252 the thermal bill lists the deposit stages after the total; a one-time deposit prints as before */
class DepositReceiptPrintTest {
    private val config = ThermalPrinter.Config(ip = "")
    private val stages = listOf(
        OrderInstallment("i1", "Giữ chỗ", 30.0, 300_000.0, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-25T17:30:00.000Z", paidAmount = 300_000.0, remaining = 0.0),
        OrderInstallment("i2", "Chốt mẫu", 40.0, 400_000.0, dueDateKey = "2026-10-28", status = "UPCOMING"),
        OrderInstallment("rest", "rest", 30.0, 300_000.0, dueDateKey = "2026-11-01", status = "UPCOMING"),
    )
    private val plan = DepositPlanInfo(stages, InstallmentSummary(1_000_000.0, 300_000.0, 700_000.0, 30.0), hasPlan = true)

    private fun order(deposit: DepositPlanInfo?) = OrderDetail(
        summary = OrderSummary(
            id = 7, orderNumber = "123456", orderType = "RENT", status = "RESERVED", totalAmount = 1_000_000.0, depositAmount = 300_000.0,
            customerName = "Lan", customerPhone = null, pickupPlanAt = "2026-10-05T03:00:00.000Z", returnPlanAt = "2026-10-06T03:00:00.000Z",
            createdAt = "2026-10-05T03:00:00.000Z", notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Áo dài", quantity = 1, unitPrice = 1_000_000.0, totalPrice = 1_000_000.0)),
        customerId = 1,
        payments = emptyList(),
        deposit = deposit,
    )

    /** Ids stand in for the strings (a plain JVM test has no resources) */
    private val words: (ShareText) -> String = { t ->
        when (t) {
            is ShareText.Plain -> t.text
            is ShareText.Res -> "R${t.id}" + t.args.joinToString("", "[", "]") { a -> if (a is ShareText) "" else a.toString() }.let { if (t.args.isEmpty()) "" else it }
            is ShareText.Plural -> "P${t.id}"
        }
    }

    private fun text(bytes: ByteArray) = String(bytes, Charsets.UTF_8)

    @Test
    fun printsStagesAfterTheTotalWithPaidAndRemaining() {
        val bill = text(ThermalPrinter.buildOrderReceipt(config, order(plan), planText = words))
        assertTrue(bill, bill.contains("1. Giu cho: 300.000"))
        assertTrue(bill, bill.contains("2. Chot mau: 400.000"))
        assertTrue(bill, bill.contains("R${R.string.deposit_rest_label}: 300.000"))
        assertTrue(bill, bill.contains("R${R.string.deposit_card_collected}: 300.000"))
        assertTrue(bill, bill.contains("R${R.string.deposit_card_remaining}: 700.000"))
        assertTrue("after the total", bill.indexOf("TOTAL:") < bill.indexOf("1. Giu cho"))
        assertTrue("before the signature block", bill.indexOf("1. Giu cho") < bill.indexOf("Customer Signature"))
    }

    @Test
    fun oneTimeDepositPrintsAsBefore() {
        val before = ThermalPrinter.buildOrderReceipt(config, order(null), planText = words)
        assertArrayEquals(before, ThermalPrinter.buildOrderReceipt(config, order(plan.copy(hasPlan = false)), planText = words))
        assertArrayEquals(before, ThermalPrinter.buildOrderReceipt(config, order(plan), planText = null))
        assertFalse(text(before).contains("Giu cho"))
    }
}
