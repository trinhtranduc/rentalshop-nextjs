package com.anyrent.pos.domain.settings

import org.json.JSONObject

enum class SettingsItem {
    STORE_INFO, RECEIPT_NOTE, PRINTER,
    CUSTOMERS, USERS, EXPORT,
    PLAN, LANGUAGE, PASSWORD, APP_INFO, DELETE_ACCOUNT,
}

enum class SettingsGroup { STORE, MANAGEMENT, ACCOUNT }

data class SettingsSection(val group: SettingsGroup, val items: List<SettingsItem>)

/** Plan of `GET /api/subscriptions/status` */
data class SettingsPlan(val name: String, val isTrial: Boolean, val isExpired: Boolean, val daysRemaining: Int?)

enum class PasswordProblem { MISSING_CURRENT, TOO_SHORT, MISMATCH }

/** Rows of the redesigned settings (#374), with the role rules of the current settings screen */
object SettingsRows {
    const val MIN_PASSWORD_LENGTH = 6

    /**
     * - customers: every role (as today)
     * - users: MERCHANT, OUTLET_ADMIN, ADMIN (`PermissionManager.canManageUsers`)
     * - export: never OUTLET_STAFF (`PermissionManager.canExport`)
     * - plan: once `subscriptions/status` answered, not for ADMIN
     */
    fun sections(role: String?, hasPlan: Boolean): List<SettingsSection> {
        val management = buildList {
            add(SettingsItem.CUSTOMERS)
            if (role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN")) add(SettingsItem.USERS)
            if (role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN")) add(SettingsItem.EXPORT)
        }
        val account = buildList {
            if (hasPlan && role != "ADMIN") add(SettingsItem.PLAN)
            addAll(listOf(SettingsItem.LANGUAGE, SettingsItem.PASSWORD, SettingsItem.APP_INFO, SettingsItem.DELETE_ACCOUNT))
        }
        return listOf(
            SettingsSection(SettingsGroup.STORE, listOf(SettingsItem.STORE_INFO, SettingsItem.RECEIPT_NOTE, SettingsItem.PRINTER)),
            SettingsSection(SettingsGroup.MANAGEMENT, management),
            SettingsSection(SettingsGroup.ACCOUNT, account),
        ).filter { it.items.isNotEmpty() }
    }

    /** "MT" from "Merchant Tran"; one letter for one word; "?" when empty */
    fun initials(name: String): String {
        val words = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        val picked = if (words.size > 1) listOf(words.first(), words.last()) else words.take(1)
        return picked.joinToString("") { it.first().uppercase() }.ifEmpty { "?" }
    }

    fun validatePassword(current: String, new: String, confirm: String): PasswordProblem? = when {
        current.isEmpty() -> PasswordProblem.MISSING_CURRENT
        new.length < MIN_PASSWORD_LENGTH -> PasswordProblem.TOO_SHORT
        new != confirm -> PasswordProblem.MISMATCH
        else -> null
    }

    fun planFromJson(data: JSONObject): SettingsPlan {
        val name = (if (data.isNull("planName")) "" else data.optString("planName")).trim().ifEmpty { "—" }
        return SettingsPlan(
            name = name,
            isTrial = data.optString("dbStatus").equals("TRIAL", ignoreCase = true),
            isExpired = data.optString("status").equals("EXPIRED", ignoreCase = true),
            daysRemaining = if (data.has("daysRemaining") && !data.isNull("daysRemaining")) data.optInt("daysRemaining") else null,
        )
    }
}
