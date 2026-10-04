package com.anyrent.pos.domain.customers

import com.anyrent.pos.data.model.Customer
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId

/**
 * Redesigned customer screens (#387, flag `newCustomers`, boards KH-chon, KH-moi, KH-ds, KH-chi-tiet).
 * Rows, response parsing and pure helpers; no Android types so it runs in unit tests.
 */
data class CustomerRow(
    val id: Int,
    val firstName: String,
    val lastName: String?,
    val phone: String?,
    val email: String?,
    val address: String?,
    val orderCount: Int,
    /** Loyalty tier name, only when the merchant's program is on */
    val tier: String?,
) {
    val name: String get() = CustomerRules.displayName(firstName, lastName, phone)

    /** The model the cart and the current screens use */
    fun toCustomer(): Customer = Customer(id, firstName, lastName, phone, email, address)
}

data class CustomersPage(val rows: List<CustomerRow>, val total: Int, val hasMore: Boolean)

/** One row of `GET /api/customers/{id}/orders` (list rows carry no item names, only a count) */
data class CustomerOrderRow(
    val id: Int,
    val orderNumber: String,
    val orderType: String,
    val status: String,
    val totalAmount: Double,
    val pickupPlanAt: Instant?,
    val returnPlanAt: Instant?,
    val createdAt: Instant?,
    val itemCount: Int,
)

data class CustomerOrders(
    val orders: List<CustomerOrderRow>,
    val totalOrders: Int,
    val totalAmount: Double,
    /** Snapshot of the customer (current name, phone and tier); null when absent */
    val firstName: String?,
    val lastName: String?,
    val phone: String?,
    val tier: String?,
)

data class CustomerTile(val title: String, val value: String)

object CustomerRules {
    const val PAGE_SIZE = 20

    fun displayName(firstName: String?, lastName: String?, phone: String?): String {
        val parts = listOfNotNull(firstName, lastName).map { it.trim() }.filter { it.isNotEmpty() }
        if (parts.isNotEmpty()) return parts.joinToString(" ")
        return phone?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    }

    /** Last two words, as on the boards: "Nguyễn Thị Lan" → "TL", "Minh" → "M", empty → "?" */
    fun initials(name: String): String {
        val words = name.split(" ").filter { it.isNotBlank() && it != "—" }
        val letters = words.takeLast(2).mapNotNull { it.firstOrNull()?.uppercase() }
        return if (letters.isEmpty()) "?" else letters.joinToString("")
    }

    /** Same split as the iOS customer form: first word → firstName, the rest → lastName */
    fun splitName(name: String): Pair<String, String> {
        val words = name.trim().split(" ").filter { it.isNotEmpty() }
        return (words.firstOrNull() ?: "") to words.drop(1).joinToString(" ")
    }

    /** `POST /api/customers` body: firstName/lastName/phone as the current forms send, plus `notes` when given */
    fun createPayload(name: String, phone: String, note: String?): JSONObject {
        val (first, last) = splitName(name)
        return JSONObject().put("firstName", first).apply {
            if (last.isNotEmpty()) put("lastName", last)
            phone.trim().takeIf { it.isNotEmpty() }?.let { put("phone", it) }
            note?.trim()?.takeIf { it.isNotEmpty() }?.let { put("notes", it) }
        }
    }

    enum class FormProblem { MISSING_PHONE, MISSING_NAME }

    fun validate(name: String, phone: String): FormProblem? = when {
        phoneDigits(phone).isEmpty() -> FormProblem.MISSING_PHONE
        name.isBlank() -> FormProblem.MISSING_NAME
        else -> null
    }

    /** Digits only: "0901 234 567" and "0901-234-567" are the same phone */
    fun phoneDigits(phone: String?): String = phone.orEmpty().filter { it.isDigit() }

    /**
     * The row in [candidates] (the answer of a `q=<phone>` search, which matches substrings) whose phone has exactly
     * the same digits
     */
    fun duplicate(phone: String, candidates: List<CustomerRow>): CustomerRow? {
        val digits = phoneDigits(phone)
        if (digits.isEmpty()) return null
        return candidates.firstOrNull { phoneDigits(it.phone) == digits }
    }

    /** "09xxxx099 · 12 đơn" ([orders] is the localized "12 đơn"); no phone: just the orders */
    fun subtitle(phone: String?, orders: String): String {
        val trimmed = phone?.trim().orEmpty()
        return if (trimmed.isEmpty()) orders else "${maskPhone(trimmed)} · $orders"
    }

    /** Same mask as iOS `maskedPhoneNumber` and the current Android helper */
    fun maskPhone(phone: String): String {
        val trimmed = phone.trim()
        if (trimmed.length <= 5) return trimmed
        return trimmed.take(2) + "xxxx" + trimmed.takeLast(3)
    }

    /** Số đơn, Tổng chi, Đang thuê; unknown values read "—" */
    fun tiles(
        titles: Triple<String, String, String>,
        totalOrders: Int,
        totalAmount: Double?,
        renting: Int?,
        money: (Double) -> String,
    ): List<CustomerTile> = listOf(
        CustomerTile(titles.first, totalOrders.toString()),
        CustomerTile(titles.second, totalAmount?.let(money) ?: "—"),
        CustomerTile(titles.third, renting?.toString() ?: "—"),
    )

    /** "#148148 · 2 món" ([items] is the localized item count) */
    fun orderTitle(row: CustomerOrderRow, items: String): String = "#${row.orderNumber} · $items"

    /** Rent: "T7 03/10 → T2 05/10" (one day when both fall on the same civil day); sale: the created day */
    fun orderDates(row: CustomerOrderRow, zone: ZoneId, format: (Instant) -> String): String {
        val pickup = row.pickupPlanAt
        if (row.orderType.equals("RENT", ignoreCase = true) && pickup != null) {
            val from = format(pickup)
            val ret = row.returnPlanAt ?: return from
            if (pickup.atZone(zone).toLocalDate() == ret.atZone(zone).toLocalDate()) return from
            return "$from → ${format(ret)}"
        }
        return (row.createdAt ?: pickup)?.let(format).orEmpty()
    }

    // ---------------------------------------------------------------- Parsing

    fun parseRow(o: JSONObject): CustomerRow = CustomerRow(
        id = o.optInt("id"),
        firstName = o.str("firstName") ?: o.str("name") ?: "",
        lastName = o.str("lastName"),
        phone = o.str("phone"),
        email = o.str("email"),
        address = o.str("address"),
        orderCount = when {
            o.has("orderCount") && !o.isNull("orderCount") -> o.optInt("orderCount")
            else -> o.optJSONObject("_count")?.optInt("orders") ?: 0
        },
        tier = tier(o),
    )

    /** `data` of `GET /api/customers` */
    fun parsePage(data: JSONObject): CustomersPage {
        val array = data.optJSONArray("customers")
        val rows = (0 until (array?.length() ?: 0)).mapNotNull { array?.optJSONObject(it)?.let(::parseRow) }
        return CustomersPage(
            rows = rows,
            total = if (data.has("total") && !data.isNull("total")) data.optInt("total") else rows.size,
            hasMore = data.optBoolean("hasMore", false),
        )
    }

    /** `data` of `GET /api/customers/{id}/orders` */
    fun parseOrders(data: JSONObject): CustomerOrders {
        val array = data.optJSONArray("orders")
        val orders = (0 until (array?.length() ?: 0)).mapNotNull { i ->
            val o = array?.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optInt("id").takeIf { it > 0 } ?: return@mapNotNull null
            CustomerOrderRow(
                id = id,
                orderNumber = o.str("orderNumber") ?: id.toString(),
                orderType = o.str("orderType")?.uppercase() ?: "RENT",
                status = o.str("status")?.uppercase() ?: "",
                totalAmount = o.optDouble("totalAmount").takeIf { !it.isNaN() } ?: 0.0,
                pickupPlanAt = instant(o.str("pickupPlanAt")),
                returnPlanAt = instant(o.str("returnPlanAt")),
                createdAt = instant(o.str("createdAt")),
                itemCount = o.optJSONObject("_count")?.optInt("orderItems") ?: 0,
            )
        }
        val summary = data.optJSONObject("summary")
        val customer = data.optJSONObject("customer")
        val total = if (data.has("total") && !data.isNull("total")) data.optInt("total") else orders.size
        return CustomerOrders(
            orders = orders,
            totalOrders = summary?.takeIf { it.has("totalOrders") }?.optInt("totalOrders") ?: total,
            totalAmount = summary?.optDouble("totalAmount")?.takeIf { !it.isNaN() } ?: 0.0,
            firstName = customer?.str("firstName"),
            lastName = customer?.str("lastName"),
            phone = customer?.str("phone"),
            tier = customer?.let(::tier),
        )
    }

    private fun tier(o: JSONObject): String? {
        val status = o.str("loyaltyStatus")
        if (status != null && status != "active") return null
        return o.optJSONObject("loyalty")?.optJSONObject("tier")?.str("name")
    }

    private fun instant(raw: String?): Instant? = raw?.let { runCatching { Instant.parse(it) }.getOrNull() }

    /** null for a missing key, JSON null or a blank value (`optString` returns "null" for JSON null) */
    private fun JSONObject.str(key: String): String? =
        if (!has(key) || isNull(key)) null else optString(key).trim().takeIf { it.isNotEmpty() }
}
