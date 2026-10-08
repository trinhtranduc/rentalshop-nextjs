package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.ui.orders.v2.entityPeriodRange
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #482 — orders by product / customer: header figures (iOS `EntityOrdersLogic` parity) */
class EntityOrdersLogicTest {
    private fun order(id: Int, status: String, type: String = "RENT", total: Double, lines: Map<Int, Double>) = OrderSummary(
        id = id, orderNumber = "ORD-1-$id", orderType = type, status = status, totalAmount = total, depositAmount = 0.0,
        customerName = "Tâm", customerPhone = null, pickupPlanAt = null, returnPlanAt = null, createdAt = null, notes = null,
        productTotals = lines,
    )

    private val money: (Double) -> String = { EntityOrdersLogic.compactMoney(it, { v -> "%,.0f".format(v).replace(',', '.') }) }

    private val orders = listOf(
        order(1, "PICKUPED", total = 450_000.0, lines = mapOf(4 to 450_000.0)),
        order(2, "RESERVED", total = 1_000_000.0, lines = mapOf(4 to 300_000.0, 9 to 700_000.0)),
        order(3, "RETURNED", total = 450_000.0, lines = mapOf(4 to 450_000.0)),
        order(4, "CANCELLED", total = 700_000.0, lines = mapOf(4 to 700_000.0)),
        order(5, "COMPLETED", type = "SALE", total = 900_000.0, lines = mapOf(4 to 900_000.0)),
    )

    @Test
    fun `product tiles count orders and rentals, no money (#658)`() {
        assertEquals(3, EntityOrdersLogic.rentals(orders))
        assertEquals(listOf("6", "3"), EntityOrdersLogic.productValues(orders, 6, hasMore = false))
        assertEquals(listOf("40", "3+"), EntityOrdersLogic.productValues(orders, 40, hasMore = true))
    }

    @Test
    fun `customer tiles and compact money`() {
        assertEquals(listOf("4", "3,2tr", "1"), EntityOrdersLogic.customerValues(4, 3_200_000.0, 1, hidesMoney = false, money = money))
        assertEquals(listOf("4", "—", "—"), EntityOrdersLogic.customerValues(4, null, null, hidesMoney = false, money = money))
        assertEquals("450.000", money(450_000.0))
        assertEquals("2tr", money(2_000_000.0))
        assertEquals("2tr", money(2_049_000.0))
        // Money of the non-cancelled orders: 450k + 1M + 450k + 900k (the cancelled 700k left out)
        assertEquals(2_800_000.0, EntityOrdersLogic.spent(orders), 0.1)
        assertEquals("VS-004 · Còn 1 hôm nay", EntityOrdersLogic.productSubtitle("VS-004", 1) { "Còn $it hôm nay" })
        assertEquals("VS-004", EntityOrdersLogic.productSubtitle("VS-004", 0) { "Còn $it hôm nay" })
    }

    @Test
    fun `list rows carry line totals per product`() {
        val items = JSONArray("""[{"productId":4,"quantity":1,"totalPrice":300000},{"product":{"id":9},"totalPrice":700000},{"productId":4,"totalPrice":50000}]""")
        assertEquals(mapOf(4 to 350_000.0, 9 to 700_000.0), ApiClient().orderItemTotals(items))
    }

    @Test
    fun `period chip range`() {
        assertNull(entityPeriodRange(null, null))
        assertEquals(true, entityPeriodRange("2026-09-29", "2026-10-05")!!.contains("29/09"))
        assertEquals(true, entityPeriodRange("2026-09-29", "2026-10-05")!!.contains("05/10"))
    }
}
