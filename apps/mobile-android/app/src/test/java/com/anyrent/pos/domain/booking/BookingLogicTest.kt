package com.anyrent.pos.domain.booking

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #1124 "Đặt online": mapping, gating, labels and push routing (iOS `BookingRequestTests`) */
class BookingLogicTest {
    private val row = """
        {"id":12,"code":"BK7Q2M","status":"PENDING","customerName":"Nguyễn Thị Mai","customerPhone":"0901234567",
         "note":"Lấy buổi sáng","outlet":{"id":3,"name":"Chi nhánh 1"},"pickupDate":"2026-10-21","returnDate":"2026-10-24",
         "pickupPlanAt":"2026-10-21T03:00:00.000Z","returnPlanAt":"2026-10-24T03:00:00.000Z","itemCount":3,
         "items":[{"productId":7,"productName":"Áo dài đỏ","quantity":2,"unitPrice":250000},
                  {"productId":8,"productName":"Khăn đóng","quantity":1,"unitPrice":null}],
         "orderId":null,"rejectReason":null,"rejectNote":null,
         "expiresAt":"2026-10-21T10:00:00.000Z","createdAt":"2026-10-20T10:00:00.000Z"}
    """.trimIndent()

    @Test
    fun `list maps the rows and the pending count`() {
        val json = JSONObject(
            """{"success":true,"data":{"requests":[$row],"counts":{"PENDING":4,"CONFIRMED":2,"REJECTED":0,"EXPIRED":1,"CANCELLED":0},
               "total":1,"page":1,"limit":20,"hasMore":false}}""",
        )
        val list = BookingLogic.parseList(json)
        assertEquals(1, list.requests.size)
        assertEquals(4, list.pendingCount)
        assertEquals(2, list.counts["CONFIRMED"])
        assertFalse(list.hasMore)
        val r = list.requests[0]
        assertEquals(12, r.id)
        assertEquals("BK7Q2M", r.code)
        assertEquals(BookingStatus.PENDING, r.status)
        assertEquals("Nguyễn Thị Mai", r.customerName)
        assertEquals("0901234567", r.customerPhone)
        assertEquals("Lấy buổi sáng", r.note)
        assertEquals(3, r.outlet?.id)
        assertEquals("Chi nhánh 1", r.outlet?.name)
        assertEquals("2026-10-21", r.pickupDate)
        assertEquals("2026-10-24", r.returnDate)
        assertEquals(3, r.itemCount)
        assertEquals(2, r.items.size)
        assertEquals(250000.0, r.items[0].unitPrice!!, 0.0)
        assertNull(r.items[1].unitPrice)
        assertNull(r.orderId)
        assertNull(r.customer)
        assertEquals(Instant.parse("2026-10-21T10:00:00Z"), r.expiresAt)
    }

    @Test
    fun `detail maps the returning customer and the short day`() {
        val detail = JSONObject(row)
            .put("items", org.json.JSONArray().put(JSONObject("""{"productId":7,"productName":"Áo dài đỏ","quantity":2,"unitPrice":250000,"shortDay":"2026-10-22"}""")))
            .put("customer", JSONObject("""{"id":41,"firstName":"Nguyễn Thị","lastName":"Mai","phone":"0901234567"}"""))
        val r = BookingLogic.parseDetail(JSONObject().put("success", true).put("data", detail))
        assertEquals("2026-10-22", r.items[0].shortDay)
        assertTrue(BookingLogic.hasShortItem(r.items))
        assertEquals(41, r.customer?.id)
        assertEquals("Nguyễn Thị Mai", r.customer?.fullName)
    }

    @Test
    fun `unknown status does not break the row`() {
        val r = BookingLogic.parseRequest(JSONObject(row).put("status", "SOMETHING_NEW"))
        assertEquals(BookingStatus.UNKNOWN, r.status)
        assertEquals(BookingStatus.CONFIRMED, BookingStatus.from("CONFIRMED"))
    }

    @Test
    fun `prepare maps the cart fields`() {
        val json = JSONObject(
            """{"success":true,"data":{"bookingRequestId":12,"orderType":"RENT","outletId":3,
               "customer":{"id":41,"firstName":"Nguyễn Thị","lastName":"Mai","phone":"0901234567"},"customerCreated":true,
               "pickupPlanAt":"2026-10-21T03:00:00.000Z","returnPlanAt":"2026-10-24T03:00:00.000Z","notes":"Lấy buổi sáng",
               "items":[{"productId":7,"quantity":2,"productName":"Áo dài đỏ"}]}}""",
        )
        val p = BookingLogic.parsePrepare(json)
        assertEquals(12, p.bookingRequestId)
        assertEquals(3, p.outletId)
        assertEquals(41, p.customer?.id)
        assertTrue(p.customerCreated)
        assertEquals("Lấy buổi sáng", p.notes)
        assertEquals(listOf(BookingPrepareItem(7, 2, "Áo dài đỏ")), p.items)
    }

    @Test
    fun `gating needs the feature, the shop switch and the view permission`() {
        val perms = setOf(BookingLogic.VIEW_PERMISSION, BookingLogic.MANAGE_PERMISSION)
        assertTrue(BookingLogic.isAvailable(featureOn = true, merchantEnabled = true, permissions = perms, role = "OUTLET_STAFF"))
        assertFalse(BookingLogic.isAvailable(featureOn = false, merchantEnabled = true, permissions = perms, role = "MERCHANT"))
        assertFalse(BookingLogic.isAvailable(featureOn = true, merchantEnabled = false, permissions = perms, role = "MERCHANT"))
        assertFalse(BookingLogic.isAvailable(featureOn = true, merchantEnabled = true, permissions = setOf("orders.view"), role = "MERCHANT"))
        assertTrue(BookingLogic.canManage(perms, "OUTLET_STAFF"))
        assertFalse(BookingLogic.canManage(setOf(BookingLogic.VIEW_PERMISSION), "OUTLET_STAFF"))
    }

    @Test
    fun `a session from before this version falls back to the role`() {
        for (role in listOf("MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF", "ADMIN")) {
            assertTrue(role, BookingLogic.isAvailable(featureOn = true, merchantEnabled = true, permissions = null, role = role))
            assertTrue(role, BookingLogic.canManage(null, role))
        }
        assertFalse(BookingLogic.isAvailable(featureOn = true, merchantEnabled = true, permissions = null, role = "OUTLET_INVENTORY"))
        assertFalse(BookingLogic.canManage(null, "OUTLET_INVENTORY"))
        assertFalse(BookingLogic.isAvailable(featureOn = true, merchantEnabled = true, permissions = null, role = null))
    }

    @Test
    fun `date range, hours left and badge`() {
        assertEquals("21/10 → 24/10", BookingLogic.dateRange("2026-10-21", "2026-10-24"))
        assertEquals("21/10", BookingLogic.dateRange("2026-10-21", "2026-10-21"))
        assertEquals("22/10", BookingLogic.dayMonth("2026-10-22"))
        val now = Instant.parse("2026-10-21T08:30:00Z")
        assertEquals(2, BookingLogic.hoursLeft(Instant.parse("2026-10-21T10:00:00Z"), now))
        assertEquals(0, BookingLogic.hoursLeft(Instant.parse("2026-10-21T08:00:00Z"), now))
        assertEquals("7", BookingLogic.badgeText(7))
        assertEquals("99+", BookingLogic.badgeText(120))
    }

    @Test
    fun `a BOOKING_REQUEST push opens its request, any other push does not`() {
        assertEquals(12, BookingLogic.requestIdFromPush(mapOf("type" to "BOOKING_REQUEST", "bookingRequestId" to "12", "code" to "BK7Q2M")))
        assertNull(BookingLogic.requestIdFromPush(mapOf("type" to "ORDER_CREATED", "bookingRequestId" to "12")))
        assertNull(BookingLogic.requestIdFromPush(mapOf("type" to "BOOKING_REQUEST")))
    }

    @Test
    fun `an inbox row of a booking opens its request`() {
        val data = JSONObject("""{"type":"BOOKING_REQUEST","bookingRequestId":"12","code":"BK7Q2M","outletId":"3"}""")
        assertEquals(12, BookingLogic.requestIdFromInbox("BOOKING_REQUEST", data))
        assertEquals(12, BookingLogic.requestIdFromInbox("BOOKING_REQUEST", JSONObject().put("bookingRequestId", 12)))
        assertNull(BookingLogic.requestIdFromInbox("ORDER_CREATED", data))
        assertNull(BookingLogic.requestIdFromInbox("BOOKING_REQUEST", null))
    }

    @Test
    fun `the order goes to the booking outlet, else the chosen branch`() {
        assertEquals(3, BookingLogic.orderOutletId(bookingOutletId = 3, merchantFilterId = 9))
        assertEquals(9, BookingLogic.orderOutletId(bookingOutletId = null, merchantFilterId = 9))
        assertNull(BookingLogic.orderOutletId(bookingOutletId = null, merchantFilterId = null))
    }

    @Test
    fun `reject reasons use the API values`() {
        assertEquals("OUT_OF_STOCK", BookingRejectReason.OUT_OF_STOCK.apiValue)
        assertEquals("CANNOT_CONTACT", BookingRejectReason.CANNOT_CONTACT.apiValue)
        assertEquals("OTHER", BookingRejectReason.OTHER.apiValue)
        assertEquals(JSONObject().put("reason", "OTHER").put("note", "Shop nghỉ").toString(),
            BookingLogic.rejectBody(BookingRejectReason.OTHER, "  Shop nghỉ ").toString())
        assertFalse(BookingLogic.rejectBody(BookingRejectReason.OUT_OF_STOCK, " ").has("note"))
    }
}
