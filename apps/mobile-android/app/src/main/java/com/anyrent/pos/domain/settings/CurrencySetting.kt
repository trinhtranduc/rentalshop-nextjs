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

    /** #1307 every shop role reads the shop currency (staff follow the owner's change); ADMIN has no shop */
    fun canRefresh(role: String?): Boolean = !role.isNullOrBlank() && role != "ADMIN"

    /** #1307 read at most once a minute unless forced */
    fun shouldRefresh(role: String?, lastRefreshMs: Long?, nowMs: Long, force: Boolean): Boolean {
        if (!canRefresh(role)) return false
        if (force || lastRefreshMs == null) return true
        return nowMs - lastRefreshMs >= REFRESH_INTERVAL_MS
    }

    const val REFRESH_INTERVAL_MS = 60_000L

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
