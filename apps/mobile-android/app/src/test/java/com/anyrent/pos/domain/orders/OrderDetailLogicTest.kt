package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.orders.v2.shortDay
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.time.ZoneId

/** #372 — order detail: actions per status, API money rule, notes payload, status errors */
class OrderDetailLogicTest {
    private fun actions(type: String, status: String, manage: Boolean = true, delete: Boolean = true) =
        OrderDetailLogic.actions(type, status, manage, delete)

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
        assertEquals("05/10", shortDay(days.returned, vietnam))
        assertEquals("03/10", shortDay(days.handOver, vietnam))
        assertEquals("01/10", shortDay(days.booked, vietnam))
    }

    @Test
    fun `step bar falls back to the plan before hand-over and return`() {
        val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
        val reserved = OrderDetailLogic.progressDays(rent("RESERVED"))
        assertEquals("03/10", shortDay(reserved.handOver, vietnam))
        assertEquals("08/10", shortDay(reserved.returned, vietnam))
        val out = OrderDetailLogic.progressDays(rent("PICKUPED", pickedUpAt = "2026-10-02T17:00:00.000Z"))
        assertEquals("03/10", shortDay(out.handOver, vietnam))
        assertEquals("08/10", shortDay(out.returned, vietnam))
        val early = OrderDetailLogic.progressDays(rent("PICKUPED", pickedUpAt = "2026-10-01T16:00:00.000Z"))
        assertEquals("01/10", shortDay(early.handOver, vietnam))
    }
}
