package com.anyrent.pos.domain.settings

import com.anyrent.pos.R
import com.anyrent.pos.domain.error.ApiErrorMessages
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** #374 — settings rows by role, plan parsing, initials, password rules */
class SettingsRowsTest {
    @Test
    fun rowsByRole() {
        val merchant = SettingsRows.sections("MERCHANT", hasPlan = true)
        assertEquals(listOf(SettingsGroup.STORE, SettingsGroup.MANAGEMENT, SettingsGroup.ACCOUNT), merchant.map { it.group })
        assertEquals(
            listOf(SettingsItem.STORE_INFO, SettingsItem.RECEIPT_NOTE, SettingsItem.PRINTER, SettingsItem.BANK_ACCOUNTS),
            merchant[0].items,
        )
        assertEquals(listOf(SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), merchant[1].items)
        assertEquals(
            listOf(SettingsItem.PLAN, SettingsItem.LANGUAGE, SettingsItem.PASSWORD, SettingsItem.APP_INFO, SettingsItem.DELETE_ACCOUNT),
            merchant[2].items,
        )

        val outletAdmin = SettingsRows.sections("OUTLET_ADMIN", hasPlan = false)
        assertEquals(listOf(SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), outletAdmin[1].items)
        assertFalse(outletAdmin[2].items.contains(SettingsItem.PLAN))

        val staff = SettingsRows.sections("OUTLET_STAFF", hasPlan = true)
        assertEquals(listOf(SettingsItem.CUSTOMERS), staff[1].items)
        assertEquals(SettingsItem.PLAN, staff[2].items.first())

        // ADMIN has no plan of its own
        assertFalse(SettingsRows.sections("ADMIN", hasPlan = true).flatMap { it.items }.contains(SettingsItem.PLAN))
    }

    @Test
    fun planParsing() {
        val trial = SettingsRows.planFromJson(JSONObject("""{"status":"ACTIVE","planName":"Trial","daysRemaining":43,"dbStatus":"TRIAL"}"""))
        assertEquals(SettingsPlan("Trial", isTrial = true, isExpired = false, daysRemaining = 43), trial)
        val expired = SettingsRows.planFromJson(JSONObject("""{"status":"EXPIRED","planName":"Basic","daysRemaining":null}"""))
        assertEquals(SettingsPlan("Basic", isTrial = false, isExpired = true, daysRemaining = null), expired)
        assertEquals("—", SettingsRows.planFromJson(JSONObject("{}")).name)
    }

    @Test
    fun initialsAndPasswordRules() {
        assertEquals("MT", SettingsRows.initials("Merchant Tran"))
        assertEquals("NL", SettingsRows.initials("Nguyễn Thị Lan"))
        assertEquals("L", SettingsRows.initials("lan"))
        assertEquals("?", SettingsRows.initials("  "))
        assertEquals(PasswordProblem.MISSING_CURRENT, SettingsRows.validatePassword("", "abcdef", "abcdef"))
        assertEquals(PasswordProblem.TOO_SHORT, SettingsRows.validatePassword("old", "abc", "abc"))
        assertEquals(PasswordProblem.MISMATCH, SettingsRows.validatePassword("old", "abcdef", "abcdeg"))
        assertNull(SettingsRows.validatePassword("old", "abcdef", "abcdef"))
    }

    @Test
    fun passwordErrorCodesAreTranslated() {
        assertEquals(R.string.api_error_current_password_incorrect, ApiErrorMessages.stringId("CURRENT_PASSWORD_INCORRECT"))
        assertEquals(R.string.api_error_password_min_length, ApiErrorMessages.stringId("PASSWORD_MIN_LENGTH"))
    }
}
