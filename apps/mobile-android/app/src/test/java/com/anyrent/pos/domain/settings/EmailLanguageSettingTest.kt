package com.anyrent.pos.domain.settings

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1539 (app) — Settings → Thông tin cửa hàng → "Ngôn ngữ email": owner only, hidden on an API without the field */
class EmailLanguageSettingTest {

    @Test
    fun languageCodes() {
        assertEquals(ShopLanguage.VI, ShopLanguage.from("vi"))
        assertEquals(ShopLanguage.EN, ShopLanguage.from(" EN "))
        assertNull(ShopLanguage.from("fr"))
        assertNull(ShopLanguage.from(null))
        assertEquals(listOf("vi", "en"), ShopLanguage.entries.map { it.code })
        assertEquals(listOf("Tiếng Việt", "English"), ShopLanguage.entries.map { it.nativeName })
    }

    @Test
    fun profileWithoutLanguageHidesTheRow() {
        val old = JSONObject("""{"success":true,"data":{"id":1,"role":"MERCHANT","merchant":{"id":3,"name":"Tux","currency":"VND"}}}""")
        assertNull(EmailLanguageSetting.fromProfile(old))
        assertFalse(EmailLanguageSetting.visible("MERCHANT", EmailLanguageSetting.fromProfile(old)))
        assertNull(EmailLanguageSetting.fromMerchant(JSONObject("""{"language":null}""")))
        assertNull(EmailLanguageSetting.fromMerchant(null))
    }

    @Test
    fun profileWithLanguageShowsTheRowToTheOwnerOnly() {
        val profile = JSONObject("""{"success":true,"data":{"merchant":{"id":3,"name":"Tux","language":"en"}}}""")
        assertEquals(ShopLanguage.EN, EmailLanguageSetting.fromProfile(profile))
        val nested = JSONObject("""{"data":{"user":{"merchant":{"language":"vi"}}}}""")
        assertEquals(ShopLanguage.VI, EmailLanguageSetting.fromProfile(nested))

        assertTrue(EmailLanguageSetting.visible("MERCHANT", ShopLanguage.EN))
        for (role in listOf("ADMIN", "OPS", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", "", null)) {
            assertFalse(role.toString(), EmailLanguageSetting.visible(role, ShopLanguage.EN))
        }
    }

    @Test
    fun putBodyAndAnswer() {
        assertEquals("""{"language":"en"}""", EmailLanguageSetting.body(ShopLanguage.EN).toString())
        assertEquals(ShopLanguage.EN, EmailLanguageSetting.fromResponse(JSONObject("""{"success":true,"data":{"language":"en","name":"Tux"}}""")))
        assertNull(EmailLanguageSetting.fromResponse(JSONObject("""{"success":true,"data":{"name":"Tux"}}""")))
    }
}
