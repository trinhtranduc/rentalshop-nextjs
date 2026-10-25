package com.anyrent.pos.domain.settings

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.domain.bank.BankAccountRules
import com.anyrent.pos.domain.products.CategoryRules
import org.json.JSONObject

enum class SettingsItem {
    /** #937: the inbox, moved here from the Home bell */
    NOTIFICATIONS,
    STORE_INFO,
    /** #1145 "Tiền tệ" (VND / USD), shop owner only, right under Thông tin cửa hàng */
    CURRENCY,
    RECEIPT_NOTE, PRINTER, BANK_ACCOUNTS,
    /** #1199 "Cách thu cọc": every role sees it; only the shop owner changes it */
    DEPOSIT_MODE,
    CATEGORIES, CUSTOMERS, USERS, EXPORT,
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
     * - bank accounts (#622): MERCHANT, OUTLET_ADMIN (as iOS)
     * - categories (#632): whoever may add one (`CategoryRules.canAdd`: MERCHANT, OUTLET_ADMIN), as iOS
     * - notifications (#937): every role, first row of CỬA HÀNG (the Home bell became the cart button)
     * - deposit mode (#1199): every role, last row of CỬA HÀNG; only MERCHANT edits ([com.anyrent.pos.domain.deposit.DepositPlanLogic.canEditSettings])
     * - currency (#1145): MERCHANT only ([CurrencySetting.canEdit]), right after Thông tin cửa hàng
     */
    fun sections(role: String?, hasPlan: Boolean): List<SettingsSection> {
        val management = buildList {
            if (CategoryRules.canAdd(UserRole.from(role))) add(SettingsItem.CATEGORIES)
            add(SettingsItem.CUSTOMERS)
            if (role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN")) add(SettingsItem.USERS)
            if (role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN")) add(SettingsItem.EXPORT)
        }
        val account = buildList {
            if (hasPlan && role != "ADMIN") add(SettingsItem.PLAN)
            addAll(listOf(SettingsItem.LANGUAGE, SettingsItem.PASSWORD, SettingsItem.APP_INFO, SettingsItem.DELETE_ACCOUNT))
        }
        return listOf(
            SettingsSection(
                SettingsGroup.STORE,
                listOf(SettingsItem.NOTIFICATIONS, SettingsItem.STORE_INFO) +
                    listOfNotNull(SettingsItem.CURRENCY.takeIf { CurrencySetting.canEdit(role) }) +
                    listOf(SettingsItem.RECEIPT_NOTE, SettingsItem.PRINTER) +
                    listOfNotNull(SettingsItem.BANK_ACCOUNTS.takeIf { BankAccountRules.canManage(role) }) +
                    SettingsItem.DEPOSIT_MODE,
            ),
            SettingsSection(SettingsGroup.MANAGEMENT, management),
            SettingsSection(SettingsGroup.ACCOUNT, account),
        ).filter { it.items.isNotEmpty() }
    }

    /** #937: badge on the "Thông báo" row: the unread count, capped at 99, none at 0 */
    fun unreadBadge(count: Int): String? = if (count > 0) count.coerceAtMost(99).toString() else null

    /** The list whose `total` (with `limit=1`) shows next to a row (#388) */
    fun countPath(item: SettingsItem): String? = when (item) {
        SettingsItem.CUSTOMERS -> "/api/customers?limit=1&page=1"
        SettingsItem.USERS -> "/api/users?limit=1&page=1"
        else -> null
    }

    /** Customers answer `data.total`, users `pagination.total` */
    fun listTotal(json: org.json.JSONObject): Int? {
        json.optJSONObject("data")?.takeIf { it.has("total") }?.let { return it.optInt("total") }
        json.optJSONObject("pagination")?.takeIf { it.has("total") }?.let { return it.optInt("total") }
        return null
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
