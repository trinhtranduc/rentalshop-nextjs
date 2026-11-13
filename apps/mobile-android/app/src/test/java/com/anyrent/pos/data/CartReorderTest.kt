package com.anyrent.pos.data

import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.orders.ReorderCart
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #1515 "Đặt lại" opens a cart like the old order at today's prices; the cart rules are the booking ones (#1124, #1293) */
class CartReorderTest {
    private fun product(id: Int, rent: Double, sale: Double? = null) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = rent, salePrice = sale, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = 0.0,
    )

    private val an = Customer(id = 7, firstName = "An", lastName = "Nguyễn", phone = "0901234567", email = null, address = null)

    private fun plan(type: String = "RENT", customer: Customer? = an, items: List<ReorderCart.Item> = listOf(ReorderCart.Item(11, 1, "Đã sửa gấu"), ReorderCart.Item(12, 2, null)), unreadable: Int = 0) =
        ReorderCart.Plan(orderType = type, customer = customer, notes = "Giao trước 8h", items = items, unreadable = unreadable)

    private val products = mapOf(11 to product(11, 250_000.0, 900_000.0), 12 to product(12, 80_000.0, 300_000.0))

    @Before fun setUp() = CartStore.clear(persistToDisk = false)
    @After fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test fun `case 1 a rent cart with the customer, note, lines at today's prices, no dates and no money`() {
        val r = CartStore.startReorderCart(plan(), products)
        assertEquals(ReorderCart.Status.OPENED, r.status)
        assertEquals(0, r.skipped)
        assertEquals("RENT", CartStore.orderType.value)
        assertEquals(7, CartStore.customer.value?.id)
        assertEquals("Giao trước 8h", CartStore.notes.value)
        val lines = CartStore.lines.value
        assertEquals(listOf(11, 12), lines.map { it.product.id })
        assertEquals(listOf(1, 2), lines.map { it.quantity })
        assertEquals(listOf(250_000.0, 80_000.0), lines.map { it.unitPrice })
        assertEquals("Đã sửa gấu", lines[0].note)
        assertNull(lines[1].note)
        assertFalse(CartStore.datesChosen.value) // the cart asks for the days like a new rental
        assertEquals(0.0, CartStore.discount.value, 0.0)
        assertEquals(0.0, CartStore.securityDeposit.value, 0.0)
        assertEquals("", CartStore.collateralDetails.value)
        assertNull(CartStore.editingOrderId.value)
        assertNull(CartStore.bookingRequestId.value)
    }

    @Test fun `case 2 a sale cart without a customer takes the sale price`() {
        val r = CartStore.startReorderCart(plan(type = "SALE", customer = null, items = listOf(ReorderCart.Item(12, 3, null))), products)
        assertEquals(ReorderCart.Status.OPENED, r.status)
        assertEquals("SALE", CartStore.orderType.value)
        assertNull(CartStore.customer.value)
        assertEquals(300_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        assertEquals(3, CartStore.lines.value.single().quantity)
    }

    @Test fun `case 3 a product that no longer loads is dropped and counted, the rest stays`() {
        val r = CartStore.startReorderCart(plan(), mapOf(12 to products.getValue(12)))
        assertEquals(ReorderCart.Status.OPENED, r.status)
        assertEquals(1, r.skipped)
        assertEquals(listOf(12), CartStore.lines.value.map { it.product.id })
    }

    @Test fun `the unreadable lines of the order count as skipped too`() {
        val r = CartStore.startReorderCart(plan(unreadable = 2), products)
        assertEquals(2, r.skipped)
    }

    @Test fun `case 4 nothing left opens no cart and changes nothing`() {
        CartStore.setCustomer(an)
        val before = CartStore.cartCount
        val r = CartStore.startReorderCart(plan(items = listOf(ReorderCart.Item(11, 1, null))), emptyMap())
        assertEquals(ReorderCart.Status.EMPTY, r.status)
        assertEquals(1, r.skipped)
        assertEquals(before, CartStore.cartCount)
        assertEquals(7, CartStore.customer.value?.id)
    }

    @Test fun `case 6 a cart in use with items stays and the reorder gets its own cart`() {
        CartStore.addProduct(product(1, 100.0))
        CartStore.addProduct(product(2, 200.0))
        val r = CartStore.startReorderCart(plan(), products)
        assertEquals(ReorderCart.Status.OPENED, r.status)
        assertEquals(2, CartStore.cartCount)
        assertEquals(listOf(11, 12), CartStore.lines.value.map { it.product.id })
        CartStore.switchCart(0)
        assertEquals(listOf(1, 2), CartStore.lines.value.map { it.product.id })
    }

    @Test fun `case 7 an empty cart in use is filled, no second cart`() {
        CartStore.startReorderCart(plan(), products)
        assertEquals(1, CartStore.cartCount)
    }

    @Test fun `case 8 ten carts and one in use with items warns and changes nothing`() {
        CartStore.addProduct(product(1, 100.0))
        while (CartStore.cartCount < CartStore.MAX_CARTS) {
            assertTrue(CartStore.newCart())
            CartStore.addProduct(product(1, 100.0))
        }
        val r = CartStore.startReorderCart(plan(), products)
        assertEquals(ReorderCart.Status.LIMIT, r.status)
        assertEquals(CartStore.MAX_CARTS, CartStore.cartCount)
        assertEquals(listOf(1), CartStore.lines.value.map { it.product.id })
    }

    @Test fun `the same product on two lines of the old order stays on two lines`() {
        val items = listOf(ReorderCart.Item(12, 1, "đã trả tiền"), ReorderCart.Item(12, 1, "tặng"))
        CartStore.startReorderCart(plan(items = items), products)
        assertEquals(listOf("đã trả tiền", "tặng"), CartStore.lines.value.map { it.note })
    }
}
