package com.anyrent.pos.domain.settings

/** #1539 (app) the shop language sent at sign-up (`Merchant.language`). #1648: emails follow the shop country on the server, so no screen picks it any more. */
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
