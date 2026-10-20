package com.anyrent.pos.domain.settings

import com.anyrent.pos.domain.money.ShopCurrency
import org.json.JSONObject

/**
 * #1145 "Tiền tệ" of the shop (VND / USD), board-free row under Thông tin cửa hàng (iOS reference).
 * Read from `merchant.currency` of the login payload and GET /api/settings/currency (`{ data: { currency } }`, every role);
 * changed with PUT /api/settings/currency `{ "currency": "USD" }` (shop owner only; others get 403). Pure and unit tested.
 */
object CurrencySetting {
    const val FIELD = "currency"

    /** The row is shown (and editable) only to the shop owner, like the overlap switch */
    fun canEdit(role: String?): Boolean = OverlapSetting.canEdit(role)

    /** `merchant.currency` of a login / profile merchant; VND when missing */
    fun fromMerchant(merchant: JSONObject?): ShopCurrency =
        ShopCurrency.from(merchant?.takeIf { it.has(FIELD) && !it.isNull(FIELD) }?.optString(FIELD))

    /** The currency of a GET / PUT /api/settings/currency answer; null when it carries none (keep the cached one) */
    fun fromResponse(json: JSONObject): ShopCurrency? {
        val data = json.optJSONObject("data") ?: json
        if (!data.has(FIELD) || data.isNull(FIELD)) return null
        return ShopCurrency.from(data.optString(FIELD))
    }

    fun body(currency: ShopCurrency): JSONObject = JSONObject().put(FIELD, currency.code)
}
