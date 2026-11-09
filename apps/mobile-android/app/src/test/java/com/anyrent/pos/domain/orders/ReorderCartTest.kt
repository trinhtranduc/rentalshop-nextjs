package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1515 "Đặt lại": what an old order gives the new cart (spec cases 1, 2, 3, 5, 9) and the detail's 3-button row */
class ReorderCartTest {
    private fun item(productId: Int, qty: Int, note: String? = null, price: Double = 1.0) = OrderItem(
        id = productId, productId = productId, productName = "P$productId", quantity = qty, unitPrice = price, totalPrice = price * qty, note = note,
    )

    private fun order(
        type: String = "RENT",
        status: String = "RETURNED",
        customer: Customer? = Customer(id = 7, firstName = "An", lastName = "Nguyễn", phone = "0901234567", email = null, address = null),
        notes: String? = "Giao trước 8h",
        items: List<OrderItem> = listOf(item(11, 1, "Đã sửa gấu", 200_000.0), item(12, 2, null, 80_000.0)),
    ) = OrderDetail(
        summary = OrderSummary(
            id = 501, orderNumber = "482913", orderType = type, status = status, totalAmount = 410_000.0, depositAmount = 300_000.0,
            customerName = "An Nguyễn", customerPhone = "0901234567", pickupPlanAt = "2026-10-10T02:00:00.000Z",
            returnPlanAt = "2026-10-12T16:59:59.000Z", createdAt = null, notes = notes,
        ),
        items = items,
        customerId = customer?.id,
        payments = emptyList(),
        securityDeposit = 500_000.0,
        collateralDetails = "CCCD",
        discountType = "amount", discountValue = 50_000.0, discountAmount = 50_000.0,
        outletId = 3,
        customer = customer,
    )

    @Test fun `case 1 type, customer, notes and each line keep, price and discount and deposit and dates do not come along`() {
        val plan = ReorderCart.plan(order())
        assertEquals("RENT", plan.orderType)
        assertEquals(7, plan.customer?.id)
        assertEquals("Giao trước 8h", plan.notes)
        assertEquals(
            listOf(ReorderCart.Item(11, 1, "Đã sửa gấu"), ReorderCart.Item(12, 2, null)),
            plan.items,
        )
        assertEquals(0, plan.unreadable)
    }

    @Test fun `case 2 a retail sale has no customer and is a sale`() {
        val plan = ReorderCart.plan(order(type = "SALE", status = "COMPLETED", customer = null, notes = null, items = listOf(item(12, 3))))
        assertEquals("SALE", plan.orderType)
        assertNull(plan.customer)
        assertEquals("", plan.notes)
        assertEquals(listOf(ReorderCart.Item(12, 3, null)), plan.items)
    }

    @Test fun `a line with no product id is counted as unreadable and left out`() {
        val plan = ReorderCart.plan(order(items = listOf(item(0, 1), item(12, 2))))
        assertEquals(listOf(12), plan.items.map { it.productId })
        assertEquals(1, plan.unreadable)
    }

    @Test fun `case 5 a cancelled order plans like any other`() {
        val plan = ReorderCart.plan(order(status = "CANCELLED"))
        assertEquals(2, plan.items.size)
    }

    @Test fun `a quantity below 1 becomes 1 and a blank note is no note`() {
        val plan = ReorderCart.plan(order(items = listOf(item(11, 0, "  "))))
        assertEquals(listOf(ReorderCart.Item(11, 1, null)), plan.items)
    }

    @Test fun `case 9 only a user with orders create may reorder`() {
        assertTrue(ReorderCart.canReorder(setOf("orders.create", "orders.view"), "OUTLET_STAFF"))
        assertFalse(ReorderCart.canReorder(setOf("orders.view"), "OUTLET_STAFF"))
        // a session signed in before the permission list existed: every shop role may create orders
        assertTrue(ReorderCart.canReorder(null, "OUTLET_STAFF"))
        assertFalse(ReorderCart.canReorder(null, null))
    }

    @Test fun `the row has Đặt lại, Chia sẻ, Ghi chú and without orders create only the last two`() {
        assertEquals(
            listOf(ReorderCart.Quick.REORDER, ReorderCart.Quick.SHARE, ReorderCart.Quick.NOTES),
            ReorderCart.quickButtons(canReorder = true),
        )
        assertEquals(listOf(ReorderCart.Quick.SHARE, ReorderCart.Quick.NOTES), ReorderCart.quickButtons(canReorder = false))
    }

    @Test fun `the notes count adds the text and the photos`() {
        assertEquals(0, ReorderCart.notesCount(null, 0))
        assertEquals(0, ReorderCart.notesCount("  ", 0))
        assertEquals(1, ReorderCart.notesCount("khách lấy thêm", 0))
        assertEquals(2, ReorderCart.notesCount(null, 2))
        assertEquals(3, ReorderCart.notesCount("khách lấy thêm", 2))
    }
}
