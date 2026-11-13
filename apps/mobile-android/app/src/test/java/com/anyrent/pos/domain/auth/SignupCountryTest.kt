package com.anyrent.pos.domain.auth

import com.anyrent.pos.domain.money.ShopCurrency
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.text.Collator
import java.util.Locale

/**
 * #1539 (app) — sign-up country list, search, request, saved state.
 * #1545 — only Quốc gia is asked: currency follows the country, the shop language follows the app language.
 */
class SignupCountryTest {
    private val vi = Locale.forLanguageTag("vi")
    private val viVN = Locale.forLanguageTag("vi-VN")

    // Defaults

    @Test
    fun newDraftIsVietnamVnd() {
        val draft = RegisterDraft()
        assertEquals("VN", draft.countryCode)
        assertEquals(ShopCurrency.VND, draft.currency)
    }

    @Test
    fun currencyFollowsTheCountry() {
        assertEquals(ShopCurrency.VND, SignupCountries.currencyFor("VN"))
        assertEquals(ShopCurrency.VND, SignupCountries.currencyFor(" vn "))
        assertEquals(ShopCurrency.USD, SignupCountries.currencyFor("US"))
        assertEquals(ShopCurrency.USD, SignupCountries.currencyFor("JP"))
        assertEquals(ShopCurrency.USD, SignupCountries.currencyFor("gb"))
    }

    @Test
    fun pickingACountryOnlySetsTheCode() {
        val typed = RegisterDraft(storeName = "Tux Rental", phone = "0901234567", address = "1 Main St")
        val us = typed.withCountry("US")
        assertEquals(typed.copy(countryCode = "US"), us)
        assertEquals(ShopCurrency.USD, us.currency)

        val jp = us.withCountry(" jp ")
        assertEquals("JP", jp.countryCode)
        assertEquals(ShopCurrency.USD, jp.currency)

        val vn = jp.withCountry("VN")
        assertEquals(typed, vn)
        assertEquals(ShopCurrency.VND, vn.currency)
    }

    // Request

    @Test
    fun languageFollowsTheAppAndCurrencyTheCountry() {
        // App in Vietnamese, shop in the United States: Vietnamese emails, USD
        val viUs = RegisterDraft().withCountry("US").request(timeZone = "America/New_York", appLanguage = vi)
        assertEquals("vi", viUs.language)
        assertEquals("USD", viUs.currency)
        assertEquals("United States", viUs.country)
        // App in English, shop in Việt Nam: English emails, VND
        val enVn = RegisterDraft().request(timeZone = "Asia/Ho_Chi_Minh", appLanguage = Locale.US)
        assertEquals("en", enVn.language)
        assertEquals("VND", enVn.currency)
        assertEquals("Vietnam", enVn.country)
        // vi-VN is Vietnamese; any other app language is English
        assertEquals("vi", RegisterDraft().request(timeZone = "Asia/Ho_Chi_Minh", appLanguage = viVN).language)
        assertEquals("en", RegisterDraft().request(timeZone = "Europe/Paris", appLanguage = Locale.FRANCE).language)
        assertEquals("en", RegisterDraft().withCountry("JP").request(timeZone = "Asia/Tokyo", appLanguage = Locale.JAPAN).language)
    }

    @Test
    fun requestCarriesCountryLanguageCurrencyAndTimezone() {
        val draft = RegisterDraft(
            storeName = " Tux Rental ",
            phone = "0901 234 567",
            address = "1 Main St ",
            tags = setOf("COSTUME"),
            fullName = "John Smith",
            email = " john@tux.com",
            password = "secret12",
            confirmPassword = "secret12",
            termsAccepted = true,
        ).withCountry("US")
        assertEquals(
            RegisterRequest(
                email = "john@tux.com",
                password = "secret12",
                fullName = "John Smith",
                phone = "0901234567",
                storeName = "Tux Rental",
                address = "1 Main St",
                businessTags = listOf("COSTUME"),
                country = "United States",
                language = "en",
                currency = "USD",
                timezone = "America/New_York",
            ),
            draft.request(timeZone = "America/New_York", appLanguage = Locale.ENGLISH),
        )
    }

    @Test
    fun requestDefaultsToVietnamTheDeviceTimezoneAndTheAppLanguage() {
        val saved = Locale.getDefault()
        try {
            Locale.setDefault(viVN)
            val request = RegisterDraft().request()
            assertEquals("Vietnam", request.country)
            assertEquals("vi", request.language)
            assertEquals("VND", request.currency)
            assertEquals(java.util.TimeZone.getDefault().id, request.timezone)

            Locale.setDefault(Locale.US)
            assertEquals("en", RegisterDraft().request().language)
        } finally {
            Locale.setDefault(saved)
        }
    }

    @Test
    fun englishNamesMatchTheWeb() {
        assertEquals("Vietnam", SignupCountries.englishName("VN"))
        assertEquals("United States", SignupCountries.englishName("US"))
        assertEquals("Hong Kong", SignupCountries.englishName("HK"))
        assertEquals("Japan", SignupCountries.englishName("JP"))
        assertEquals("Hong Kong", RegisterDraft().withCountry("HK").request(timeZone = "Asia/Hong_Kong").country)
        assertEquals("Japan", RegisterDraft().withCountry("JP").request(timeZone = "Asia/Tokyo").country)
    }

    // List

    @Test
    fun listHas249CountriesVietnamFirstRestByName() {
        for (locale in listOf(Locale.ENGLISH, Locale.forLanguageTag("vi"))) {
            val options = SignupCountries.options(locale)
            assertEquals(249, options.size)
            assertEquals(249, options.map { it.code }.toSet().size)
            assertEquals("VN", options.first().code)
            val rest = options.drop(1)
            val collator = Collator.getInstance(locale)
            assertEquals(rest.sortedWith { a, b -> collator.compare(a.name, b.name) }, rest)
        }
        assertEquals("Vietnam", SignupCountries.options(Locale.ENGLISH).first().name)
    }

    /** Same codes as the web's `ISO_COUNTRY_CODES` (packages/constants/src/countries.ts) */
    @Test
    fun codesMatchTheWebList() {
        assertEquals(249, SignupCountries.CODES.size)
        val web = listOf("../../..", "../..", "..").map { File(it, "packages/constants/src/countries.ts") }.firstOrNull { it.exists() }
            ?: return
        val block = web.readText().substringAfter("ISO_COUNTRY_CODES").substringAfter("= [").substringBefore("]")
        val codes = Regex("\"([A-Z]{2})\"").findAll(block).map { it.groupValues[1] }.toList()
        assertEquals(codes, SignupCountries.CODES)
    }

    @Test
    fun appLocaleIsVietnameseOrEnglish() {
        assertEquals("vi", SignupCountries.appLocale(Locale.forLanguageTag("vi-VN")).language)
        assertEquals("en", SignupCountries.appLocale(Locale.US).language)
        assertEquals("en", SignupCountries.appLocale(Locale.FRANCE).language)
    }

    @Test
    fun unknownCodeFallsBackToTheCode() {
        // QQ is user-assigned: no platform name
        assertEquals("QQ", SignupCountries.englishName("QQ"))
        assertEquals("QQ", SignupCountries.displayName("qq", Locale.ENGLISH))
    }

    // Search

    @Test
    fun searchIgnoresCaseAndDiacritics() {
        val options = listOf(
            SignupCountries.Country("VN", "Việt Nam"),
            SignupCountries.Country("US", "Hoa Kỳ"),
            SignupCountries.Country("DE", "Đức"),
            SignupCountries.Country("JP", "Nhật Bản"),
        )
        assertEquals(listOf("VN"), SignupCountries.search(options, "viet nam").map { it.code })
        assertEquals(listOf("VN"), SignupCountries.search(options, "VIỆT").map { it.code })
        assertEquals(listOf("US"), SignupCountries.search(options, "hoa ky").map { it.code })
        assertEquals(listOf("DE"), SignupCountries.search(options, "duc").map { it.code })
        assertEquals(listOf("JP"), SignupCountries.search(options, " nhat ").map { it.code })
        assertEquals(options, SignupCountries.search(options, "  "))
        assertTrue(SignupCountries.search(options, "xyz").isEmpty())
    }

    @Test
    fun searchTheEnglishList() {
        val found = SignupCountries.search(SignupCountries.options(Locale.ENGLISH), "united")
        assertTrue(found.any { it.code == "US" })
        assertTrue(found.any { it.code == "GB" })
        assertTrue(found.all { it.name.contains("United", ignoreCase = true) })
    }

    /** Parity with iOS: the same English overrides, and a Vietnamese list also matches the English name */
    @Test
    fun sameOverridesAndEnglishSearchAsIos() {
        assertEquals("China", SignupCountries.englishName("CN"))
        assertEquals("Macao SAR China", SignupCountries.englishName("MO"))
        assertEquals("British Indian Ocean Territory", SignupCountries.englishName("IO"))
        assertEquals("South Georgia & South Sandwich Islands", SignupCountries.englishName("GS"))
        val vi = SignupCountries.options(Locale.forLanguageTag("vi"))
        assertTrue(SignupCountries.search(vi, "united").any { it.code == "US" })
        assertTrue(SignupCountries.search(vi, "hoa ky").any { it.code == "US" })
    }

    // Saved state (step 2 → step 1, rotation)

    @Test
    fun savedStateKeepsTheCountry() {
        val draft = RegisterDraft(storeName = "Tux", tags = setOf("COSTUME", "VEHICLE"), termsAccepted = true).withCountry("US")
        assertEquals(draft, RegisterDraftState.restore(RegisterDraftState.save(draft)))
        assertEquals(RegisterDraft(), RegisterDraftState.restore(RegisterDraftState.save(RegisterDraft())))
    }

    /** A list saved by the #1541 build also has language and currency: they are ignored, currency follows the country */
    @Test
    fun stateSavedWithLanguageAndCurrencyRestoresTheCountry() {
        val base = listOf("Tux", "0901234567", "1 Main", arrayListOf("OTHER"), "John", "j@t.com", "secret12", "secret12", true)
        val us = RegisterDraftState.restore(base + listOf("US", "vi", "VND"))
        assertEquals("Tux", us.storeName)
        assertEquals("US", us.countryCode)
        assertEquals(ShopCurrency.USD, us.currency)
        assertEquals(
            RegisterDraft(
                storeName = "Tux", phone = "0901234567", address = "1 Main", fullName = "John", email = "j@t.com",
                password = "secret12", confirmPassword = "secret12", termsAccepted = true, countryCode = "US",
            ),
            us,
        )
        val vn = RegisterDraftState.restore(base + listOf("VN", "en", "USD"))
        assertEquals("VN", vn.countryCode)
        assertEquals(ShopCurrency.VND, vn.currency)
    }

    @Test
    fun stateSavedBeforeTheUpdateRestoresVietnam() {
        val old = listOf("Tux", "0901234567", "1 Main", arrayListOf("OTHER"), "John", "j@t.com", "secret12", "secret12", true)
        val draft = RegisterDraftState.restore(old)
        assertEquals("Tux", draft.storeName)
        assertEquals("VN", draft.countryCode)
        assertEquals(ShopCurrency.VND, draft.currency)
    }
}
