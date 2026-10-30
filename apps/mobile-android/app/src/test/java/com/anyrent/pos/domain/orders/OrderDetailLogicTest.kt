package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.ui.orders.v2.shortDay
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.time.ZoneId

/** #372 — order detail: actions per status, API money rule, notes payload, status errors */
class OrderDetailLogicTest {
    private fun actions(type: String, status: String, manage: Boolean = true, delete: Boolean = true) =
        OrderDetailLogic.actions(type, status, manage, delete)

    /** #482 step "Đã đặt": shop time and day, the year only when not the current year (iOS parity) */
    @Test
    fun `created stamp is day month year and time in shop time`() {
        val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
        val now = java.time.Instant.parse("2026-10-05T03:00:00Z")
        assertEquals("28/09/26 14:32", OrderDetailLogic.createdStamp("2026-09-28T07:32:00Z", now, vietnam))
        assertEquals("28/12/25 14:32", OrderDetailLogic.createdStamp("2025-12-28T07:32:00Z", now, vietnam))
        assertEquals("28/09/26 23:59", OrderDetailLogic.createdStamp("2026-09-28T16:59:59Z", now, vietnam))
        assertEquals("29/09/26 00:00", OrderDetailLogic.createdStamp("2026-09-28T17:00:00Z", now, vietnam))
        assertEquals(
            "01/01/26 00:30",
            OrderDetailLogic.createdStamp("2025-12-31T17:30:00Z", java.time.Instant.parse("2026-01-02T03:00:00Z"), vietnam),
        )
        // Default zone is the shop zone, whatever the device zone
        assertEquals("28/09/26 14:32", OrderDetailLogic.createdStamp("2026-09-28T07:32:00Z", now))
        assertEquals("—", OrderDetailLogic.createdStamp(null, now))
    }

    @Test
    fun `rent reserved hands over, can edit and cancel`() {
        val a = actions("RENT", "RESERVED")
        assertEquals(DetailPrimary.HAND_OVER, a.primary)
        assertTrue(a.canEdit)
        assertTrue(a.canCancel)
        assertFalse(a.canDelete)
        assertTrue(a.canPrint)
    }

    @Test
    fun `rent picked up takes the return, can cancel but not edit`() {
        val a = actions("RENT", "PICKUPED")
        assertEquals(DetailPrimary.TAKE_RETURN, a.primary)
        assertFalse(a.canEdit)
        assertTrue(a.canCancel)
    }

    @Test
    fun `returned and cancelled rent only print, cancelled can be deleted`() {
        val returned = actions("RENT", "RETURNED")
        assertEquals(DetailPrimary.NONE, returned.primary)
        assertFalse(returned.canCancel || returned.canEdit || returned.canDelete)
        val cancelled = actions("RENT", "CANCELLED")
        assertEquals(DetailPrimary.NONE, cancelled.primary)
        assertFalse(cancelled.canCancel)
        assertTrue(cancelled.canDelete)
        assertFalse(actions("RENT", "CANCELLED", delete = false).canDelete)
    }

    @Test
    fun `sale has no primary, completed can be edited and cancelled`() {
        val completed = actions("SALE", "COMPLETED")
        assertEquals(DetailPrimary.NONE, completed.primary)
        assertTrue(completed.canEdit)
        assertTrue(completed.canCancel)
        val reserved = actions("SALE", "RESERVED")
        assertFalse(reserved.canEdit)
        assertTrue(reserved.canCancel)
        assertFalse(actions("SALE", "CANCELLED").canCancel)
    }

    @Test
    fun `staff without manage permission cannot edit or cancel`() {
        val a = actions("RENT", "RESERVED", manage = false, delete = false)
        assertEquals(DetailPrimary.HAND_OVER, a.primary)
        assertFalse(a.canEdit)
        assertFalse(a.canCancel)
    }

    @Test
    fun `hand-over collects total minus deposit plus collateral minus pickup payments`() {
        val payments = listOf(
            BalancePayment(100_000.0, "COMPLETED", "PICKUP"),
            BalancePayment(50_000.0, "FAILED", "PICKUP"),
            BalancePayment(70_000.0, "COMPLETED", "DEPOSIT"),
        )
        val m = OrderDetailLogic.handOver(1_000_000.0, 300_000.0, 500_000.0, payments)
        assertEquals(100_000.0, m.paidBefore, 0.0)
        assertEquals(1_100_000.0, m.collectNow, 0.0)
        assertEquals(0.0, OrderDetailLogic.handOver(100.0, 300.0, 0.0, emptyList()).collectNow, 0.0)
    }

    @Test
    fun `return refunds collateral above the fees and collects the rest`() {
        val refund = OrderDetailLogic.returnMoney(150_000.0, 50_000.0, 500_000.0, emptyList())
        assertEquals(-300_000.0, refund.net, 0.0)
        assertEquals(300_000.0, refund.refund, 0.0)
        assertEquals(0.0, refund.collect, 0.0)

        val collect = OrderDetailLogic.returnMoney(
            200_000.0, 0.0, 0.0, listOf(BalancePayment(50_000.0, "COMPLETED", "RETURN_ADJUSTMENT")),
        )
        assertEquals(150_000.0, collect.collect, 0.0)
        assertEquals(50_000.0, collect.settledBefore, 0.0)
    }

    @Test
    fun `balance matches computeOrderBalance by type and status`() {
        fun b(type: String, status: String) = OrderDetailLogic.balance(
            type, status, 1_000.0, 300.0, 200.0, 50.0, 0.0,
            listOf(BalancePayment(400.0, "COMPLETED", "SALE")),
        )
        assertEquals(OrderBalance(600.0, 0.0), b("SALE", "COMPLETED"))
        assertEquals(OrderBalance(900.0, 0.0), b("RENT", "RESERVED"))
        assertEquals(OrderBalance(0.0, 150.0), b("RENT", "PICKUPED"))
        assertEquals(OrderBalance(0.0, 0.0), b("RENT", "RETURNED"))
        assertEquals(OrderBalance(0.0, 0.0), b("RENT", "CANCELLED"))
    }

    @Test
    fun `notes with removed photos send kept urls as json then new files as multipart`() {
        val steps = OrderDetailLogic.notesPlan("hi", listOf("a", "b", "c"), listOf("a", "c"), 2)
        assertEquals(
            listOf(NotesStep.Json("hi", listOf("a", "c")), NotesStep.Upload(null, 2)),
            steps,
        )
        assertEquals(
            listOf(NotesStep.Json("hi", emptyList())),
            OrderDetailLogic.notesPlan("hi", listOf("a"), emptyList(), 0),
        )
    }

    @Test
    fun `notes with only new files or only text use one request`() {
        assertEquals(
            listOf(NotesStep.Upload("hi", 1)),
            OrderDetailLogic.notesPlan("hi", listOf("a"), listOf("a"), 1),
        )
        assertEquals(
            listOf(NotesStep.Json("hi", null)),
            OrderDetailLogic.notesPlan("hi", listOf("a"), listOf("a"), 0),
        )
    }

    @Test
    fun `notes reject more than five photos or unknown urls`() {
        assertNull(OrderDetailLogic.notesPlan("", listOf("a", "b", "c"), listOf("a", "b", "c"), 3))
        assertEquals(
            listOf(NotesStep.Upload("", 2)),
            OrderDetailLogic.notesPlan("", listOf("a", "b", "c"), listOf("a", "b", "c"), 2),
        )
        assertNull(OrderDetailLogic.notesPlan("", listOf("a"), listOf("x"), 0))
        assertEquals(5, OrderDetailLogic.MAX_NOTE_PHOTOS)
    }

    @Test
    fun `invalid order status shows the message and reloads`() {
        val outcome = OrderDetailLogic.statusError(
            AppError.Http(400, "This status change is not allowed for this order.", "INVALID_ORDER_STATUS"),
        )
        assertEquals("INVALID_ORDER_STATUS", outcome.code)
        assertTrue(outcome.reload)
        assertTrue(OrderDetailLogic.statusError(AppError.Http(409, "Conflict")).reload)
        assertTrue(OrderDetailLogic.statusError(AppError.InvalidResponse("x", code = "INVALID_ORDER_STATUS")).reload)
    }

    @Test
    fun `network and server errors show the message without reload`() {
        assertFalse(OrderDetailLogic.statusError(AppError.Http(500, "boom")).reload)
        val network = OrderDetailLogic.statusError(IOException("connect timeout"))
        assertFalse(network.reload)
        assertEquals("connect timeout", network.message)
    }

    private fun rent(
        status: String,
        pickedUpAt: String? = null,
        returnedAt: String? = null,
    ) = OrderSummary(
        id = 746120, orderNumber = "ORD-001-0746", orderType = "RENT", status = status, totalAmount = 100.0,
        depositAmount = 0.0, customerName = null, customerPhone = null,
        pickupPlanAt = "2026-10-02T17:00:00.000Z", returnPlanAt = "2026-10-07T17:00:00.000Z",
        createdAt = "2026-10-01T03:00:00.000Z", notes = null,
        pickedUpAt = pickedUpAt, returnedAt = returnedAt,
    )

    /** #434: a returned order shows the day it came back (iOS `returnedAt ?? returnPlanAt`), not the plan */
    @Test
    fun `returned order step bar shows the actual return day`() {
        val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
        // 18:30Z on 04/10 is 01:30 on 05/10 in Vietnam; the plan is 08/10
        val days = OrderDetailLogic.progressDays(
            rent("RETURNED", pickedUpAt = "2026-10-03T16:59:59.000Z", returnedAt = "2026-10-04T18:30:00.000Z"),
        )
        assertEquals("05/10/26", shortDay(days.returned, vietnam))
        assertEquals("03/10/26", shortDay(days.handOver, vietnam))
        assertEquals("01/10/26", shortDay(days.booked, vietnam))
    }

    @Test
    fun `step bar falls back to the plan before hand-over and return`() {
        val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
        val reserved = OrderDetailLogic.progressDays(rent("RESERVED"))
        assertEquals("03/10/26", shortDay(reserved.handOver, vietnam))
        assertEquals("08/10/26", shortDay(reserved.returned, vietnam))
        val out = OrderDetailLogic.progressDays(rent("PICKUPED", pickedUpAt = "2026-10-02T17:00:00.000Z"))
        assertEquals("03/10/26", shortDay(out.handOver, vietnam))
        assertEquals("08/10/26", shortDay(out.returned, vietnam))
        val early = OrderDetailLogic.progressDays(rent("PICKUPED", pickedUpAt = "2026-10-01T16:00:00.000Z"))
        assertEquals("01/10/26", shortDay(early.handOver, vietnam))
    }

    @Test
    fun saleSubtotalIsTheItemSum() {
        // #939: "Tiền hàng" of a sale = the item lines, as iOS, the web and the printed bill; not totalAmount
        val items = listOf(
            com.anyrent.pos.data.model.OrderItem(null, 1, "A", 2, 198.0, 396.0),
            com.anyrent.pos.data.model.OrderItem(null, 2, "B", 1, 396.0, 396.0),
        )
        assertEquals(792.0, OrderDetailLogic.saleSubtotal(items), 0.0)
        assertEquals(0.0, OrderDetailLogic.saleSubtotal(emptyList()), 0.0)
    }

    // #1279 edit papers and collateral after pick-up

    @Test
    fun `edit collateral only for picked up rent with update permission`() {
        assertTrue(OrderDetailLogic.canEditCollateral("RENT", "PICKUPED", true))
        assertTrue(OrderDetailLogic.canEditCollateral("rent", "PICKED_UP", true))
        assertFalse(OrderDetailLogic.canEditCollateral("RENT", "PICKUPED", false))
        for (st in listOf("RESERVED", "RETURNED", "CANCELLED", "COMPLETED")) {
            assertFalse(OrderDetailLogic.canEditCollateral("RENT", st, true))
        }
        assertFalse(OrderDetailLogic.canEditCollateral("SALE", "PICKUPED", true))
    }

    @Test
    fun `collateral summary joins papers and deposit`() {
        val fmt = { v: Double -> v.toLong().toString() }
        assertEquals("CCCD · 500000", OrderDetailLogic.collateralSummary(" CCCD ", 500_000.0, fmt))
        assertEquals("CCCD", OrderDetailLogic.collateralSummary("CCCD", 0.0, fmt))
        assertEquals("500000", OrderDetailLogic.collateralSummary(null, 500_000.0, fmt))
        assertNull(OrderDetailLogic.collateralSummary("  ", 0.0, fmt))
    }

    @Test
    fun `collateral edit sends the three fields and clears saved values`() {
        val f = OrderDetailLogic.collateralEditFields("CCCD", 500_000.0, null, 0.0)
        assertEquals("ID_CARD", f.collateralType)
        assertEquals("CCCD", f.collateralDetails)
        assertEquals(500_000.0, f.securityDeposit!!, 0.0)
        val cleared = OrderDetailLogic.collateralEditFields("", 0.0, "CCCD", 500_000.0)
        assertEquals("", cleared.collateralDetails)
        assertEquals(0.0, cleared.securityDeposit!!, 0.0)
    }

    @Test
    fun `return money follows edited collateral`() {
        assertEquals(300_000.0, OrderDetailLogic.returnMoney(150_000.0, 50_000.0, 500_000.0, emptyList()).refund, 0.0)
        assertEquals(500_000.0, OrderDetailLogic.returnMoney(150_000.0, 50_000.0, 700_000.0, emptyList()).refund, 0.0)
        val held = OrderDetailLogic.balance("RENT", "PICKUPED", 1_000_000.0, 300_000.0, 500_000.0, 0.0, 0.0, emptyList())
        assertEquals(500_000.0, held.refundDue, 0.0)
    }

    // ---- #1350 "Thu khi giao" of the order detail follows the plan ----------------------------------------------------

    /** 20% / 30% / rest: stage 1 collected with the booking, stage 2 not yet, the rest at hand-over (iOS `planStages`) */
    private fun planStages(second: String = "UPCOMING", secondPaid: Double = 0.0, total: Double = 1_150_000.0): List<OrderInstallment> {
        val first = Math.round(total * 0.2).toDouble()
        val middle = Math.round(total * 0.3).toDouble()
        return listOf(
            OrderInstallment("i1", "Cọc giữ chỗ", 20.0, first, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-05T07:00:00.000Z", paidAmount = first, remaining = 0.0),
            OrderInstallment("i2", "Cọc trước ngày lấy", 30.0, middle, dueDateKey = "2026-10-06", status = second, paidAmount = secondPaid),
            OrderInstallment("rest", "rest", 50.0, total - first - middle, dueDateKey = "2026-10-16", status = "UPCOMING"),
        )
    }

    private fun shown(
        total: Double = 1_150_000.0,
        deposit: Double,
        collateral: Double = 0.0,
        payments: List<BalancePayment> = emptyList(),
        plan: Boolean? = true,
        stages: List<OrderInstallment>?,
        currency: ShopCurrency = ShopCurrency.VND,
    ) = OrderDetailLogic.collectOnDeliveryShown(total, deposit, collateral, payments, plan, stages, currency)

    @Test
    fun `collect on delivery shown is what the customer adds at hand-over not what is still owed`() {
        // the example of #1350: stage 1 collected 230.000, stage 2 (345.000) not, rest 575.000
        assertEquals(575_000.0, shown(deposit = 230_000.0, stages = planStages()), 0.0)
        // and the hand-over suggestion (collectNow) is untouched by this display rule
        assertEquals(920_000.0, OrderDetailLogic.handOver(1_150_000.0, 230_000.0, 0.0, emptyList()).collectNow, 0.0)
    }

    @Test
    fun `collect on delivery shown is the same once the stages are collected`() {
        val stages = planStages(second = "PAID", secondPaid = 345_000.0)
        assertEquals(575_000.0, shown(deposit = 575_000.0, stages = stages), 0.0)
        assertEquals(575_000.0, OrderDetailLogic.handOver(1_150_000.0, 575_000.0, 0.0, emptyList()).collectNow, 0.0)
    }

    @Test
    fun `collect on delivery shown equals hand-over when every stage is collected`() {
        for (total in listOf(100_000.0, 900_000.0, 1_150_000.0, 2_333_333.0)) {
            val stages = planStages(second = "PAID", secondPaid = Math.round(total * 0.3).toDouble(), total = total)
            val deposit = stages.filter { !it.isRest }.sumOf { it.paidAmount }
            val due = OrderDetailLogic.handOver(total, deposit, 0.0, emptyList()).collectNow
            assertEquals("total $total", due, shown(total = total, deposit = deposit, stages = stages), 0.0)
        }
        // thế chân or a PICKUP payment already taken: the hand-over suggestion keeps them, the display too (nothing blocks)
        val paid = planStages(second = "PAID", secondPaid = 345_000.0)
        val pickup = listOf(BalancePayment(200_000.0, "COMPLETED", "PICKUP"))
        val held = OrderDetailLogic.handOver(1_150_000.0, 575_000.0, 500_000.0, pickup).collectNow
        assertEquals(held, shown(deposit = 575_000.0, collateral = 500_000.0, payments = pickup, stages = paid), 0.0)
    }

    @Test
    fun `collect on delivery shown of a one-time deposit or no deposit is unchanged`() {
        assertEquals(850_000.0, shown(deposit = 300_000.0, plan = false, stages = null), 0.0)
        assertEquals(850_000.0, shown(deposit = 300_000.0, plan = null, stages = null), 0.0)
        assertEquals(1_150_000.0, shown(deposit = 0.0, plan = null, stages = null), 0.0)
        assertEquals(0.0, shown(deposit = 2_000_000.0, plan = null, stages = null), 0.0)
        assertEquals(850_000.0, shown(deposit = 300_000.0, plan = true, stages = emptyList()), 0.0)
        assertEquals(850_000.0, shown(deposit = 300_000.0, plan = false, stages = planStages()), 0.0)
    }

    @Test
    fun `collect on delivery shown with a discount uses the discounted total`() {
        // total 900.000 after a discount: 20% = 180.000 collected, 30% = 270.000 not yet, rest 450.000
        assertEquals(450_000.0, shown(total = 900_000.0, deposit = 180_000.0, stages = planStages(total = 900_000.0)), 0.0)
    }

    @Test
    fun `collect on delivery shown does not add collateral`() {
        assertEquals(575_000.0, shown(deposit = 230_000.0, collateral = 500_000.0, stages = planStages()), 0.0)
    }

    @Test
    fun `collect on delivery shown leaves a void stage out`() {
        val stages = planStages().toMutableList()
        // stage 2 voided, a new stage 3 of 100.000 not collected: the plan is 230.000 + 100.000
        stages[1] = OrderInstallment("i2", "Huỷ", 30.0, 345_000.0, dueDateKey = "2026-10-06", status = "VOID")
        stages.add(2, OrderInstallment("i3", "Cọc 3", 9.0, 100_000.0, dueDateKey = "2026-10-08", status = "UPCOMING"))
        assertEquals(820_000.0, shown(deposit = 230_000.0, stages = stages), 0.0)
        // only a void stage left unpaid: nothing blocks, the number is the hand-over suggestion
        stages.removeAt(2)
        assertEquals(OrderDetailLogic.handOver(1_150_000.0, 230_000.0, 0.0, emptyList()).collectNow, shown(deposit = 230_000.0, stages = stages), 0.0)
    }

    @Test
    fun `collect on delivery shown of a dollar shop rounds to cents`() {
        val total = 1_150.30
        val first = 230.06
        val middle = 345.09
        val stages = listOf(
            OrderInstallment("i1", "A", 20.0, first, dueDateKey = "2026-10-05", status = "PAID", paidAmount = first, remaining = 0.0),
            OrderInstallment("i2", "B", 30.0, middle, dueDateKey = "2026-10-06", status = "UPCOMING"),
            OrderInstallment("rest", "rest", 50.0, total - first - middle, dueDateKey = "2026-10-16", status = "UPCOMING"),
        )
        assertEquals(575.15, shown(total = total, deposit = first, stages = stages, currency = ShopCurrency.USD), 0.0001)
    }

    @Test
    fun `the order status does not change the hand-over suggestion or the return money`() {
        val reserved = OrderDetailLogic.balance("RENT", "RESERVED", 1_150_000.0, 230_000.0, 0.0, 0.0, 0.0, emptyList())
        assertEquals(920_000.0, reserved.amountDue, 0.0)
        val pickuped = OrderDetailLogic.balance("RENT", "PICKUPED", 1_150_000.0, 575_000.0, 0.0, 0.0, 0.0, emptyList())
        assertEquals(0.0, pickuped.amountDue, 0.0)
        assertEquals(575_000.0, shown(deposit = 230_000.0, stages = planStages()), 0.0)
        val sale = OrderDetailLogic.balance("SALE", "RESERVED", 500_000.0, 0.0, 0.0, 0.0, 0.0, emptyList())
        assertEquals(500_000.0, sale.amountDue, 0.0)
    }

    // ---- #1368 money collateral: rental left, collateral, what the customer hands over ---------------------------------

    /** total 1.000.000: stage 1 200.000 collected, stage 2 300.000 (collected or not), rest 500.000 (iOS `plan1M`) */
    private fun plan1M(secondPaid: Boolean) = listOf(
        OrderInstallment("i1", "Cọc giữ chỗ", 20.0, 200_000.0, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-05T07:00:00.000Z", paidAmount = 200_000.0, remaining = 0.0),
        OrderInstallment(
            "i2", "Cọc trước ngày lấy", 30.0, 300_000.0, dueDateKey = "2026-10-06", status = if (secondPaid) "PAID" else "UPCOMING",
            collectedAt = if (secondPaid) "2026-10-06T03:00:00.000Z" else null, paidAmount = if (secondPaid) 300_000.0 else 0.0,
            remaining = if (secondPaid) 0.0 else 300_000.0,
        ),
        OrderInstallment("rest", "rest", 50.0, 500_000.0, dueDateKey = "2026-10-16", status = "UPCOMING"),
    )

    private fun cash(
        type: String = "RENT",
        status: String = "RESERVED",
        total: Double = 1_000_000.0,
        deposit: Double,
        collateral: Double = 300_000.0,
        payments: List<BalancePayment> = emptyList(),
        plan: Boolean? = true,
        stages: List<OrderInstallment>?,
        currency: ShopCurrency = ShopCurrency.VND,
    ) = OrderDetailLogic.handOverCash(type, status, total, deposit, collateral, payments, plan, stages, currency)

    @Test
    fun `hand-over cash of the example`() {
        // stage 2 not collected: the number does not wait for it
        assertEquals(HandOverCashLines(500_000.0, 300_000.0, 800_000.0), cash(deposit = 200_000.0, stages = plan1M(false)))
        // stage 2 collected: the three numbers do not move
        assertEquals(HandOverCashLines(500_000.0, 300_000.0, 800_000.0), cash(deposit = 500_000.0, stages = plan1M(true)))
    }

    @Test
    fun `hand-over cash is the same function as the share image`() {
        val stages = plan1M(false)
        val lines = cash(deposit = 200_000.0, stages = stages)!!
        val rest = ShareMoneyRule.collectOnDelivery(1_000_000.0, 200_000.0, true, stages, ShopCurrency.VND)
        assertEquals(rest, lines.rentalLeft, 0.0)
        assertEquals(ShareMoneyRule.cashAtHandover(rest, 300_000.0, ShopCurrency.VND)!!, lines.cash, 0.0)
    }

    @Test
    fun `hand-over cash equals the hand-over button once every stage is collected`() {
        for (total in listOf(100_000.0, 900_000.0, 1_000_000.0, 2_333_333.0)) {
            val first = Math.round(total * 0.2).toDouble()
            val middle = Math.round(total * 0.3).toDouble()
            val stages = listOf(
                OrderInstallment("i1", "A", 20.0, first, dueDateKey = "2026-10-05", status = "PAID", paidAmount = first, remaining = 0.0),
                OrderInstallment("i2", "B", 30.0, middle, dueDateKey = "2026-10-06", status = "PAID", paidAmount = middle, remaining = 0.0),
                OrderInstallment("rest", "rest", 50.0, total - first - middle, dueDateKey = "2026-10-16", status = "UPCOMING"),
            )
            val button = OrderDetailLogic.handOver(total, first + middle, 300_000.0, emptyList()).collectNow
            assertEquals("total $total", button, cash(total = total, deposit = first + middle, stages = stages)!!.cash, 0.0)
        }
        // a one-time deposit and no deposit: the same
        val button = OrderDetailLogic.handOver(1_150_000.0, 300_000.0, 500_000.0, emptyList()).collectNow
        assertEquals(button, cash(total = 1_150_000.0, deposit = 300_000.0, collateral = 500_000.0, plan = false, stages = null)!!.cash, 0.0)
        assertEquals(
            OrderDetailLogic.handOver(1_150_000.0, 0.0, 500_000.0, emptyList()).collectNow,
            cash(total = 1_150_000.0, deposit = 0.0, collateral = 500_000.0, plan = null, stages = null)!!.cash, 0.0,
        )
    }

    @Test
    fun `the hand-over button stays what it was while a stage is uncollected`() {
        // not changed here: it asks total - collected + collateral (1.100.000), not the 800.000 of the new line
        assertEquals(1_100_000.0, OrderDetailLogic.handOver(1_000_000.0, 200_000.0, 300_000.0, emptyList()).collectNow, 0.0)
        assertEquals(
            1_100_000.0,
            OrderDetailLogic.balance("RENT", "RESERVED", 1_000_000.0, 200_000.0, 300_000.0, 0.0, 0.0, emptyList()).amountDue, 0.0,
        )
        // and the old display rule, kept for the other cases
        assertEquals(500_000.0, shown(total = 1_000_000.0, deposit = 200_000.0, collateral = 300_000.0, stages = plan1M(false)), 0.0)
        assertEquals(800_000.0, shown(total = 1_000_000.0, deposit = 500_000.0, collateral = 300_000.0, stages = plan1M(true)), 0.0)
    }

    @Test
    fun `hand-over cash needs money collateral`() {
        assertNull("papers only or none: the old lines", cash(deposit = 200_000.0, collateral = 0.0, stages = plan1M(false)))
        assertNull(cash(deposit = 200_000.0, collateral = -5.0, stages = plan1M(false)))
    }

    @Test
    fun `hand-over cash is only for a rental waiting for pick-up`() {
        val stages = plan1M(true)
        for (status in listOf("PICKUPED", "RETURNED", "CANCELLED")) assertNull(status, cash(status = status, deposit = 500_000.0, stages = stages))
        assertNull(cash(type = "SALE", status = "COMPLETED", deposit = 0.0, stages = null))
        assertNull(cash(type = "SALE", status = "RESERVED", deposit = 0.0, stages = null))
        assertNotNull(cash(deposit = 500_000.0, stages = stages))
    }

    @Test
    fun `hand-over cash steps aside when a pick-up payment was already taken`() {
        val taken = listOf(BalancePayment(200_000.0, "COMPLETED", "PICKUP"))
        assertNull("the detail keeps its 'Đã thu' row and the old number", cash(deposit = 500_000.0, payments = taken, stages = plan1M(true)))
        // a pending or another kind of payment does not count
        val other = listOf(BalancePayment(100_000.0, "PENDING", "PICKUP"), BalancePayment(100_000.0, "COMPLETED", "DEPOSIT"))
        assertNotNull(cash(deposit = 500_000.0, payments = other, stages = plan1M(true)))
    }

    @Test
    fun `hand-over cash of one deposit no deposit and a discount`() {
        assertEquals(
            HandOverCashLines(850_000.0, 500_000.0, 1_350_000.0),
            cash(total = 1_150_000.0, deposit = 300_000.0, collateral = 500_000.0, plan = null, stages = null),
        )
        assertEquals(
            HandOverCashLines(1_150_000.0, 500_000.0, 1_650_000.0),
            cash(total = 1_150_000.0, deposit = 0.0, collateral = 500_000.0, plan = null, stages = null),
        )
        // total 900.000 after a discount: 20% = 180.000, 30% = 270.000, rest 450.000
        val stages = listOf(
            OrderInstallment("i1", "A", 20.0, 180_000.0, dueDateKey = "2026-10-05", status = "PAID", paidAmount = 180_000.0, remaining = 0.0),
            OrderInstallment("i2", "B", 30.0, 270_000.0, dueDateKey = "2026-10-06", status = "UPCOMING"),
            OrderInstallment("rest", "rest", 50.0, 450_000.0, dueDateKey = "2026-10-16", status = "UPCOMING"),
        )
        assertEquals(HandOverCashLines(450_000.0, 300_000.0, 750_000.0), cash(total = 900_000.0, deposit = 180_000.0, stages = stages))
    }

    @Test
    fun `hand-over cash of a dollar shop rounds to cents`() {
        val lines = cash(total = 1_150.30, deposit = 300.10, collateral = 100.15, plan = null, stages = null, currency = ShopCurrency.USD)!!
        assertEquals(850.2, lines.rentalLeft, 0.0001)
        assertEquals(950.35, lines.cash, 0.0001)
    }
}
