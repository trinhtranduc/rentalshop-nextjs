package com.anyrent.pos.domain.settings

import org.json.JSONObject

/**
 * #518 "Cho tạo đơn khi trùng lịch" (board CD-trung-lich): a shop-level switch, ON by default (= the old behaviour).
 * Read from `merchant.allowOverlappingOrders` of the login payload and GET /api/users/profile; changed with
 * PUT /api/settings/merchant `{ "allowOverlappingOrders": false }` (MERCHANT / ADMIN only, others get 403).
 * Pure and unit tested.
 */
object OverlapSetting {
    const val FIELD = "allowOverlappingOrders"

    /** The switch is shown (and editable) only to the shop owner */
    fun canEdit(role: String?): Boolean = role.equals("MERCHANT", ignoreCase = true)

    /** Only an explicit `false` turns it off: a missing field (older API), null or a non-boolean reads as ON */
    fun fromMerchant(merchant: JSONObject?): Boolean {
        if (merchant == null || !merchant.has(FIELD)) return true
        return when (val value = merchant.opt(FIELD)) {
            is Boolean -> value
            is String -> !value.equals("false", ignoreCase = true)
            else -> true
        }
    }

    /**
     * The setting from GET /api/users/profile (`{ data: user }`), the login payload (`{ data: { user } }`) or the
     * PUT /api/settings/merchant answer (`{ data: merchant }`); null when the answer carries no merchant.
     */
    fun fromResponse(json: JSONObject): Boolean? {
        val data = json.optJSONObject("data") ?: json
        val user = data.optJSONObject("user") ?: data
        user.optJSONObject("merchant")?.let { return fromMerchant(it) }
        if (data.has(FIELD)) return fromMerchant(data)
        return null
    }

    fun body(allow: Boolean): JSONObject = JSONObject().put(FIELD, allow)
}
