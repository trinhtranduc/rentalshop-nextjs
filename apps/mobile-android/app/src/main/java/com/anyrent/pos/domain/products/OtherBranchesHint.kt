package com.anyrent.pos.domain.products

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.domain.orders.OrderPlanDays
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

/*
 * #1353 (#1335 PR 2m, API + web #1347) "Chi nhánh khác còn N": pure rules of the hint under a short cart line. Same rules
 * as iOS `OtherBranchesHint` in `Model/ProductsV2.swift`. A hint only: one order is one branch, nothing is moved. The API
 * is the real gate (`POST /api/products/other-outlets-availability` answers OUTLET_STAFF with 403).
 */

/** One other branch that still has the product on the order's days (`data.results[].outlets[]`) */
data class OtherBranchStock(val outletId: Int, val outletName: String, val available: Int)

object OtherBranchesHint {
    const val PATH = "/api/products/other-outlets-availability"

    /** Names shown before "+N" (the line stays one or two lines on a phone) */
    const val MAX_SHOWN = 3

    /** Owner, branch manager and stock keeper (the API's `canSeeOtherOutlets`, minus the system ADMIN who has no cart) */
    fun canAsk(role: UserRole?): Boolean =
        role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    /**
     * Whether the cart asks at all. The owner counts the shop's active branches (two or more). A branch role cannot count
     * them, so it asks unless the shop is known to have one branch ([BranchListing.sendsListed]): the API answers `[]` for
     * a one-branch shop and the cart shows nothing.
     */
    fun asks(role: UserRole?, activeOutletCount: Int): Boolean = when {
        !canAsk(role) -> false
        role == UserRole.MERCHANT -> activeOutletCount >= 2
        else -> BranchListing.sendsListed(role, activeOutletCount)
    }

    /**
     * Product ids that are short (fewer free than asked; [quantities] already sums the lines of a product) or booked out
     * by another order on those days: once each, ascending. A product whose availability is not loaded yet is not asked.
     */
    fun shortProductIds(quantities: Map<Int, Int>, available: Map<Int, Int>, conflictProductIds: Set<Int>): List<Int> =
        quantities.keys.filter { id ->
            id in conflictProductIds || CartV2Logic.shortage(available[id], quantities[id] ?: 0) != null
        }.sorted()

    /**
     * The body, or null when there is nothing to ask (no products, a rental without both days). A rental on one shop day
     * sends `date`; on several, the shop-day bounds, the same instants as `batch-availability`.
     */
    fun requestBody(productIds: List<Int>, isSale: Boolean, pickup: LocalDate?, returnDate: LocalDate?, outletId: Int?): JSONObject? {
        if (productIds.isEmpty()) return null
        val body = JSONObject()
            .put("products", JSONArray(productIds.map { JSONObject().put("productId", it).put("quantity", 1) }))
            .put("orderType", if (isSale) "SALE" else "RENT")
        if (!isSale) {
            if (pickup == null || returnDate == null) return null
            if (pickup == returnDate) {
                body.put("date", pickup.toString())
            } else {
                body.put("startDate", OrderPlanDays.pickupInstant(pickup)).put("endDate", OrderPlanDays.returnInstant(returnDate))
            }
        }
        outletId?.let { body.put("outletId", it) }
        return body
    }

    /** Identifies one question; "" when there is nothing to ask. An answer for another key no longer applies. */
    fun key(productIds: List<Int>, isSale: Boolean, pickup: LocalDate?, returnDate: LocalDate?, outletId: Int?, today: LocalDate): String {
        if (requestBody(productIds, isSale, pickup, returnDate, outletId) == null) return ""
        val days = if (isSale) today.toString() else "$pickup..$returnDate"
        return listOf(if (isSale) "SALE" else "RENT", days, outletId?.toString() ?: "-", productIds.joinToString(",")).joinToString("|")
    }

    /** "Quận 7 (3), Thủ Đức (1)" in the order the API sends them (most units first); after [MAX_SHOWN] names, "+N" */
    fun list(outlets: List<OtherBranchStock>): String {
        val parts = outlets.take(MAX_SHOWN).map { "${it.outletName} (${it.available})" }.toMutableList()
        if (outlets.size > MAX_SHOWN) parts += "+${outlets.size - MAX_SHOWN}"
        return parts.joinToString(", ")
    }

    /** The branches by product from the whole response (or its `data`); products with none are left out. Every key is optional. */
    fun parse(root: JSONObject?): Map<Int, List<OtherBranchStock>> {
        val results = (root?.optJSONObject("data") ?: root)?.optJSONArray("results") ?: return emptyMap()
        val map = linkedMapOf<Int, List<OtherBranchStock>>()
        for (i in 0 until results.length()) {
            val entry = results.optJSONObject(i) ?: continue
            if (!entry.has("productId") || entry.isNull("productId")) continue
            val productId = entry.optInt("productId")
            val outlets = entry.optJSONArray("outlets") ?: continue
            val list = (0 until outlets.length()).mapNotNull { j ->
                val o = outlets.optJSONObject(j) ?: return@mapNotNull null
                val name = if (o.isNull("outletName")) "" else o.optString("outletName")
                val available = o.optInt("available", 0)
                if (!o.has("outletId") || name.isBlank() || available <= 0) null
                else OtherBranchStock(o.optInt("outletId"), name, available)
            }
            if (list.isNotEmpty()) map[productId] = list
        }
        return map
    }
}
