package com.anyrent.pos.data

import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.booking.BookingCustomerRef
import com.anyrent.pos.domain.booking.BookingPrepare
import com.anyrent.pos.domain.booking.BookingPrepareItem
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/** #1124 "Xác nhận" opens a new cart filled from the booking; a draft in the cart in use stays (iOS `startBookingCart`) */
class CartBookingTest {
    private fun product(id: Int, rent: Double) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = rent, salePrice = null, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = 0.0,
    )

    private fun prepare() = BookingPrepare(
        bookingRequestId = 12,
        orderType = "RENT",
        outletId = 3,
        customer = BookingCustomerRef(id = 41, firstName = "Nguyễn Thị", lastName = "Mai", phone = "0901234567"),
        customerCreated = false,
        pickupPlanAt = "2026-10-21T03:00:00.000Z",
        returnPlanAt = "2026-10-24T03:00:00.000Z",
        notes = "Lấy buổi sáng",
        items = listOf(BookingPrepareItem(7, 2, "Áo dài đỏ"), BookingPrepareItem(8, 1, "Khăn đóng")),
    )

    @Before fun setUp() = CartStore.clear(persistToDisk = false)
    @After fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun `the booking fills a rent cart with customer, days, note and items`() {
        assertTrue(CartStore.startBookingCart(prepare(), mapOf(7 to product(7, 250_000.0))))
        assertEquals("RENT", CartStore.orderType.value)
        assertEquals(41, CartStore.customer.value?.id)
        assertEquals("0901234567", CartStore.customer.value?.phone)
        assertEquals(LocalDate.of(2026, 10, 21), CartStore.pickupDate.value)
        assertEquals(LocalDate.of(2026, 10, 24), CartStore.returnDate.value)
        assertTrue(CartStore.datesChosen.value)
        assertEquals("Lấy buổi sáng", CartStore.notes.value)
        assertEquals(12, CartStore.bookingRequestId.value)
        assertEquals(3, CartStore.bookingOutletId.value)
        val lines = CartStore.lines.value
        assertEquals(listOf(7, 8), lines.map { it.product.id })
        assertEquals(listOf(2, 1), lines.map { it.quantity })
        assertEquals(250_000.0, lines[0].unitPrice, 0.0)
        // A product the app could not load keeps its line at 0
        assertEquals("Khăn đóng", lines[1].product.name)
        assertEquals(0.0, lines[1].unitPrice, 0.0)
    }

    @Test
    fun `an empty cart is replaced, not added to`() {
        CartStore.startBookingCart(prepare(), emptyMap())
        assertEquals(1, CartStore.cartCount)
    }

    @Test
    fun `a draft in the cart in use stays and the booking gets its own cart`() {
        CartStore.setCustomer(Customer(id = 5, firstName = "Lâm", lastName = null, phone = null, email = null, address = null))
        CartStore.addProduct(product(1, 100.0))
        assertTrue(CartStore.startBookingCart(prepare(), emptyMap()))
        assertEquals(2, CartStore.cartCount)
        assertEquals(41, CartStore.customer.value?.id)
        assertEquals("Lâm", CartStore.cartSummaries()[0].customerName)
    }

    @Test
    fun `creating the booking order returns to the draft cart`() {
        CartStore.setCustomer(Customer(id = 5, firstName = "Lâm", lastName = null, phone = null, email = null, address = null))
        CartStore.addProduct(product(1, 100.0))
        CartStore.newCart() // cart 2, empty, in use
        CartStore.switchCart(0) // back to Lâm's draft
        CartStore.startBookingCart(prepare(), emptyMap())
        CartStore.clear() // the order was created
        assertEquals(2, CartStore.cartCount)
        assertEquals("Lâm", CartStore.customer.value?.firstName)
        assertNull(CartStore.bookingRequestId.value)
    }

    @Test
    fun `at the cart limit the booking is refused and nothing changes`() {
        CartStore.setCustomer(Customer(id = 5, firstName = "Lâm", lastName = null, phone = null, email = null, address = null))
        repeat(CartStore.MAX_CARTS - 1) { CartStore.newCart() }
        CartStore.switchCart(0)
        assertFalse(CartStore.startBookingCart(prepare(), emptyMap()))
        assertEquals(CartStore.MAX_CARTS, CartStore.cartCount)
        assertEquals("Lâm", CartStore.customer.value?.firstName)
        assertNull(CartStore.bookingRequestId.value)
    }

    @Test
    fun `the booking link survives the saved draft and is cleared with the cart`() {
        CartStore.startBookingCart(prepare(), emptyMap())
        val saved = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        assertNull(CartStore.bookingRequestId.value)
        CartStore.applyDraftJson(saved)
        assertEquals(12, CartStore.bookingRequestId.value)
        assertEquals(3, CartStore.bookingOutletId.value)
    }

    @Test
    fun `a draft saved before #1124 has no booking`() {
        CartStore.addProduct(product(1, 100.0))
        val saved = CartStore.draftJson().apply { remove("bookingRequestId"); remove("bookingOutletId") }
        CartStore.applyDraftJson(saved)
        assertNull(CartStore.bookingRequestId.value)
        assertNull(CartStore.bookingOutletId.value)
    }

    @Test
    fun `the order request carries the booking and its outlet`() {
        CartStore.startBookingCart(prepare(), mapOf(7 to product(7, 250_000.0)))
        assertEquals(12, CartOrderSubmit.bookingRequestId())
        assertEquals(3, CartOrderSubmit.orderOutletId(merchantFilterId = 9))
        CartStore.clear(persistToDisk = false)
        assertNull(CartOrderSubmit.bookingRequestId())
        assertEquals(9, CartOrderSubmit.orderOutletId(merchantFilterId = 9))
    }
}
