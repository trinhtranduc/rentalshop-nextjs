package com.anyrent.pos.domain.appconfig

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #370 — version comparison for the minimum-version check */
class AppVersionTest {
    @Test
    fun `compares numerically, missing parts are zero`() {
        assertTrue(AppVersion.compare("0.1.3", "0.2.0") < 0)
        assertTrue(AppVersion.compare("0.10.0", "0.9.9") > 0)
        assertEquals(0, AppVersion.compare("1.2", "1.2.0"))
        assertEquals(0, AppVersion.compare("1.2.0-beta", "1.2.0"))
    }

    @Test
    fun `update is required only below the Android minimum`() {
        val config = AppConfig(android = PlatformConfig(minVersion = "0.2.0"), ios = PlatformConfig(minVersion = "9.0.0"))
        assertTrue(config.updateRequired("0.1.3"))
        assertFalse(config.updateRequired("0.2.0"))
        assertFalse(AppConfig().updateRequired("0.1.3"))
    }
}
