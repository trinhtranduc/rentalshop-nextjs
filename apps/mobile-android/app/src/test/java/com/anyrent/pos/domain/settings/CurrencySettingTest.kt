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
            assertFalse(role.toString(), SettingsRows.storeInfoShowsCurrency(role))
        }
        // #1259: "Tiền tệ" is a line inside Thông tin cửa hàng (owner only), not a row of the Settings list
        assertTrue(SettingsRows.storeInfoShowsCurrency("MERCHANT"))
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
