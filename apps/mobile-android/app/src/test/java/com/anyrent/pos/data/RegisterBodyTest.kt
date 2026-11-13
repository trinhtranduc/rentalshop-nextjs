package com.anyrent.pos.data

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/** #1539 (app) — `POST /api/auth/register` body: the new keys are added, every old key and value stays */
class RegisterBodyTest {
    private val oldKeys = mapOf(
        "firstName" to "John",
        "lastName" to "Smith",
        "email" to "john@tux.com",
        "password" to "secret12",
        "phone" to "0901234567",
        "role" to "MERCHANT",
        "businessName" to "Tux Rental",
        "outletName" to "Tux Rental",
        "address" to "1 Main St",
        "pricingType" to "FIXED",
    )

    @Test
    fun bodyCarriesCountryLanguageCurrencyTimezone() {
        val body = ApiParity.registerBody(
            email = " john@tux.com", password = "secret12", fullName = "John Smith", phone = "0901234567",
            storeName = "Tux Rental", address = "1 Main St", businessTags = listOf("COSTUME"),
            country = "United States", language = "en", currency = "USD", timezone = "America/New_York",
        )
        oldKeys.forEach { (key, value) -> assertEquals(key, value, body.getString(key)) }
        assertEquals(JSONArray(listOf("COSTUME")).toString(), body.getJSONArray("businessTags").toString())
        assertEquals("United States", body.getString("country"))
        assertEquals("en", body.getString("language"))
        assertEquals("USD", body.getString("currency"))
        assertEquals("America/New_York", body.getString("timezone"))
        assertEquals(oldKeys.keys + setOf("businessTags", "country", "language", "currency", "timezone"), body.keySet())
    }

    /** The old sign-up screen calls without them: the body is the one before #1539 */
    @Test
    fun oldCallerSendsTheOldBody() {
        val body = ApiParity.registerBody(
            email = "john@tux.com", password = "secret12", fullName = "John Smith", phone = "0901234567",
            storeName = "Tux Rental", address = "1 Main St", businessTags = listOf("OTHER"),
        )
        oldKeys.forEach { (key, value) -> assertEquals(key, value, body.getString(key)) }
        assertEquals(oldKeys.keys + "businessTags", body.keySet())
        listOf("country", "language", "currency", "timezone").forEach { assertFalse(it, body.has(it)) }
    }
}
