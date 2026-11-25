package com.anyrent.pos.domain.orders

import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.deposit.DepositPlanInfo
import com.anyrent.pos.domain.deposit.InstallmentSummary
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.print.ThermalPrinter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.Instant

/**
 * #1633 the "Khi nhận trả" / "Đã huỷ" block of every bill: cases A–H of `.agent/changes/1633-bill-return-fees/spec.md`
 * (iOS `BillReturnRuleTests`, same expected lines). Labels are read from the real `strings.xml`.
 */
class BillReturnRuleTest {
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", "0901 234 567", "45 Võ Văn Tần, Quận 3, TP.HCM")
    private val now = Instant.parse("2026-10-17T07:00:00Z")

    private val names: Map<Int, String> =
        R.string::class.java.fields.filter { it.type == Int::class.javaPrimitiveType }.associate { it.getInt(null) to it.name }

    private fun table(dir: String): Map<String, String> {
        val xml = File("src/main/res/$dir/strings.xml").readText()
        return Regex("""<string name="([^"]+)"[^>]*>(.*?)</string>""", RegexOption.DOT_MATCHES_ALL).findAll(xml)
            .associate { it.groupValues[1] to it.groupValues[2].replace("\\'", "'").replace("&amp;", "&") }
    }

    private val vi = table("values-vi")
    private val en = table("values")
    private fun word(id: Int, english: Boolean = false) = (if (english) en else vi).getValue(names.getValue(id))

    private fun block(
        status: String = "RETURNED", total: Double = 500_000.0, deposit: Double = 200_000.0, collateral: Double = 0.0,
        late: Double = 0.0, surcharge: Double = 0.0, kept: Double? = null, hasPlan: Boolean = false, collected: Double? = null,
        type: String = "RENT", draft: Boolean = false,
    ) = BillReturnRule.block(type, draft, status, total, deposit, collateral, late, surcharge, kept, hasPlan, collected)

    private fun rows(b: BillReturnRule.Block?, english: Boolean = false): List<String> =
        if (b == null) emptyList()
        else listOf(word(b.title, english)) + b.rows.map { "${word(it.label, english)} ${it.amount.toLong()}" } +
            "${word(b.resultLabel, english)} ${b.result.toLong()}"

    @Test fun caseANoFeeNoBlock() = assertNull(block())

    @Test fun caseBFeesBelowCollateralGiveBack() {
        val b = block(collateral = 1_000_000.0, late = 100_000.0, surcharge = 50_000.0)
        assertEquals(listOf("Khi nhận trả", "Thế chân 1000000", "Phí trễ 100000", "Phụ thu 50000", "Trả khách 850000"), rows(b))
        assertTrue(b!!.givesBack)
    }

    @Test fun caseCNoCollateralCollect() {
        val b = block(surcharge = 150_000.0)
        assertEquals(listOf("Khi nhận trả", "Phụ thu 150000", "Thu thêm 150000"), rows(b))
        assertFalse(b!!.givesBack)
    }

    @Test fun caseDFeesAboveCollateralCollect() = assertEquals(
        listOf("Khi nhận trả", "Thế chân 100000", "Phí trễ 100000", "Phụ thu 200000", "Thu thêm 200000"),
        rows(block(collateral = 100_000.0, late = 100_000.0, surcharge = 200_000.0)),
    )

    @Test fun caseEExcessDepositIsGivenBack() = assertEquals(
        listOf("Khi nhận trả", "Cọc dư 200000", "Phụ thu 50000", "Trả khách 150000"),
        rows(block(total = 300_000.0, deposit = 500_000.0, surcharge = 50_000.0)),
    )

    @Test fun caseFFeesEqualCollateralGiveBackZero() {
        val b = block(collateral = 300_000.0, surcharge = 300_000.0)
        assertEquals(listOf("Khi nhận trả", "Thế chân 300000", "Phụ thu 300000", "Trả khách 0"), rows(b))
        assertEquals("never −0", 0, b!!.result.compareTo(0.0))
    }

    @Test fun caseGCollateralWithoutFeeNoBlock() = assertNull(block(collateral = 1_000_000.0))

    @Test fun caseHCancelledKeptRefundsTheRest() {
        assertEquals(listOf("Đã huỷ", "Phụ thu 100000", "Hoàn cho khách 200000"),
            rows(block(status = "CANCELLED", deposit = 300_000.0, kept = 100_000.0)))
        // a plan: what the stages collected, as the order detail (#1491)
        assertEquals(listOf("Đã huỷ", "Phụ thu 100000", "Hoàn cho khách 150000"),
            rows(block(status = "CANCELLED", deposit = 0.0, kept = 100_000.0, hasPlan = true, collected = 250_000.0)))
        assertNull("nothing kept: no block", block(status = "CANCELLED", deposit = 300_000.0, kept = 0.0))
        assertNull("a cancelled order's fees are not a return", block(status = "CANCELLED", surcharge = 50_000.0))
    }

    @Test fun saleAndDraftNeverHaveTheBlock() {
        assertNull(block(type = "SALE", surcharge = 50_000.0))
        assertNull(block(draft = true, surcharge = 50_000.0))
    }

    @Test fun englishWords() {
        assertEquals(listOf("At return", "Security deposit 1000000", "Late fee 100000", "Surcharge 50000", "Give back 850000"),
            rows(block(collateral = 1_000_000.0, late = 100_000.0, surcharge = 50_000.0), english = true))
        assertEquals(listOf("Cancelled", "Surcharge 100000", "Refund to customer 200000"),
            rows(block(status = "CANCELLED", deposit = 300_000.0, kept = 100_000.0), english = true))
    }

    @Test fun everyLanguageHasTheNewWords() {
        val dirs = File("src/main/res").listFiles { f -> f.isDirectory && f.name.startsWith("values") && File(f, "strings.xml").exists() }!!
            .map { it.name }.filter { it != "values-night" }
        for (dir in dirs) {
            val t = table(dir)
            for (key in listOf("bill_return_title", "bill_return_excess_deposit", "bill_return_give_back")) {
                assertTrue("$dir $key", !t[key].isNullOrBlank())
            }
        }
    }

    // ---- share image and printed bill of an order ------------------------------------------------------------------

    private fun order(
        status: String = "RETURNED", collateral: Double = 0.0, late: Double = 0.0, surcharge: Double = 0.0,
        kept: Double? = null, deposit: DepositPlanInfo? = null,
    ) = OrderDetail(
        summary = OrderSummary(
            id = 7, orderNumber = "720001", orderType = "RENT", status = status, totalAmount = 500_000.0, depositAmount = 200_000.0,
            customerName = "Chị Mai", customerPhone = null, pickupPlanAt = "2026-10-15T03:00:00.000Z",
            returnPlanAt = "2026-10-17T03:00:00.000Z", createdAt = "2026-10-12T07:30:00.000Z", notes = null, cancelKeptAmount = kept,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Áo dài trắng thêu", quantity = 1, unitPrice = 500_000.0, totalPrice = 500_000.0)),
        customerId = 1, payments = emptyList(), securityDeposit = collateral, lateFee = late, damageFee = surcharge, deposit = deposit,
    )

    private fun flat(o: OrderDetail): List<String> =
        OrderShareModel.from(o, shop, vi = true, now = now, currency = ShopCurrency.VND).money.mapNotNull { entry ->
            when (entry) {
                is ShareMoney.Row -> "${word((entry.row.label as ShareText.Res).id)}|${entry.row.value}"
                is ShareMoney.Heading -> "HEADING ${word((entry.title as ShareText.Res).id)}"
                is ShareMoney.GiveBack -> "GIVEBACK ${word((entry.label as ShareText.Res).id)}|${entry.value}"
                is ShareMoney.Collect -> "COLLECT ${word((entry.label as ShareText.Res).id)}|${entry.value}"
                else -> null
            }
        }

    @Test fun imageCaseBEndsWithTheReturnBlock() = assertEquals(
        listOf("HEADING Khi nhận trả", "Thế chân|1.000.000đ", "Phí trễ|100.000đ", "Phụ thu|50.000đ", "GIVEBACK Trả khách|850.000đ"),
        flat(order(collateral = 1_000_000.0, late = 100_000.0, surcharge = 50_000.0)).takeLast(5),
    )

    @Test fun imageCaseCCollectsInTheCollectBox() = assertEquals(
        listOf("HEADING Khi nhận trả", "Phụ thu|150.000đ", "COLLECT Thu thêm|150.000đ"),
        flat(order(surcharge = 150_000.0)).takeLast(3),
    )

    @Test fun imageWithoutFeesIsUnchanged() {
        for ((collateral, status) in listOf(0.0 to "RETURNED", 1_000_000.0 to "RETURNED", 1_000_000.0 to "PICKUPED")) {
            val lines = flat(order(status = status, collateral = collateral))
            assertFalse("$collateral $status: $lines", lines.any { it.startsWith("HEADING") })
        }
    }

    @Test fun imageCaseHCancelled() = assertEquals(
        listOf("HEADING Đã huỷ", "Phụ thu|100.000đ", "GIVEBACK Hoàn cho khách|100.000đ"),
        flat(order(status = "CANCELLED", kept = 100_000.0)).takeLast(3),
    )

    @Test fun imageCaseHWithAPlanRefundsWhatTheStagesCollected() {
        val stages = listOf(OrderInstallment("i1", "Giữ chỗ", 50.0, 250_000.0, dueDateKey = "2026-10-12", status = "PAID", paidAmount = 250_000.0, remaining = 0.0))
        val plan = DepositPlanInfo(stages, InstallmentSummary(250_000.0, 250_000.0, 0.0, 50.0), hasPlan = true)
        assertEquals("GIVEBACK Hoàn cho khách|150.000đ", flat(order(status = "CANCELLED", kept = 100_000.0, deposit = plan)).last())
    }

    /** Ids stand in for the strings, as `DepositReceiptPrintTest` */
    private val ids: (ShareText) -> String = { t -> if (t is ShareText.Res) "R${t.id}" else (t as? ShareText.Plain)?.text.orEmpty() }

    @Test fun printedBillCaseBAfterTheTotal() {
        val bill = String(ThermalPrinter.buildOrderReceipt(ThermalPrinter.Config(ip = ""),
            order(collateral = 1_000_000.0, late = 100_000.0, surcharge = 50_000.0), planText = ids), Charsets.UTF_8)
        assertTrue(bill, bill.contains("R${R.string.bill_return_title}"))
        assertTrue(bill, bill.contains("R${R.string.detail_collateral_money_row}: 1.000.000"))
        assertTrue(bill, bill.contains("R${R.string.detail_late_fee}: 100.000"))
        assertTrue(bill, bill.contains("R${R.string.surcharge}: 50.000"))
        assertTrue(bill, bill.contains("R${R.string.bill_return_give_back}: 850.000"))
        assertTrue("after the total", bill.indexOf("TOTAL:") < bill.indexOf("R${R.string.bill_return_title}"))
        assertTrue("before the signature block", bill.indexOf("R${R.string.bill_return_title}") < bill.indexOf("Customer Signature"))
    }

    @Test fun printedBillWithoutFeesIsUnchanged() {
        val config = ThermalPrinter.Config(ip = "")
        val withCollateral = String(ThermalPrinter.buildOrderReceipt(config, order(collateral = 1_000_000.0), planText = ids), Charsets.UTF_8)
        assertFalse(withCollateral.contains("R${R.string.bill_return_title}"))
    }
}
