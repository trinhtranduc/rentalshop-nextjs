package com.anyrent.pos.domain.customers

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #387 — initials, name split / payload, phone duplicate, parsing, row and tile formatting */
class CustomerRulesTest {
    private fun row(id: Int, phone: String?, first: String = "A") =
        CustomerRow(id, first, null, phone, null, null, orderCount = 0, tier = null)

    @Test
    fun `initials use the last two words`() {
        assertEquals("TL", CustomerRules.initials("Nguyễn Thị Lan"))
        assertEquals("TM", CustomerRules.initials("Trần Minh"))
        assertEquals("M", CustomerRules.initials("minh"))
        assertEquals("?", CustomerRules.initials("  "))
        assertEquals("?", CustomerRules.initials("—"))
    }

    @Test
    fun `display name falls back to the phone`() {
        assertEquals("Nguyễn Thị Lan", CustomerRules.displayName("Nguyễn", "Thị Lan", null))
        assertEquals("0901", CustomerRules.displayName(" ", null, "0901"))
        assertEquals("—", CustomerRules.displayName("", null, null))
    }

    @Test
    fun `name split matches the iOS form`() {
        assertEquals("Nguyễn" to "Thị Lan", CustomerRules.splitName("Nguyễn Thị Lan"))
        assertEquals("Lan" to "", CustomerRules.splitName("  Lan  "))
        assertEquals("Trần" to "Văn Minh", CustomerRules.splitName("Trần   Văn  Minh"))
    }

    @Test
    fun `payload sends only filled fields`() {
        val full = CustomerRules.createPayload("Nguyễn Thị Lan", " 0901 234 567 ", "size M")
        assertEquals("Nguyễn", full.getString("firstName"))
        assertEquals("Thị Lan", full.getString("lastName"))
        assertEquals("0901 234 567", full.getString("phone"))
        assertEquals("size M", full.getString("notes"))
        assertEquals(4, full.length())
        val short = CustomerRules.createPayload("Lan", "0901234567", "  ")
        assertEquals(setOf("firstName", "phone"), short.keys().asSequence().toSet())
    }

    @Test
    fun `validation needs the phone then the name`() {
        assertEquals(CustomerRules.FormProblem.MISSING_PHONE, CustomerRules.validate("Lan", " - "))
        assertEquals(CustomerRules.FormProblem.MISSING_NAME, CustomerRules.validate(" ", "0901"))
        assertNull(CustomerRules.validate("Lan", "0901"))
    }

    @Test
    fun `duplicate matches the same digits only`() {
        val spaced = row(7, "0901 234 567")
        val longer = row(8, "0901234567 8")
        val none = row(9, null)
        assertEquals(7, CustomerRules.duplicate("0901-234-567", listOf(longer, none, spaced))?.id)
        assertNull(CustomerRules.duplicate("090123456", listOf(spaced, longer)))
        assertNull(CustomerRules.duplicate("", listOf(none)))
    }

    @Test
    fun `list page parses with missing optional fields`() {
        val data = JSONObject(
            """
            {"customers":[
              {"id":60,"firstName":"Heather","lastName":"Robinson","phone":"+1-555-1029","orderCount":2,
               "loyaltyStatus":"active","loyalty":{"tier":{"id":1,"name":"Vàng"}}},
              {"id":61,"firstName":"Bare","lastName":null,"_count":{"orders":5}},
              {"id":62,"firstName":"Off","loyaltyStatus":"inactive","loyalty":{"tier":{"name":"Bạc"}}}
            ]}
            """.trimIndent(),
        )
        val page = CustomerRules.parsePage(data)
        assertEquals(3, page.total)
        assertFalse(page.hasMore)
        assertEquals("Vàng", page.rows[0].tier)
        assertEquals(2, page.rows[0].orderCount)
        assertNull(page.rows[1].lastName)
        assertNull(page.rows[1].phone)
        assertEquals(5, page.rows[1].orderCount)
        assertNull(page.rows[2].tier)
        assertEquals(60, page.rows[0].toCustomer().id)
        assertEquals("Robinson", page.rows[0].toCustomer().lastName)
    }

    @Test
    fun `detail parses the summary rows and snapshot`() {
        val data = JSONObject(
            """
            {"orders":[
              {"id":126,"orderNumber":"148148","orderType":"RENT","status":"PICKUPED","totalAmount":700000,
               "pickupPlanAt":"2026-10-03T03:00:00.000Z","returnPlanAt":"2026-10-05T10:00:00.000Z",
               "createdAt":"2026-10-01T03:08:06.097Z","_count":{"orderItems":2}},
              {"id":127,"status":"something_new","pickupPlanAt":null}
            ],"total":12,"summary":{"totalOrders":12,"totalAmount":8450000},
            "customer":{"id":60,"firstName":"Lan","lastName":null,"phone":"0901234567","loyaltyStatus":"inactive","loyalty":null}}
            """.trimIndent(),
        )
        val orders = CustomerRules.parseOrders(data)
        assertEquals(12, orders.totalOrders)
        assertEquals(8_450_000.0, orders.totalAmount, 0.0)
        assertEquals("Lan", orders.firstName)
        assertNull(orders.lastName)
        assertEquals("0901234567", orders.phone)
        assertNull(orders.tier)
        assertEquals(2, orders.orders[0].itemCount)
        assertEquals("PICKUPED", orders.orders[0].status)
        val bare = orders.orders[1]
        assertEquals("127", bare.orderNumber)
        assertEquals("SOMETHING_NEW", bare.status)
        assertEquals(0.0, bare.totalAmount, 0.0)
        assertNull(bare.pickupPlanAt)
        assertEquals(0, bare.itemCount)

        val empty = CustomerRules.parseOrders(JSONObject("""{"orders":[],"total":3}"""))
        assertEquals(3, empty.totalOrders)
        assertEquals(0.0, empty.totalAmount, 0.0)
        assertNull(empty.phone)
    }

    @Test
    fun `row subtitle masks the phone`() {
        assertEquals("09xxxx099 · 12 đơn", CustomerRules.subtitle("0901234099", "12 đơn"))
        assertEquals("12 đơn", CustomerRules.subtitle(null, "12 đơn"))
        assertEquals("12 đơn", CustomerRules.subtitle("  ", "12 đơn"))
        assertEquals("0901", CustomerRules.maskPhone("0901"))
    }

    @Test
    fun `tiles show dashes for unknown values`() {
        val titles = Triple("Số đơn", "Tổng chi", "Đang thuê")
        val money = { v: Double -> "${v.toLong()}đ" }
        assertEquals(listOf("12", "8450000đ", "1"), CustomerRules.tiles(titles, 12, 8_450_000.0, 1, money).map { it.value })
        assertEquals(listOf("0", "—", "—"), CustomerRules.tiles(titles, 0, null, null, money).map { it.value })
        assertEquals("Đang thuê", CustomerRules.tiles(titles, 0, null, null, money)[2].title)
    }

    @Test
    fun `order title and dates use civil days`() {
        val vn = ZoneId.of("Asia/Ho_Chi_Minh")
        val utc = ZoneId.of("UTC")
        val fmt = { i: Instant -> i.atZone(vn).toLocalDate().toString() }
        val rent = CustomerOrderRow(1, "ORD-1-57", "RENT", "PICKUPED", 1.0,
            Instant.parse("2026-10-03T03:00:00Z"), Instant.parse("2026-10-05T10:00:00Z"), null, 2)
        assertEquals("#ORD-1-57 · 2 món", CustomerRules.orderTitle(rent, "2 món"))
        assertEquals("2026-10-03 → 2026-10-05", CustomerRules.orderDates(rent, vn, fmt))
        // 16:59:59Z is 23:59 in Vietnam: still the pickup day, so one date
        val sameDay = rent.copy(returnPlanAt = Instant.parse("2026-10-03T16:59:59Z"))
        assertEquals("2026-10-03", CustomerRules.orderDates(sameDay, vn, fmt))
        // Pickup 17:30Z is already 4 Oct in Vietnam but 3 Oct in UTC; the zone decides
        val evening = rent.copy(pickupPlanAt = Instant.parse("2026-10-03T17:30:00Z"), returnPlanAt = Instant.parse("2026-10-04T03:00:00Z"))
        assertEquals("2026-10-04", CustomerRules.orderDates(evening, vn, fmt))
        assertEquals("2026-10-04 → 2026-10-04", CustomerRules.orderDates(evening, utc, fmt))
        val sale = rent.copy(orderType = "SALE", pickupPlanAt = null, returnPlanAt = null, createdAt = Instant.parse("2026-10-01T03:00:00Z"))
        assertEquals("2026-10-01", CustomerRules.orderDates(sale, vn, fmt))
    }
}
