package com.anyrent.pos.domain.settings

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #518 "Cho tạo đơn khi trùng lịch": ON unless the API says false; only the shop owner sees the switch */
class OverlapSettingTest {
    @Test fun onlyAnExplicitFalseTurnsItOff() {
        assertTrue(OverlapSetting.fromMerchant(null))
        assertTrue(OverlapSetting.fromMerchant(JSONObject("{\"id\":1}")))
        assertTrue(OverlapSetting.fromMerchant(JSONObject("{\"allowOverlappingOrders\":null}")))
        assertTrue(OverlapSetting.fromMerchant(JSONObject("{\"allowOverlappingOrders\":true}")))
        assertTrue(OverlapSetting.fromMerchant(JSONObject("{\"allowOverlappingOrders\":1}")))
        assertFalse(OverlapSetting.fromMerchant(JSONObject("{\"allowOverlappingOrders\":false}")))
        assertFalse(OverlapSetting.fromMerchant(JSONObject("{\"allowOverlappingOrders\":\"false\"}")))
    }

    @Test fun readsProfileLoginAndSaveAnswers() {
        // GET /api/users/profile: { data: user }
        assertEquals(false, OverlapSetting.fromResponse(JSONObject("{\"success\":true,\"data\":{\"id\":3,\"merchant\":{\"id\":1,\"allowOverlappingOrders\":false}}}")))
        // Login: { data: { user } }
        assertEquals(false, OverlapSetting.fromResponse(JSONObject("{\"data\":{\"token\":\"t\",\"user\":{\"merchant\":{\"allowOverlappingOrders\":false}}}}")))
        // Older API: merchant without the field
        assertEquals(true, OverlapSetting.fromResponse(JSONObject("{\"data\":{\"merchant\":{\"id\":1}}}")))
        // PUT /api/settings/merchant: { data: merchant }
        assertEquals(false, OverlapSetting.fromResponse(JSONObject("{\"data\":{\"id\":1,\"allowOverlappingOrders\":false}}")))
        // An outlet user without a merchant object: unknown (keep the cached value)
        assertNull(OverlapSetting.fromResponse(JSONObject("{\"data\":{\"id\":3,\"outlet\":{\"id\":2}}}")))
    }

    @Test fun onlyTheOwnerEditsIt() {
        assertTrue(OverlapSetting.canEdit("MERCHANT"))
        listOf("ADMIN", "OPS", "OUTLET_ADMIN", "OUTLET_STAFF", null).forEach { assertFalse(it.toString(), OverlapSetting.canEdit(it)) }
    }

    @Test fun bodyCarriesOnlyTheSetting() {
        assertEquals("{\"allowOverlappingOrders\":false}", OverlapSetting.body(false).toString())
    }
}
