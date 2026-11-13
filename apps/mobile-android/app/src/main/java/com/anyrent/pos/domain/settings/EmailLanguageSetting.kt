package com.anyrent.pos.domain.settings

import org.json.JSONObject

/** #1539 (app) the shop language (`Merchant.language`): emails to the shop and sample data at sign-up */
enum class ShopLanguage(val code: String, val nativeName: String) {
    VI("vi", "Tiếng Việt"),
    EN("en", "English"),
    ;

    companion object {
        /** null for a missing or unknown value */
        fun from(raw: String?): ShopLanguage? {
            val code = raw?.trim()?.lowercase() ?: return null
            return entries.firstOrNull { it.code == code }
        }
    }
}

/**
 * #1539 (app) "Ngôn ngữ email" under Thông tin cửa hàng (iOS reference). Read from `merchant.language` of
 * GET /api/users/profile; an older API does not send it and the row stays hidden. Changed with
 * PUT /api/settings/merchant `{ "language": "en" }` (shop owner only; others get 403).
 */
object EmailLanguageSetting {
    const val FIELD = "language"

    fun canEdit(role: String?): Boolean = OverlapSetting.canEdit(role)

    /** Owner only, and only when the API sent the field */
    fun visible(role: String?, language: ShopLanguage?): Boolean = canEdit(role) && language != null

    /** `merchant.language`; null when missing (old API), null or unknown */
    fun fromMerchant(merchant: JSONObject?): ShopLanguage? {
        if (merchant == null || !merchant.has(FIELD) || merchant.isNull(FIELD)) return null
        return ShopLanguage.from(merchant.optString(FIELD))
    }

    /** GET /api/users/profile: `data.merchant` (or `data.user.merchant`) */
    fun fromProfile(json: JSONObject): ShopLanguage? {
        val data = json.optJSONObject("data") ?: return null
        return fromMerchant(data.optJSONObject("merchant") ?: data.optJSONObject("user")?.optJSONObject("merchant"))
    }

    /** PUT answer `data.language`; null when it carries none */
    fun fromResponse(json: JSONObject): ShopLanguage? = fromMerchant(json.optJSONObject("data") ?: json)

    fun body(language: ShopLanguage): JSONObject = JSONObject().put(FIELD, language.code)
}
