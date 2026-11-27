package com.anyrent.pos.data

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/** #1685 — a new rental cannot keep a pickup day before today; an edited order and a sale are left alone */
class CartPastPickupTest {
    private val today = LocalDate.of(2026, 11, 27)

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun `a new rental with a pickup day before today asks for the days again`() {
        CartStore.setPickup(LocalDate.of(2026, 11, 26))
        CartStore.setReturn(LocalDate.of(2026, 11, 28))
        assertTrue(CartStore.dropPastPickupDays(today))
        assertFalse(CartStore.datesChosen.value)
        assertEquals(today, CartStore.pickupDate.value)
        assertEquals(today.plusDays(1), CartStore.returnDate.value)
        assertFalse("nothing left to drop", CartStore.dropPastPickupDays(today))
    }

    @Test
    fun `today and later stay chosen`() {
        CartStore.setPickup(today)
        CartStore.setReturn(today.plusDays(2))
        assertFalse(CartStore.dropPastPickupDays(today))
        assertTrue(CartStore.datesChosen.value)
        assertEquals(today.plusDays(2), CartStore.returnDate.value)
    }

    @Test
    fun `a sale has no pickup day to drop`() {
        CartStore.setOrderType("SALE")
        CartStore.setPickup(LocalDate.of(2026, 11, 20))
        assertFalse(CartStore.dropPastPickupDays(today))
        assertTrue(CartStore.datesChosen.value)
    }

    @Test
    fun `an edited order keeps its past days and has no minimum`() {
        CartStore.loadFromOrderDetail(order())
        assertTrue(CartStore.isEditing)
        assertFalse(CartStore.dropPastPickupDays(today))
        assertEquals(LocalDate.of(2026, 10, 3), CartStore.pickupDate.value)
        assertNull(CartStore.minPickupDay())
    }

    @Test
    fun `a new order offers no day before today`() {
        assertEquals(com.anyrent.pos.domain.ShopTime.today(), CartStore.minPickupDay())
    }

    private fun order() = OrderDetail(
        summary = OrderSummary(
            id = 94, orderNumber = "948372", orderType = "RENT", status = "RESERVED", totalAmount = 900_000.0,
            depositAmount = 300_000.0, customerName = "Trần Văn Minh", customerPhone = null,
            pickupPlanAt = "2026-10-03T03:00:00Z", returnPlanAt = "2026-10-05T03:00:00Z", createdAt = null, notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Vest", quantity = 5, unitPrice = 180_000.0, totalPrice = 900_000.0)),
        customerId = 5,
        payments = emptyList(),
    )
}
