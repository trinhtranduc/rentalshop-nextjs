package com.anyrent.pos.data

import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #1079 — several carts at once: the store keeps a list, the cart flows are the one in use (iOS `CartStoreMultiCartTests`) */
class CartMultiCartTest {
    private fun customer(id: Int, first: String, last: String? = null) =
        Customer(id = id, firstName = first, lastName = last, phone = null, email = null, address = null)

    private fun product(id: Int) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = 100.0, salePrice = 200.0, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = 0.0,
    )

    private fun order(id: Int = 77) = OrderDetail(
        summary = OrderSummary(
            id = id, orderNumber = "482913", orderType = "RENT", status = "RESERVED", totalAmount = 900_000.0,
            depositAmount = 0.0, customerName = "Bảo", customerPhone = null,
            pickupPlanAt = "2026-10-03T03:00:00Z", returnPlanAt = "2026-10-05T03:00:00Z", createdAt = null, notes = null,
        ),
        items = listOf(OrderItem(id = 1, productId = 7, productName = "Vest", quantity = 1, unitPrice = 180_000.0, totalPrice = 180_000.0)),
        customerId = 9,
        payments = emptyList(),
    )

    @Before fun setUp() = CartStore.clear(persistToDisk = false)
    @After fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun startsWithOneEmptyCart() {
        assertEquals(1, CartStore.cartCount)
        assertEquals(0, CartStore.activeIndex)
        assertTrue(CartStore.lines.value.isEmpty())
    }

    @Test
    fun newCartIsAddedAndUsed() {
        CartStore.setCustomer(customer(1, "Mai"))
        assertTrue(CartStore.newCart())
        assertEquals(2, CartStore.cartCount)
        assertEquals(1, CartStore.activeIndex)
        assertNull(CartStore.customer.value)
        assertEquals("Mai", CartStore.cartSummaries()[0].customerName)
    }

    @Test
    fun switchingKeepsEachCartsContent() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.addProduct(product(1))
        CartStore.newCart()
        CartStore.setCustomer(customer(2, "Lâm"))
        CartStore.addProduct(product(2), 3)
        CartStore.switchCart(0)
        assertEquals("Mai", CartStore.customer.value?.firstName)
        assertEquals(1, CartStore.itemCount)
        CartStore.switchCart(1)
        assertEquals("Lâm", CartStore.customer.value?.firstName)
        assertEquals(3, CartStore.itemCount)
    }

    @Test
    fun cartNumbersTakeTheSmallestFreeOne() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.newCart()
        CartStore.newCart()
        assertEquals(listOf(1, 2, 3), CartStore.cartSummaries().map { it.number })
        CartStore.deleteCart(1)
        CartStore.newCart()
        assertEquals(listOf(1, 3, 2), CartStore.cartSummaries().map { it.number })
    }

    @Test
    fun avatarIsTheInitialsOrTheCartNumber() {
        CartStore.setCustomer(customer(1, "Nguyễn Thị", "Mai"))
        CartStore.newCart()
        val summaries = CartStore.cartSummaries()
        assertEquals("NM", summaries[0].avatar)
        assertEquals("2", summaries[1].avatar)
        assertNull(summaries[1].customerName)
    }

    @Test
    fun limitIsTenCarts() {
        repeat(9) { assertTrue(CartStore.newCart()) }
        assertEquals(10, CartStore.cartCount)
        assertFalse(CartStore.newCart())
        assertEquals(10, CartStore.cartCount)
    }

    @Test
    fun deletingTheActiveCartMovesToTheNext() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.newCart()
        CartStore.setCustomer(customer(2, "Lâm"))
        CartStore.deleteCart(1)
        assertEquals(1, CartStore.cartCount)
        assertEquals("Mai", CartStore.customer.value?.firstName)
    }

    @Test
    fun deletingTheOnlyCartEmptiesIt() {
        CartStore.addProduct(product(1))
        CartStore.deleteCart(0)
        assertEquals(1, CartStore.cartCount)
        assertTrue(CartStore.lines.value.isEmpty())
    }

    @Test
    fun clearAfterAnOrderClosesTheActiveCart() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.newCart()
        CartStore.setCustomer(customer(2, "Lâm"))
        CartStore.clear()
        assertEquals(1, CartStore.cartCount)
        assertEquals("Mai", CartStore.customer.value?.firstName)
    }

    @Test
    fun editWithADraftOpensItsOwnCartAndKeepsTheDraft() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.loadFromOrderDetail(order())
        assertEquals(2, CartStore.cartCount)
        assertTrue(CartStore.isEditing)
        assertEquals("Mai", CartStore.cartSummaries()[0].customerName)
    }

    @Test
    fun cancelEditReturnsToTheDraft() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.newCart()
        CartStore.setCustomer(customer(2, "Lâm"))
        CartStore.switchCart(0)
        CartStore.loadFromOrderDetail(order())
        assertEquals(77, CartStore.cancelEdit(persistToDisk = true))
        assertEquals(2, CartStore.cartCount)
        assertFalse(CartStore.isEditing)
        assertEquals("Mai", CartStore.customer.value?.firstName)
    }

    @Test
    fun editWithAnEmptyCartReplacesIt() {
        CartStore.loadFromOrderDetail(order())
        assertEquals(1, CartStore.cartCount)
        assertTrue(CartStore.isEditing)
    }

    @Test
    fun editIsRefusedAtTheLimit() {
        CartStore.setCustomer(customer(1, "Mai"))
        repeat(9) { CartStore.newCart(); CartStore.setCustomer(customer(2 + it, "K$it")) }
        val failed = runCatching { CartStore.loadFromOrderDetail(order()) }.exceptionOrNull()
        assertTrue(failed is CartLimitException)
        assertEquals(10, CartStore.cartCount)
        assertFalse(CartStore.isEditing)
    }

    @Test
    fun summaryShowsItemsTotalDatesForRent() {
        CartStore.addProduct(product(1), 2)
        assertEquals(2, CartStore.cartSummaries()[0].itemCount)
        assertNull("no dates chosen yet", CartStore.cartSummaries()[0].dates)
        val day = java.time.LocalDate.of(2026, 10, 19)
        CartStore.setPickup(day)
        CartStore.setReturn(day.plusDays(2))
        assertEquals("19/10/26 → 21/10/26", CartStore.cartSummaries()[0].dates)
    }

    @Test
    fun draftsRoundTripThroughJson() {
        CartStore.setCustomer(customer(1, "Mai"))
        CartStore.addProduct(product(1))
        CartStore.newCart()
        CartStore.setCustomer(customer(2, "Lâm"))
        val saved = CartStore.cartsJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyCartsJson(saved)
        assertEquals(2, CartStore.cartCount)
        assertEquals(1, CartStore.activeIndex)
        assertEquals("Lâm", CartStore.customer.value?.firstName)
        assertEquals(1, CartStore.cartSummaries()[0].itemCount)
    }

    @Test
    fun anOldSingleDraftBecomesTheFirstCart() {
        CartStore.setCustomer(customer(1, "Cũ"))
        val legacy = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyLegacyDraftJson(legacy)
        assertEquals(1, CartStore.cartCount)
        assertEquals("Cũ", CartStore.customer.value?.firstName)
    }
}
