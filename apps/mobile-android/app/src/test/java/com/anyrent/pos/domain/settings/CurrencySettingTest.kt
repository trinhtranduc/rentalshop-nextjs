package com.anyrent.pos.domain.settings

import com.anyrent.pos.domain.money.ShopCurrency
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1145 — "Tiền tệ": owner only, parsing of login / GET / PUT answers, PUT body */
class CurrencySettingTest {
    @Test
    fun onlyTheShopOwnerSeesTheRow() {
        assertTrue(CurrencySetting.canEdit("MERCHANT"))
        for (role in listOf("ADMIN", "OPS", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", "", null)) {
            assertFalse(role.toString(), CurrencySetting.canEdit(role))
            val rows = SettingsRows.sections(role, hasPlan = false).flatMap { it.items }
            assertFalse(role.toString(), rows.contains(SettingsItem.CURRENCY))
        }
        // #1270: "Tiền tệ" is its own row again, right after Thông tin cửa hàng
        val store = SettingsRows.sections("MERCHANT", hasPlan = false).first().items
        assertEquals(store.indexOf(SettingsItem.STORE_INFO) + 1, store.indexOf(SettingsItem.CURRENCY))
    }

    /** #1307: every shop role reads the shop currency, only the owner edits it */
    @Test
    fun everyShopRoleRefreshesTheCurrency() {
        for (role in listOf("MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", "OPS")) {
            assertTrue(role, CurrencySetting.canRefresh(role))
        }
        assertFalse(CurrencySetting.canRefresh("ADMIN"))
        assertFalse(CurrencySetting.canRefresh(null))
        assertFalse(CurrencySetting.canEdit("OUTLET_STAFF"))
    }

    @Test
    fun refreshIsLimitedToOncePerMinute() {
        val now = 1_000_000L
        assertTrue(CurrencySetting.shouldRefresh("OUTLET_STAFF", null, now, force = false))
        assertFalse(CurrencySetting.shouldRefresh("OUTLET_STAFF", now - 59_000, now, force = false))
        assertTrue(CurrencySetting.shouldRefresh("OUTLET_STAFF", now - 60_000, now, force = false))
        assertTrue(CurrencySetting.shouldRefresh("OUTLET_STAFF", now - 5_000, now, force = true))
        assertFalse(CurrencySetting.shouldRefresh("ADMIN", null, now, force = true))
    }

    @Test
    fun parsing() {
        assertEquals(ShopCurrency.USD, CurrencySetting.fromMerchant(JSONObject("""{"currency":"USD"}""")))
        assertEquals(ShopCurrency.VND, CurrencySetting.fromMerchant(JSONObject("""{"currency":"VND"}""")))
        assertEquals(ShopCurrency.VND, CurrencySetting.fromMerchant(JSONObject("""{"currency":null}""")))
        assertEquals(ShopCurrency.VND, CurrencySetting.fromMerchant(JSONObject("{}")))
        assertEquals(ShopCurrency.VND, CurrencySetting.fromMerchant(null))
        assertEquals(
            ShopCurrency.USD,
            CurrencySetting.fromResponse(JSONObject("""{"success":true,"data":{"currency":"usd","merchantId":1,"merchantName":"A"}}""")),
        )
        assertEquals(ShopCurrency.VND, CurrencySetting.fromResponse(JSONObject("""{"success":true,"data":{"currency":"EUR"}}""")))
        assertNull(CurrencySetting.fromResponse(JSONObject("""{"success":true,"data":{}}""")))
        assertEquals("""{"currency":"USD"}""", CurrencySetting.body(ShopCurrency.USD).toString())
    }
}
