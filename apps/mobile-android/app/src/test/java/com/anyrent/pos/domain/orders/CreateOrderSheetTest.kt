package com.anyrent.pos.domain.orders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** #476 — "Tạo đơn" opens a confirm sheet on the cart, then a "Đã tạo đơn" sheet (iOS `CreateOrderSheetLogic`) */
class CreateOrderSheetTest {
    private val lines = listOf("Vest đen slim fit" to 1, "Áo dài lụa đỏ" to 2)

    private fun rent() = CreateOrderSheet.confirm(
        isSale = false,
        customerName = "Trần Văn Minh",
        pickup = LocalDate.of(2026, 10, 3),
        returnDate = LocalDate.of(2026, 10, 5),
        lines = lines,
        total = 750_000.0,
        deposit = 200_000.0,
    )

    @Test
    fun `rent confirm sheet summarises the cart`() {
        val confirm = rent()
        assertFalse(confirm.isSale)
        assertEquals("Trần Văn Minh", confirm.customer)
        assertEquals("03/10/26 → 05/10/26", confirm.range)
        assertEquals(3, confirm.days)
        assertEquals("the sheet shows the first product only (#1239)", "Vest đen slim fit", confirm.items)
        assertEquals(1, confirm.moreCount)
        assertEquals(750_000.0, confirm.total, 0.0)
        assertEquals("rent collects the prepaid deposit", 200_000.0, confirm.collect, 0.0)
    }

    @Test
    fun `a big cart shows one product and the number of the others`() {
        val many = (1..15).map { "Sản phẩm $it" to it }
        val confirm = CreateOrderSheet.confirm(true, "Khách", null, null, many, 1_000.0, 0.0)
        assertEquals("Sản phẩm 1", confirm.items)
        assertEquals(14, confirm.moreCount)
        val one = CreateOrderSheet.confirm(true, "Khách", null, null, listOf("Áo dài" to 2), 1_000.0, 0.0)
        assertEquals("Áo dài ×2", one.items)
        assertEquals(0, one.moreCount)
    }

    @Test
    fun `sale confirm sheet collects the total and has no dates`() {
        val confirm = CreateOrderSheet.confirm(
            isSale = true, customerName = "Trần Văn Minh", pickup = LocalDate.of(2026, 10, 3),
            returnDate = LocalDate.of(2026, 10, 5), lines = lines, total = 740_000.0, deposit = 200_000.0,
        )
        assertTrue(confirm.isSale)
        assertNull(confirm.range)
        assertNull(confirm.days)
        assertEquals(740_000.0, confirm.collect, 0.0)
    }

    @Test
    fun `created sheet uses the short order number`() {
        val created = CreateOrderSheet.created("ORD-17-0063", rent())
        assertEquals("0063", created.shortNumber)
        assertEquals("Trần Văn Minh · 03/10/26 → 05/10/26", created.subtitle)
        assertEquals(200_000.0, created.paid, 0.0)
        assertFalse(created.isSale)

        val sale = CreateOrderSheet.created(
            "ORD-17-0064",
            CreateOrderSheet.confirm(true, "Trần Văn Minh", null, null, lines, 740_000.0, 0.0),
        )
        assertEquals("Trần Văn Minh", sale.subtitle)
        assertTrue(sale.isSale)
    }

    @Test
    fun `only a new order uses the sheet`() {
        assertEquals(CreateOrderSheet.CtaRoute.CONFIRM_SHEET, CreateOrderSheet.ctaRoute(editing = false))
        assertEquals(CreateOrderSheet.CtaRoute.EDIT_SHEET, CreateOrderSheet.ctaRoute(editing = true))
    }

    @Test
    fun `one create at a time and the key is reused on retry`() {
        val submission = CreateOrderSubmission()
        val key = submission.idempotencyKey
        assertTrue(submission.begin())
        assertFalse("a double tap must not send a second create (#341)", submission.begin())
        submission.failed()
        assertEquals("a retry after an error reuses the key", key, submission.idempotencyKey)
        assertTrue(submission.begin())
        submission.succeeded()
        assertNotEquals("the next cart is a new checkout", key, submission.idempotencyKey)
        assertFalse(submission.inFlight)
    }
}
