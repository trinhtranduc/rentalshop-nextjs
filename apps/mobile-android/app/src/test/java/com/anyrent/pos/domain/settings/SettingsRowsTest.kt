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
        // #1259: 10 rows for the owner plus the name card = 11 lines; Thông báo is the bell at the top right
        val merchant = SettingsRows.sections("MERCHANT", hasPlan = true)
        assertEquals(listOf(SettingsGroup.STORE, SettingsGroup.MANAGEMENT, SettingsGroup.ACCOUNT), merchant.map { it.group })
        assertEquals(listOf(SettingsItem.STORE_INFO, SettingsItem.COLLECT, SettingsItem.PRINTING), merchant[0].items)
        assertEquals(listOf(SettingsItem.CATEGORIES, SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), merchant[1].items)
        assertEquals(listOf(SettingsItem.PLAN, SettingsItem.LANGUAGE, SettingsItem.ADVANCED), merchant[2].items)
        assertEquals(11, 1 + merchant.sumOf { it.items.size })

        val outletAdmin = SettingsRows.sections("OUTLET_ADMIN", hasPlan = false)
        assertEquals(listOf(SettingsItem.STORE_INFO, SettingsItem.COLLECT, SettingsItem.PRINTING), outletAdmin[0].items)
        assertEquals(listOf(SettingsItem.CATEGORIES, SettingsItem.CUSTOMERS, SettingsItem.USERS, SettingsItem.EXPORT), outletAdmin[1].items)
        assertEquals(listOf(SettingsItem.LANGUAGE, SettingsItem.ADVANCED), outletAdmin[2].items)

        val staff = SettingsRows.sections("OUTLET_STAFF", hasPlan = true)
        assertEquals(listOf(SettingsItem.STORE_INFO, SettingsItem.COLLECT, SettingsItem.PRINTING), staff[0].items)
        assertEquals(listOf(SettingsItem.CUSTOMERS), staff[1].items)
        assertEquals(SettingsItem.PLAN, staff[2].items.first())

        // ADMIN has no plan of its own
        assertFalse(SettingsRows.sections("ADMIN", hasPlan = true).flatMap { it.items }.contains(SettingsItem.PLAN))
    }

    /** #1259: Thông báo is the bell at the top right, not a row, for every role */
    @Test
    fun notificationsIsNotARow() {
        for (role in listOf("ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", null)) {
            val first = SettingsRows.sections(role, hasPlan = false).first()
            assertEquals(role, SettingsGroup.STORE, first.group)
            assertEquals(role, SettingsItem.STORE_INFO, first.items.first())
        }
    }

    /** #1259 "Thu tiền": the bank accounts line for owner and outlet admin; the three deposit lines for everyone */
    @Test
    fun collectRowsByRole() {
        val all = listOf(CollectRow.BANK_ACCOUNTS, CollectRow.DEPOSIT_MODE, CollectRow.TEMPLATES, CollectRow.POLICY)
        assertEquals(all, SettingsRows.collectRows("MERCHANT"))
        assertEquals(all, SettingsRows.collectRows("OUTLET_ADMIN"))
        for (role in listOf("OUTLET_STAFF", "OUTLET_INVENTORY", "ADMIN", null)) {
            assertEquals(role, all.drop(1), SettingsRows.collectRows(role))
        }
    }

    /** #1259: the second text of a row shows the value in force */
    @Test
    fun rowValues() {
        assertEquals("Cọc 1 lần · 2 ngân hàng", SettingsRows.collectValue(false, 2, "Cọc 1 lần", "Cọc theo giai đoạn") { "$it ngân hàng" })
        assertEquals("Cọc theo giai đoạn", SettingsRows.collectValue(true, null, "Cọc 1 lần", "Cọc theo giai đoạn") { "$it ngân hàng" })
        assertEquals("Cọc 1 lần", SettingsRows.collectValue(false, 0, "Cọc 1 lần", "x") { "$it ngân hàng" })
        assertEquals("Tiệm Hoa · VND", SettingsRows.storeValue("Tiệm Hoa", "VND"))
        assertEquals("Tiệm Hoa", SettingsRows.storeValue("Tiệm Hoa", null))
        assertEquals("VND", SettingsRows.storeValue(" ", "VND"))
        assertEquals("80 mm", SettingsRows.printingValue(true, 80, "Chưa chọn"))
        assertEquals("Chưa chọn", SettingsRows.printingValue(false, 80, "Chưa chọn"))
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
