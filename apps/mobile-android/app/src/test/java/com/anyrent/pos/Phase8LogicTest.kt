package com.anyrent.pos

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.optionalAmount
import com.anyrent.pos.domain.calendar.CalendarDayOrder
import com.anyrent.pos.domain.calendar.CalendarDayRow
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.calendar.CalendarNote
import com.anyrent.pos.domain.calendar.CalendarRowKind
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.ui.orders.v2.DateBasis
import com.anyrent.pos.ui.orders.v2.DateRangeChoice
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.OrdersSort
import com.anyrent.pos.ui.orders.v2.PayLine
import com.anyrent.pos.ui.orders.v2.RentOrdersFilter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** #390 — balances on rows, nearest-task sort, planned ranges, calendar notes, product delete, extend rental */
class Phase8LogicTest {
    private val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
    private val utc = ZoneId.of("UTC")

    private fun order(status: String = "RESERVED", amountDue: Double? = null, refundDue: Double? = null) = OrderSummary(
        id = 1, orderNumber = "ORD-1-0001", orderType = "RENT", status = status, totalAmount = 300000.0,
        depositAmount = 0.0, customerName = "Lan", customerPhone = null, pickupPlanAt = null, returnPlanAt = null,
        createdAt = null, notes = null, amountDue = amountDue, refundDue = refundDue,
    )

    // --- 1. Row pay line ---

    @Test
    fun `row pay line follows the list balances`() {
        assertEquals(PayLine.Due(300000.0), OrdersBoardLogic.listPayLine(order(amountDue = 300000.0, refundDue = 0.0)))
        assertEquals(PayLine.Refund(500000.0), OrdersBoardLogic.listPayLine(order(status = "PICKUPED", amountDue = 0.0, refundDue = 500000.0)))
        // Refund wins when both are set
        assertEquals(PayLine.Refund(10.0), OrdersBoardLogic.listPayLine(order(amountDue = 5.0, refundDue = 10.0)))
        assertEquals(PayLine.Paid, OrdersBoardLogic.listPayLine(order(status = "RETURNED", amountDue = 0.0, refundDue = 0.0)))
    }

    @Test
    fun `no pay line without balances or for a cancelled order`() {
        assertNull(OrdersBoardLogic.listPayLine(order(amountDue = null, refundDue = null)))
        assertNull(OrdersBoardLogic.listPayLine(order(status = "CANCELLED", amountDue = 0.0, refundDue = 0.0)))
        // One field alone is enough
        assertEquals(PayLine.Due(7.0), OrdersBoardLogic.listPayLine(order(amountDue = 7.0)))
    }

    @Test
    fun `optional amounts read absent and null as missing`() {
        val json = JSONObject("""{"amountDue":120000,"refundDue":null,"lateFee":"x"}""")
        assertEquals(120000.0, optionalAmount(json, "amountDue")!!, 0.0)
        assertNull(optionalAmount(json, "refundDue"))
        assertNull(optionalAmount(json, "lateFee"))
        assertNull(optionalAmount(json, "missing"))
    }

    // --- 2. Filter sheet ---

    @Test
    fun `nearest task is the first sort and planned days are the range basis`() {
        assertEquals(OrdersSort.NEAREST_TASK, OrdersSort.entries.first())
        assertEquals("nearestTask", OrdersSort.NEAREST_TASK.apiField)
        assertEquals(listOf("createdAt", "pickupPlanAt", "returnPlanAt"), DateBasis.entries.map { it.apiField })
        // Default stays "Mới tạo nhất"
        assertEquals(OrdersSort.CREATED, RentOrdersFilter().sort)
        assertTrue(RentOrdersFilter().isDefault)
        assertFalse(RentOrdersFilter(sort = OrdersSort.NEAREST_TASK).isDefault)
    }

    @Test
    fun `planned range query uses vietnam days`() {
        val now = Instant.parse("2026-10-03T18:30:00Z") // 04/10 01:30 in Vietnam
        val query = OrdersBoardLogic.rentQuery(
            RentOrdersFilter(sort = OrdersSort.NEAREST_TASK, basis = DateBasis.PICKUP_PLAN, range = DateRangeChoice.Next7Days),
            1, now, vietnam,
        )
        assertEquals("nearestTask", query.sortBy)
        assertEquals("pickupPlanAt", query.dateField)
        assertEquals("2026-10-04", query.startDate)
        assertEquals("2026-10-10", query.endDate)
        val utcQuery = OrdersBoardLogic.rentQuery(RentOrdersFilter(basis = DateBasis.RETURN_PLAN, range = DateRangeChoice.Today), 1, now, utc)
        assertEquals("returnPlanAt", utcQuery.dateField)
        assertEquals("2026-10-03", utcQuery.startDate)
    }

    // --- 3. Calendar note ---

    private fun calendarRow(kind: CalendarRowKind, late: Int, amountDue: Double? = null, refundDue: Double? = null, lateFee: Double? = null) =
        CalendarDayRow(
            kind,
            CalendarDayOrder(1, "ORD-1-1", "Lan", "PICKUPED", "RENT", 600000.0, "Áo dài", amountDue, refundDue, lateFee),
            late,
        )

    @Test
    fun `calendar note`() {
        assertEquals(CalendarNote.Late(2, 150000.0), CalendarLogic.note(calendarRow(CalendarRowKind.TAKE_BACK, 2, lateFee = 150000.0)))
        assertEquals(CalendarNote.Late(1, null), CalendarLogic.note(calendarRow(CalendarRowKind.TAKE_BACK, 1, lateFee = 0.0)))
        assertEquals(CalendarNote.Due(700000.0), CalendarLogic.note(calendarRow(CalendarRowKind.HAND_OVER, 0, amountDue = 700000.0, refundDue = 0.0)))
        assertEquals(CalendarNote.Refund(500000.0), CalendarLogic.note(calendarRow(CalendarRowKind.TAKE_BACK, 0, amountDue = 0.0, refundDue = 500000.0)))
        assertEquals(CalendarNote.None, CalendarLogic.note(calendarRow(CalendarRowKind.HAND_OVER, 0, amountDue = 0.0, refundDue = 0.0)))
        // Older API: no money fields
        assertEquals(CalendarNote.None, CalendarLogic.note(calendarRow(CalendarRowKind.HAND_OVER, 0)))
        // Hidden money keeps the late days only
        assertEquals(CalendarNote.Late(2, null), CalendarLogic.note(calendarRow(CalendarRowKind.TAKE_BACK, 2, lateFee = 9.0), hidesMoney = true))
        assertEquals(CalendarNote.None, CalendarLogic.note(calendarRow(CalendarRowKind.HAND_OVER, 0, amountDue = 9.0), hidesMoney = true))
    }

    @Test
    fun `calendar rows parse the money fields`() {
        val orders = CalendarLogic.dayOrdersFromJson(JSONObject("""
            {"orders":[{"id":5,"orderNumber":"ORD-1-5","totalAmount":600000,"amountDue":0,"refundDue":500000,"lateFee":150000},
                       {"id":6,"orderNumber":"ORD-1-6","totalAmount":100}]}
        """.trimIndent()))
        assertEquals(500000.0, orders[0].refundDue!!, 0.0)
        assertEquals(150000.0, orders[0].lateFee!!, 0.0)
        assertNull(orders[1].amountDue)
        assertNull(orders[1].lateFee)
    }

    // --- 4. Product delete ---

    @Test
    fun `only roles with products manage delete`() {
        assertTrue(ProductAccess.canDelete(UserRole.MERCHANT))
        assertTrue(ProductAccess.canDelete(UserRole.OUTLET_ADMIN))
        assertTrue(ProductAccess.canDelete(UserRole.ADMIN))
        assertFalse(ProductAccess.canDelete(UserRole.OUTLET_STAFF))
        assertFalse(ProductAccess.canDelete(UserRole.UNKNOWN))
    }

    @Test
    fun `open orders conflict has its own message`() {
        assertEquals(R.string.api_error_product_has_open_orders, ApiErrorMessages.stringId("PRODUCT_HAS_OPEN_ORDERS"))
    }

    // --- 5. Extend rental ---

    @Test
    fun `extend only open rentals with orders update`() {
        assertTrue(RentalExtension.canExtend("RENT", "RESERVED", canUpdateOrders = true))
        assertTrue(RentalExtension.canExtend("RENT", "PICKUPED", canUpdateOrders = true))
        assertFalse(RentalExtension.canExtend("RENT", "RETURNED", canUpdateOrders = true))
        assertFalse(RentalExtension.canExtend("RENT", "CANCELLED", canUpdateOrders = true))
        assertFalse(RentalExtension.canExtend("SALE", "RESERVED", canUpdateOrders = true))
        assertFalse(RentalExtension.canExtend("RENT", "PICKUPED", canUpdateOrders = false))
    }

    @Test
    fun `current return day is the device day of the instant`() {
        // 05/10 23:59:59 in Vietnam, as the cart sends it
        val raw = "2026-10-05T16:59:59.000Z"
        assertEquals(LocalDate.of(2026, 10, 5), RentalExtension.currentReturnDay(raw, vietnam))
        assertEquals(LocalDate.of(2026, 10, 6), RentalExtension.firstSelectableDay(LocalDate.of(2026, 10, 5)))
        assertNull(RentalExtension.currentReturnDay(null, vietnam))
    }

    @Test
    fun `window covers only the extra days`() {
        val old = LocalDate.of(2026, 10, 5)
        assertNull(RentalExtension.window(old, old))
        assertNull(RentalExtension.window(old, old.minusDays(1)))
        val window = RentalExtension.window(old, LocalDate.of(2026, 10, 8))!!
        assertEquals(LocalDate.of(2026, 10, 6), window.first)
        assertEquals(LocalDate.of(2026, 10, 8), window.second)
        assertEquals(3, RentalExtension.extraDays(old, LocalDate.of(2026, 10, 8)))
        // One extra day: start and end are the same day, which is still occupied
        assertEquals(LocalDate.of(2026, 10, 6) to LocalDate.of(2026, 10, 6), RentalExtension.window(old, LocalDate.of(2026, 10, 6)))
        // Across a month
        assertEquals(LocalDate.of(2026, 11, 1) to LocalDate.of(2026, 11, 2), RentalExtension.window(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 2)))
    }

    @Test
    fun `new return instant is the last second of the day in the device zone`() {
        assertEquals("2026-10-08T16:59:59.000Z", RentalExtension.returnPlanAt(LocalDate.of(2026, 10, 8), vietnam))
        assertEquals("2026-10-08T23:59:59.000Z", RentalExtension.returnPlanAt(LocalDate.of(2026, 10, 8), utc))
    }

    @Test
    fun `availability lines sum the quantity per product`() {
        fun item(productId: Int, qty: Int, name: String) = OrderItem(null, productId, name, qty, 0.0, 0.0)
        val lines = RentalExtension.lines(listOf(item(1, 1, "Vest"), item(2, 2, "Áo dài"), item(1, 2, "Vest")))
        assertEquals(listOf(1 to 3, 2 to 2), lines.map { it.productId to it.quantity })
        assertEquals("Vest", lines.first().productName)
    }
}
