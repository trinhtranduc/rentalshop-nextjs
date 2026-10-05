package com.anyrent.pos.data.repository

import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.domain.appconfig.AppConfig
import com.anyrent.pos.domain.appconfig.MobileFeature
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #456 — the new UI is on by default; only a config that says false turns a screen off (iOS parity) */
class AppConfigDefaultsTest {
    private val all = MobileFeature.entries.toSet()

    @Test
    fun `first launch - no cached config - every new screen is on, including the new login`() {
        assertEquals(all, FeatureFlags.DEFAULT)
        assertTrue(MobileFeature.NEW_AUTH in FeatureFlags.DEFAULT)
    }

    @Test
    fun `an AppConfig built without features turns every screen on`() {
        assertEquals(all, AppConfig().features)
    }

    @Test
    fun `a response without features keeps every screen on`() {
        assertEquals(all, appConfigFromJson(JSONObject("{}")).features)
    }

    @Test
    fun `a key missing from features stays on, an explicit false turns that screen off`() {
        val config = appConfigFromJson(JSONObject("""{"features":{"newAuth":false,"newOrders":true}}"""))
        assertFalse(MobileFeature.NEW_AUTH in config.features)
        assertTrue(MobileFeature.NEW_ORDERS in config.features)
        assertTrue(MobileFeature.NEW_CALENDAR in config.features)
    }

    @Test
    fun `all true and all false configs`() {
        fun json(on: Boolean) = JSONObject().put(
            "features",
            JSONObject().apply { MobileFeature.entries.forEach { put(it.key, on) } },
        )
        assertEquals(all, appConfigFromJson(json(true)).features)
        assertEquals(emptySet<MobileFeature>(), appConfigFromJson(json(false)).features)
    }

    @Test
    fun `the cache round-trips an explicit false`() {
        val config = AppConfig(features = all - MobileFeature.NEW_SETTINGS)
        val decoded = SessionStoreAppConfigCache.decode(SessionStoreAppConfigCache.encode(config))
        assertEquals(config.features, decoded.features)
    }
}
