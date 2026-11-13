package com.anyrent.pos.domain.auth

import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.settings.ShopLanguage
import java.text.Collator
import java.text.Normalizer
import java.util.Locale

/** #1539 (app) the sign-up country list: the web's `ISO_COUNTRY_CODES`, names in the app language, Việt Nam first */
object SignupCountries {
    const val DEFAULT_CODE = "VN"

    /** ISO 3166-1 alpha-2 (249), same as packages/constants/src/countries.ts */
    val CODES: List<String> = listOf(
        "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE",
        "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD",
        "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
        "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
        "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU",
        "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
        "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME",
        "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
        "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
        "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI",
        "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK",
        "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
        "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
    )

    /** Same overrides as iOS `SignupCountries`: the text web stores ("Hong Kong", "China") whatever the device CLDR says */
    private val ENGLISH_OVERRIDES = mapOf(
        "HK" to "Hong Kong", "CN" to "China", "MO" to "Macao SAR China", "IO" to "British Indian Ocean Territory",
        "GS" to "South Georgia & South Sandwich Islands",
    )

    data class Country(val code: String, val name: String)

    /** The app speaks Vietnamese or English (res/values-vi, res/values) */
    fun appLocale(system: Locale): Locale = if (system.language == "vi") Locale.forLanguageTag("vi") else Locale.ENGLISH

    /** #1545 the shop (email) language at sign-up is the app language: Vietnamese → vi, any other → en (web `signupShopPrefs`) */
    fun shopLanguage(appLanguage: Locale): ShopLanguage = if (appLanguage.language == "vi") ShopLanguage.VI else ShopLanguage.EN

    /** #1545 the shop currency at sign-up: Việt Nam → VND, any other country → USD (web `signupShopPrefs`) */
    fun currencyFor(code: String?): ShopCurrency {
        val upper = code?.trim()?.uppercase(Locale.ROOT).orEmpty()
        return if (upper.isEmpty() || upper == DEFAULT_CODE) ShopCurrency.VND else ShopCurrency.USD
    }

    /** `country` sent at sign-up: the CLDR English name ("Vietnam", "United States"), HK "Hong Kong"; else the code */
    fun englishName(code: String): String {
        val upper = code.trim().uppercase(Locale.ROOT)
        ENGLISH_OVERRIDES[upper]?.let { return it }
        return regionName(upper, Locale.ENGLISH) ?: upper
    }

    /** Name in the app language; the English name when the platform has none */
    fun displayName(code: String, appLocale: Locale): String {
        val upper = code.trim().uppercase(Locale.ROOT)
        return regionName(upper, appLocale) ?: englishName(upper)
    }

    /** Việt Nam first, then every other country by its name (collation of the app language) */
    fun options(appLocale: Locale): List<Country> {
        val collator = Collator.getInstance(appLocale)
        val rest = CODES.filter { it != DEFAULT_CODE }
            .map { Country(it, displayName(it, appLocale)) }
            .sortedWith { a, b -> collator.compare(a.name, b.name) }
        return listOf(Country(DEFAULT_CODE, displayName(DEFAULT_CODE, appLocale))) + rest
    }

    /** Name in the app language or English name containing the query, ignoring case and diacritics (as iOS); blank keeps all */
    fun search(options: List<Country>, query: String): List<Country> {
        val needle = fold(query).trim()
        if (needle.isEmpty()) return options
        return options.filter { fold(it.name).contains(needle) || fold(englishName(it.code)).contains(needle) }
    }

    fun fold(text: String): String =
        Normalizer.normalize(text, Normalizer.Form.NFD)
            .replace(MARKS, "")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .lowercase(Locale.ROOT)

    private val MARKS = Regex("\\p{Mn}+")

    private fun regionName(code: String, locale: Locale): String? =
        runCatching { Locale.Builder().setRegion(code).build().getDisplayCountry(locale) }.getOrNull()?.takeIf { it.isNotBlank() && it != code }
}
