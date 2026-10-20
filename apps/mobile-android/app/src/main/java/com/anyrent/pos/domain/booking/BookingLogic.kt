package com.anyrent.pos.domain.booking

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.OffsetDateTime
import kotlin.math.ceil

/** #1124 status of an online booking request (`GET /api/booking-requests`); a new server value is [UNKNOWN] */
enum class BookingStatus(val apiValue: String) {
    PENDING("PENDING"),
    CONFIRMED("CONFIRMED"),
    REJECTED("REJECTED"),
    EXPIRED("EXPIRED"),
    CANCELLED("CANCELLED"),
    UNKNOWN("");

    companion object {
        fun from(raw: String?): BookingStatus = entries.firstOrNull { it != UNKNOWN && it.apiValue == raw } ?: UNKNOWN

        /** The list tabs, in order (iOS: no "Đã huỷ" tab) */
        val tabs = listOf(PENDING, CONFIRMED, REJECTED, EXPIRED)
    }
}

/** `POST /api/booking-requests/{id}/reject` reasons; OTHER needs a note */
enum class BookingRejectReason(val apiValue: String) {
    OUT_OF_STOCK("OUT_OF_STOCK"),
    CANNOT_CONTACT("CANNOT_CONTACT"),
    OTHER("OTHER"),
}

data class BookingRequestItem(
    val productId: Int,
    val productName: String,
    val quantity: Int,
    val unitPrice: Double?,
    /** Detail only: the first shop day the outlet has fewer free units than asked, null when every day is covered */
    val shortDay: String? = null,
)

/** The shop's customer with the booking's phone (detail), or the one "Xác nhận" found or created (prepare) */
data class BookingCustomerRef(val id: Int, val firstName: String, val lastName: String?, val phone: String?) {
    val fullName: String get() = listOfNotNull(firstName, lastName).joinToString(" ").trim()
}

data class BookingOutletRef(val id: Int?, val name: String?)

data class BookingRequest(
    val id: Int,
    val code: String,
    val status: BookingStatus,
    val customerName: String,
    val customerPhone: String,
    val note: String?,
    val outlet: BookingOutletRef?,
    /** Shop day keys "2026-10-21" */
    val pickupDate: String,
    val returnDate: String,
    val pickupPlanAt: String?,
    val returnPlanAt: String?,
    val itemCount: Int,
    val items: List<BookingRequestItem>,
    val orderId: Int?,
    val rejectReason: String?,
    val rejectNote: String?,
    val expiresAt: Instant?,
    val createdAt: Instant?,
    /** Detail only: a returning customer (same phone in this shop) */
    val customer: BookingCustomerRef? = null,
)

data class BookingRequestList(
    val requests: List<BookingRequest>,
    val counts: Map<String, Int>,
    val total: Int,
    val page: Int,
    val hasMore: Boolean,
) {
    val pendingCount: Int get() = counts[BookingStatus.PENDING.apiValue] ?: 0
}

data class BookingPrepareItem(val productId: Int, val quantity: Int, val productName: String)

/** `POST /api/booking-requests/{id}/prepare`: what the new cart is filled with */
data class BookingPrepare(
    val bookingRequestId: Int,
    val orderType: String,
    val outletId: Int?,
    val customer: BookingCustomerRef?,
    val customerCreated: Boolean,
    val pickupPlanAt: String?,
    val returnPlanAt: String?,
    val notes: String?,
    val items: List<BookingPrepareItem>,
)

/** #1124 "Đặt online": parsing, gating, labels and push routing (iOS `BookingLogic`) */
object BookingLogic {
    const val VIEW_PERMISSION = "bookings.view"
    const val MANAGE_PERMISSION = "bookings.manage"
    const val TYPE_BOOKING_REQUEST = "BOOKING_REQUEST"

    /** Roles that have both booking permissions on the API; used when the session has no permission list yet */
    private val BOOKING_ROLES = setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF")

    private fun JSONObject.str(key: String): String? =
        (opt(key) as? String)?.trim()?.takeIf { it.isNotEmpty() }

    private fun JSONObject.int(key: String): Int? = when (val v = opt(key)) {
        is Number -> v.toInt()
        is String -> v.trim().toIntOrNull()
        else -> null
    }

    private fun JSONObject.dbl(key: String): Double? = (opt(key) as? Number)?.toDouble()

    private fun data(json: JSONObject): JSONObject = json.optJSONObject("data") ?: json

    fun instant(raw: String?): Instant? = raw?.let {
        runCatching { Instant.parse(it) }.getOrNull() ?: runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull()
    }

    private fun customer(o: JSONObject?): BookingCustomerRef? {
        val id = o?.int("id") ?: return null
        return BookingCustomerRef(id, o.str("firstName").orEmpty(), o.str("lastName"), o.str("phone"))
    }

    private fun items(arr: JSONArray?): List<BookingRequestItem> = (0 until (arr?.length() ?: 0)).mapNotNull { i ->
        val o = arr!!.optJSONObject(i) ?: return@mapNotNull null
        BookingRequestItem(
            productId = o.int("productId") ?: 0,
            productName = o.str("productName").orEmpty(),
            quantity = o.int("quantity") ?: 0,
            unitPrice = o.dbl("unitPrice"),
            shortDay = o.str("shortDay"),
        )
    }

    fun parseRequest(o: JSONObject): BookingRequest {
        val outlet = o.optJSONObject("outlet")
        return BookingRequest(
            id = o.int("id") ?: 0,
            code = o.str("code").orEmpty(),
            status = BookingStatus.from(o.str("status")),
            customerName = o.str("customerName").orEmpty(),
            customerPhone = o.str("customerPhone").orEmpty(),
            note = o.str("note"),
            outlet = outlet?.let { BookingOutletRef(it.int("id"), it.str("name")) },
            pickupDate = o.str("pickupDate").orEmpty(),
            returnDate = o.str("returnDate").orEmpty(),
            pickupPlanAt = o.str("pickupPlanAt"),
            returnPlanAt = o.str("returnPlanAt"),
            itemCount = o.int("itemCount") ?: 0,
            items = items(o.optJSONArray("items")),
            orderId = o.int("orderId"),
            rejectReason = o.str("rejectReason"),
            rejectNote = o.str("rejectNote"),
            expiresAt = instant(o.str("expiresAt")),
            createdAt = instant(o.str("createdAt")),
            customer = customer(o.optJSONObject("customer")),
        )
    }

    /** `GET /api/booking-requests` envelope */
    fun parseList(json: JSONObject): BookingRequestList {
        val d = data(json)
        val arr = d.optJSONArray("requests")
        val counts = d.optJSONObject("counts")
        return BookingRequestList(
            requests = (0 until (arr?.length() ?: 0)).mapNotNull { arr!!.optJSONObject(it)?.let(::parseRequest) },
            counts = counts?.keys()?.asSequence()?.associateWith { counts.optInt(it) }.orEmpty(),
            total = d.int("total") ?: 0,
            page = d.int("page") ?: 1,
            hasMore = d.optBoolean("hasMore", false),
        )
    }

    /** `GET /api/booking-requests/{id}` envelope */
    fun parseDetail(json: JSONObject): BookingRequest = parseRequest(data(json))

    /** `POST /api/booking-requests/{id}/prepare` envelope */
    fun parsePrepare(json: JSONObject): BookingPrepare {
        val d = data(json)
        val arr = d.optJSONArray("items")
        return BookingPrepare(
            bookingRequestId = d.int("bookingRequestId") ?: 0,
            orderType = d.str("orderType") ?: "RENT",
            outletId = d.int("outletId"),
            customer = customer(d.optJSONObject("customer")),
            customerCreated = d.optBoolean("customerCreated", false),
            pickupPlanAt = d.str("pickupPlanAt"),
            returnPlanAt = d.str("returnPlanAt"),
            notes = d.str("notes"),
            items = (0 until (arr?.length() ?: 0)).mapNotNull { i ->
                val o = arr!!.optJSONObject(i) ?: return@mapNotNull null
                BookingPrepareItem(o.int("productId") ?: 0, o.int("quantity") ?: 1, o.str("productName").orEmpty())
            },
        )
    }

    fun rejectBody(reason: BookingRejectReason, note: String?): JSONObject = JSONObject()
        .put("reason", reason.apiValue)
        .apply { note?.trim()?.takeIf { it.isNotEmpty() }?.let { put("note", it) } }

    /** The login's permission list; a session signed in before #1124 has none, so the role decides */
    private fun hasPermission(permission: String, permissions: Set<String>?, role: String?): Boolean =
        permissions?.contains(permission) ?: (role?.uppercase() in BOOKING_ROLES)

    fun isAvailable(featureOn: Boolean, merchantEnabled: Boolean, permissions: Set<String>?, role: String?): Boolean =
        featureOn && merchantEnabled && hasPermission(VIEW_PERMISSION, permissions, role)

    fun canManage(permissions: Set<String>?, role: String?): Boolean = hasPermission(MANAGE_PERMISSION, permissions, role)

    fun hasShortItem(items: List<BookingRequestItem>): Boolean = items.any { it.shortDay != null }

    /** "21/10 → 24/10" (one day: "21/10") from shop day keys */
    fun dateRange(pickup: String, returnDay: String): String {
        val a = dayMonth(pickup)
        val b = dayMonth(returnDay)
        return if (a == b) a else "$a → $b"
    }

    fun dayMonth(ymd: String): String {
        val parts = ymd.split("-")
        return if (parts.size == 3) "${parts[2]}/${parts[1]}" else ymd
    }

    /** Whole hours left before the request expires (rounded up, never below 0) */
    fun hoursLeft(expiresAt: Instant, now: Instant = Instant.now()): Int =
        maxOf(0, ceil((expiresAt.toEpochMilli() - now.toEpochMilli()) / 3_600_000.0).toInt())

    fun badgeText(count: Int): String = if (count > 99) "99+" else count.toString()

    /** The request a `BOOKING_REQUEST` push opens; null for any other push */
    fun requestIdFromPush(data: Map<String, String?>): Int? {
        if (data["type"] != TYPE_BOOKING_REQUEST) return null
        return data["bookingRequestId"]?.trim()?.toIntOrNull()?.takeIf { it > 0 }
    }

    /** The request an inbox row opens (`type` + `data.bookingRequestId`); null for any other row */
    fun requestIdFromInbox(type: String?, data: JSONObject?): Int? {
        if (type != TYPE_BOOKING_REQUEST || data == null) return null
        return data.int("bookingRequestId")?.takeIf { it > 0 }
    }

    /** The order of a booking goes to the booking's outlet; any other order to the chosen branch (#828) */
    fun orderOutletId(bookingOutletId: Int?, merchantFilterId: Int?): Int? = bookingOutletId ?: merchantFilterId
}
