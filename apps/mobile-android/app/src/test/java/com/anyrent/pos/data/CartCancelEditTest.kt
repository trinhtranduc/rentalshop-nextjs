package com.anyrent.pos.data

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.PaymentEntry
import com.anyrent.pos.domain.orders.BalancePayment
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #677 — "Huỷ sửa" leaves edit mode with an empty cart; the loaded order keeps its status and payments */
class CartCancelEditTest {
    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun order() = OrderDetail(
        summary = OrderSummary(
            id = 94, orderNumber = "948372", orderType = "RENT", status = "RESERVED", totalAmount = 900_000.0,
            depositAmount = 300_000.0, customerName = "Trần Văn Minh", customerPhone = null,
            pickupPlanAt = "2026-10-03T03:00:00Z", returnPlanAt = "2026-10-05T03:00:00Z", createdAt = null, notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Vest", quantity = 5, unitPrice = 180_000.0, totalPrice = 900_000.0)),
        customerId = 5,
        payments = listOf(PaymentEntry(id = 1, amount = 100_000.0, paymentMethod = "CASH", status = "COMPLETED", notes = "PICKUP")),
    )

    @Test
    fun `the loaded order keeps its status and payments`() {
        CartStore.loadFromOrderDetail(order())
        val original = CartStore.editOriginal.value!!
        assertEquals("RESERVED", original.status)
        assertEquals(listOf(BalancePayment(100_000.0, "COMPLETED", "PICKUP")), original.payments)
    }

    @Test
    fun `cancel edit empties the cart and returns the order`() {
        CartStore.loadFromOrderDetail(order())
        assertEquals(94, CartStore.cancelEdit(persistToDisk = false))
        assertNull(CartStore.editingOrderId.value)
        assertNull(CartStore.editOriginal.value)
        assertTrue(CartStore.lines.value.isEmpty())
        assertNull("not editing: nothing to cancel", CartStore.cancelEdit(persistToDisk = false))
    }
}
