package com.anyrent.pos.domain.deposit

import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.OrderShareModel
import com.anyrent.pos.domain.orders.ShareMoney
import com.anyrent.pos.domain.orders.ShareShop
import com.anyrent.pos.domain.orders.ShareText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #1252 the staged-deposit block of the printed bill and of the share image (iOS `DepositPlanReceipt`) */
class DepositReceiptTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", null, null)
    private val today = "2026-10-07"

    /** 30% collected 26/10 (00:30 Vietnam time), 40% due today, a void stage, the rest at hand-over */
    private val stages = listOf(
        OrderInstallment("i1", "Giữ chỗ", 30.0, 300_000.0, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-25T17:30:00.000Z", paidAmount = 300_000.0, remaining = 0.0),
        OrderInstallment("i2", "Chốt mẫu", 40.0, 400_000.0, dueDateKey = "2026-10-07", status = "DUE_TODAY"),
        OrderInstallment("i3", "Huỷ", 5.0, 50_000.0, dueDateKey = "2026-10-08", status = "VOID"),
        OrderInstallment("rest", "rest", 30.0, 300_000.0, dueDateKey = "2026-10-16", status = "UPCOMING"),
    )
    private val summary = InstallmentSummary(planned = 1_000_000.0, collected = 300_000.0, remaining = 700_000.0, percentCollected = 30.0)

    private fun order(plan: DepositPlanInfo?, type: String = "RENT") = OrderDetail(
        summary = OrderSummary(
            id = 1, orderNumber = "482113", orderType = type, status = "RESERVED", totalAmount = 1_000_000.0, depositAmount = 300_000.0,
            customerName = "Mai", customerPhone = null, pickupPlanAt = "2026-10-06T17:00:00.000Z", returnPlanAt = "2026-10-16T16:59:59.000Z",
            createdAt = "2026-10-05T07:30:00.000Z", notes = null,
        ),
        items = listOf(OrderItem(id = null, productId = 1, productName = "Váy", quantity = 1, unitPrice = 1_000_000.0, totalPrice = 1_000_000.0)),
        customerId = 1,
        payments = emptyList(),
        deposit = plan,
    )

    private fun text(t: ShareText?): String = when (t) {
        null -> ""
        is ShareText.Plain -> t.text
        is ShareText.Res -> "${t.id}:" + t.args.joinToString("|") { if (it is ShareText) text(it) else it.toString() }
        is ShareText.Plural -> "${t.id}#${t.count}"
    }

    @Test
    fun listsStagesWithTheVietnamDayAndDropsAVoidStage() {
        val block = DepositReceipt.block(true, true, stages, summary, today, vn)!!
        assertEquals(listOf("1. Giữ chỗ", "2. Chốt mẫu", "${R.string.deposit_rest_label}:"), block.stages.map { text(it.title) })
        assertEquals(listOf(300_000.0, 400_000.0, 300_000.0), block.stages.map { it.amount })
        assertEquals("${R.string.deposit_card_paid_detail}:30|26/10", text(block.stages[0].detail))
        assertEquals("${R.string.deposit_status_paid}:", text(block.stages[0].status))
        assertEquals("${R.string.deposit_card_due_detail}:40|07/10", text(block.stages[1].detail))
        assertEquals("${R.string.deposit_status_today}:", text(block.stages[1].status))
        assertNull(block.stages[2].detail)
        assertEquals(300_000.0, block.collected, 0.0)
        assertEquals(700_000.0, block.remaining, 0.0)
    }

    @Test
    fun lateStageSaysHowManyDaysAndTotalsAddUpWithoutASummary() {
        val late = listOf(OrderInstallment("i1", "Giữ chỗ", 50.0, 500_000.0, dueDateKey = "2026-10-04", status = "OVERDUE"))
        val block = DepositReceipt.block(true, true, late, null, today, vn)!!
        assertEquals("${R.string.deposit_status_late}:3", text(block.stages[0].status))
        assertEquals(0.0, block.collected, 0.0)
        assertEquals(500_000.0, block.remaining, 0.0)
    }

    @Test
    fun noBlockForOneTimeDepositSaleOrMissingStages() {
        assertNull(DepositReceipt.block(true, null, stages, summary, today, vn))
        assertNull(DepositReceipt.block(true, false, stages, summary, today, vn))
        assertNull(DepositReceipt.block(false, true, stages, summary, today, vn))
        assertNull(DepositReceipt.block(true, true, emptyList(), summary, today, vn))
        assertNull(DepositReceipt.block(true, true, null, null, today, vn))
    }

    @Test
    fun shareImageShowsStagesInsteadOfTheSingleDepositRow() {
        // #1345: the image lists the explicit stages (no "rest" line, no Đã thu / Còn phải thu); OrderShareMoneyOrderTest has the order
        fun stagesOf(m: OrderShareModel) = m.money.filterIsInstance<ShareMoney.Stages>()
        fun hasDepositRow(m: OrderShareModel) = m.money.any { it is ShareMoney.Row && (it.row.label as? ShareText.Res)?.id == R.string.share_deposit_paid }
        val plan = DepositPlanInfo(installments = stages, summary = summary, hasPlan = true)
        val now = Instant.parse("2026-10-07T03:00:00Z")
        val with = OrderShareModel.from(order(plan), shop, vi = true, zone = vn, now = now)
        assertEquals(2, stagesOf(with).single().stages.size)
        assertFalse(hasDepositRow(with))

        val without = OrderShareModel.from(order(null), shop, vi = true, zone = vn, now = now)
        assertTrue(stagesOf(without).isEmpty())
        assertTrue(hasDepositRow(without))
        // stages without hasDepositPlan, and a sale: nothing
        assertTrue(stagesOf(OrderShareModel.from(order(plan.copy(hasPlan = false)), shop, vi = true, zone = vn, now = now)).isEmpty())
        assertTrue(stagesOf(OrderShareModel.from(order(plan, type = "SALE"), shop, vi = true, zone = vn, now = now)).isEmpty())
    }

    @Test
    fun blockLineNamesTheBlock() {
        val item = OrderItem(id = null, productId = 1, productName = "Áo dài", quantity = 1, unitPrice = 160_000.0, totalPrice = 160_000.0)
        val base = order(null).copy(items = listOf(item))
        val m = OrderShareModel.from(base, shop, vi = true, zone = vn, blockFormula = { "120.000 (3 ngày) + 2 × 20.000 = 160.000" }, blockSummary = { "Khối 3 ngày + 2 ngày thêm" })
        assertEquals("Khối 3 ngày + 2 ngày thêm", m.lines[0].quantity)
        assertEquals("120.000 (3 ngày) + 2 × 20.000 = 160.000", m.lines[0].formula)
        assertEquals("1 × ${OrderShareModel.money(160_000.0)}", OrderShareModel.from(base, shop, vi = true, zone = vn).lines[0].quantity)
    }
}
