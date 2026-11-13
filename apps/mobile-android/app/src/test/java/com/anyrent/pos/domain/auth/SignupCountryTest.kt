package com.anyrent.pos.domain.auth

import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.settings.ShopLanguage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.text.Collator
import java.util.Locale

/** #1539 (app) — sign-up country, language and currency: defaults, list, search, request, saved state */
class SignupCountryTest {

    // Defaults

    @Test
    fun newDraftIsVietnamVietnameseVnd() {
        val draft = RegisterDraft()
        assertEquals("VN", draft.countryCode)
        assertEquals(ShopLanguage.VI, draft.language)
        assertEquals(ShopCurrency.VND, draft.currency)
    }

    @Test
    fun countryDefaults() {
        assertEquals(SignupDefaults(ShopLanguage.VI, ShopCurrency.VND), SignupDefaults.forCountry("VN"))
        assertEquals(SignupDefaults(ShopLanguage.VI, ShopCurrency.VND), SignupDefaults.forCountry(" vn "))
        assertEquals(SignupDefaults(ShopLanguage.EN, ShopCurrency.USD), SignupDefaults.forCountry("US"))
        assertEquals(SignupDefaults(ShopLanguage.EN, ShopCurrency.USD), SignupDefaults.forCountry("JP"))
    }

    @Test
    fun pickingACountryResetsLanguageAndCurrency() {
        val us = RegisterDraft().withCountry("US")
        assertEquals("US", us.countryCode)
        assertEquals(ShopLanguage.EN, us.language)
        assertEquals(ShopCurrency.USD, us.currency)

        val jp = us.withCountry("JP")
        assertEquals(ShopLanguage.EN, jp.language)
        assertEquals(ShopCurrency.USD, jp.currency)

        val vn = jp.withCountry("VN")
        assertEquals(ShopLanguage.VI, vn.language)
        assertEquals(ShopCurrency.VND, vn.currency)
    }

    @Test
    fun manualChoiceStaysUntilTheCountryChanges() {
        val us = RegisterDraft().withCountry("US").copy(language = ShopLanguage.VI, currency = ShopCurrency.VND)
        val typed = us.copy(storeName = "Tux Rental", phone = "0901234567", address = "1 Main St")
        assertEquals(ShopLanguage.VI, typed.language)
        assertEquals(ShopCurrency.VND, typed.currency)
        // The same country again changes nothing
        assertEquals(typed, typed.withCountry("US"))
        // Another country resets both
        val jp = typed.withCountry("JP")
        assertEquals(ShopLanguage.EN, jp.language)
        assertEquals(ShopCurrency.USD, jp.currency)
    }

    // Request

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
            draft.request(timeZone = "America/New_York"),
        )
    }

    @Test
    fun requestDefaultsToVietnamAndTheDeviceTimezone() {
        val request = RegisterDraft().request()
        assertEquals("Vietnam", request.country)
        assertEquals("vi", request.language)
        assertEquals("VND", request.currency)
        assertEquals(java.util.TimeZone.getDefault().id, request.timezone)
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
    fun savedStateKeepsCountryLanguageAndCurrency() {
        val draft = RegisterDraft(storeName = "Tux", tags = setOf("COSTUME", "VEHICLE"), termsAccepted = true)
            .withCountry("US")
            .copy(language = ShopLanguage.VI)
        assertEquals(draft, RegisterDraftState.restore(RegisterDraftState.save(draft)))
        assertEquals(RegisterDraft(), RegisterDraftState.restore(RegisterDraftState.save(RegisterDraft())))
    }

    @Test
    fun stateSavedBeforeTheUpdateRestoresVietnam() {
        val old = listOf("Tux", "0901234567", "1 Main", arrayListOf("OTHER"), "John", "j@t.com", "secret12", "secret12", true)
        val draft = RegisterDraftState.restore(old)
        assertEquals("Tux", draft.storeName)
        assertEquals("VN", draft.countryCode)
        assertEquals(ShopLanguage.VI, draft.language)
        assertEquals(ShopCurrency.VND, draft.currency)
    }
}
