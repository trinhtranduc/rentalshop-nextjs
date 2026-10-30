package com.anyrent.pos.domain.settings

import org.json.JSONObject

/**
 * #1354 "Hiện ghi chú đơn trên ảnh chia sẻ": a shop-level switch, OFF by default (iOS `ShareOrderNoteRule` / `ShareOrderNoteStore`).
 * Read from `merchant.shareOrderNote` of GET /api/users/profile (#1344); changed with PUT /api/settings/merchant
 * `{ "shareOrderNote": true }` (MERCHANT only, others get 403). Pure and unit tested.
 */
object ShareOrderNoteSetting {
    const val FIELD = "shareOrderNote"

    /** The switch is editable by the shop owner only */
    fun canEdit(role: String?): Boolean = OverlapSetting.canEdit(role)

    /** Only an explicit `true` turns it on: a missing field (older API), null or a non-boolean reads as OFF */
    fun fromMerchant(merchant: JSONObject?): Boolean = merchant?.opt(FIELD) == true

    /**
     * The value of GET /api/users/profile (`{ data: user }`) or the PUT /api/settings/merchant answer
     * (`{ data: { shareOrderNote } }`); null when the answer carries no merchant (ADMIN): keep the cached value.
     */
    fun fromResponse(json: JSONObject): Boolean? {
        val data = json.optJSONObject("data") ?: json
        val user = data.optJSONObject("user") ?: data
        user.optJSONObject("merchant")?.let { return fromMerchant(it) }
        if (data.has(FIELD)) return fromMerchant(data)
        return null
    }

    fun body(on: Boolean): JSONObject = JSONObject().put(FIELD, on)
}
