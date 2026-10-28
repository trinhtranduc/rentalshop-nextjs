package com.anyrent.pos.domain.settings

import com.anyrent.pos.R
import com.anyrent.pos.domain.error.ApiErrorMessages
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #374 — settings rows by role, plan parsing, initials, password rules */
class SettingsRowsTest {
    @Test
    fun rowsByRole() {
        // #1270 plan B: 12 rows for the owner (+ the overlap switch = 13) plus the name card and the bell
        val merchant = SettingsRows.sections("MERCHANT", hasPlan = true)
        assertEquals(listOf(SettingsGroup.STORE, SettingsGroup.MANAGEMENT, SettingsGroup.ACCOUNT), merchant.map { it.group })
        assertEquals(
            listOf(SettingsItem.STORE_INFO, SettingsItem.CURRENCY, SettingsItem.BANK_ACCOUNTS, SettingsItem.DEPOSIT, SettingsItem.PRINTING),
            merchant[0].items,
        )
        assertEquals(listOf(SettingsItem.CATEGORIES, SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), merchant[1].items)
        assertEquals(listOf(SettingsItem.PLAN, SettingsItem.LANGUAGE, SettingsItem.ADVANCED), merchant[2].items)
        assertEquals(12, merchant.sumOf { it.items.size })

        // Outlet admin: bank accounts yes, currency no
        val outletAdmin = SettingsRows.sections("OUTLET_ADMIN", hasPlan = false)
        assertEquals(listOf(SettingsItem.STORE_INFO, SettingsItem.BANK_ACCOUNTS, SettingsItem.DEPOSIT, SettingsItem.PRINTING), outletAdmin[0].items)
        assertEquals(listOf(SettingsItem.CATEGORIES, SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), outletAdmin[1].items)
        assertEquals(listOf(SettingsItem.LANGUAGE, SettingsItem.ADVANCED), outletAdmin[2].items)

        // Staff: no currency, no bank accounts; Cọc stays (read only)
        val staff = SettingsRows.sections("OUTLET_STAFF", hasPlan = true)
        assertEquals(listOf(SettingsItem.STORE_INFO, SettingsItem.DEPOSIT, SettingsItem.PRINTING), staff[0].items)
        assertEquals(listOf(SettingsItem.CUSTOMERS), staff[1].items)
        assertEquals(SettingsItem.PLAN, staff[2].items.first())

        // ADMIN has no plan of its own
        assertFalse(SettingsRows.sections("ADMIN", hasPlan = true).flatMap { it.items }.contains(SettingsItem.PLAN))
    }

    /** Cọc shows for every role; the store group is first (the bell is not a row) */
    @Test
    fun depositRowForEveryRole() {
        for (role in listOf("ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", null)) {
            val first = SettingsRows.sections(role, hasPlan = false).first()
            assertEquals(role, SettingsGroup.STORE, first.group)
            assertEquals(role, SettingsItem.STORE_INFO, first.items.first())
            assertTrue(role, SettingsItem.DEPOSIT in first.items)
        }
    }

    /** #1270: the second text of a row shows the value in force */
    @Test
    fun rowValues() {
        assertEquals("80 mm", SettingsRows.printingValue(true, 80, "chưa chọn máy in"))
        assertEquals("80 mm · chưa chọn máy in", SettingsRows.printingValue(false, 80, "chưa chọn máy in"))
        assertTrue(SettingsRows.depositStagesDimmed(staged = false))
        assertFalse(SettingsRows.depositStagesDimmed(staged = true))
    }

    /** #937: the row's badge is the unread count, capped at 99, hidden at 0 */
    @Test
    fun notificationsRowUnreadBadge() {
        assertNull(SettingsRows.unreadBadge(0))
        assertNull(SettingsRows.unreadBadge(-1))
        assertEquals("2", SettingsRows.unreadBadge(2))
        assertEquals("99", SettingsRows.unreadBadge(250))
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
