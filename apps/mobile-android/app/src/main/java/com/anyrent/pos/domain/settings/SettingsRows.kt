package com.anyrent.pos.domain.settings

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.domain.bank.BankAccountRules
import com.anyrent.pos.domain.products.CategoryRules
import org.json.JSONObject

enum class SettingsItem {
    /** #937: the inbox, moved here from the Home bell; #1259: its own row under the name card */
    NOTIFICATIONS,
    /** #1259 CỬA HÀNG: Thông tin cửa hàng (with Tiền tệ), Thu tiền (bank accounts, deposit, stage templates, cancellation policy), In & phiếu (receipt note + printer) */
    STORE_INFO, COLLECT, PRINTING,
    CATEGORIES, CUSTOMERS, USERS, EXPORT,
    /** #1259 TÀI KHOẢN: Gói dịch vụ, Ngôn ngữ, Nâng cao (Thông tin ứng dụng + Xoá tài khoản) */
    PLAN, LANGUAGE, ADVANCED,
}

/** `TOP`: Thông báo, right under the name card, no header */
enum class SettingsGroup { TOP, STORE, MANAGEMENT, ACCOUNT }

/** The lines of the "Thu tiền" screen (#1259) */
enum class CollectRow {
    /** Tài khoản ngân hàng, owner and outlet admin only */
    BANK_ACCOUNTS,
    /** #1199 "Cách thu cọc": every role sees it; only the shop owner changes it */
    DEPOSIT_MODE,
    /** Mẫu giai đoạn cọc and Chính sách huỷ / dời ngày (owner edits, others read) */
    TEMPLATES, POLICY,
}

data class SettingsSection(val group: SettingsGroup, val items: List<SettingsItem>)

/** Plan of `GET /api/subscriptions/status` */
data class SettingsPlan(val name: String, val isTrial: Boolean, val isExpired: Boolean, val daysRemaining: Int?)

enum class PasswordProblem { MISSING_CURRENT, TOO_SHORT, MISMATCH }

/** Rows of the redesigned settings (#374), with the role rules of the current settings screen */
object SettingsRows {
    const val MIN_PASSWORD_LENGTH = 6

    /**
     * #1259: 3 groups, 12 lines for the owner with the name card.
     * - customers: every role (as today)
     * - users: MERCHANT, OUTLET_ADMIN, ADMIN (`PermissionManager.canManageUsers`)
     * - export: never OUTLET_STAFF (`PermissionManager.canExport`)
     * - plan: once `subscriptions/status` answered, not for ADMIN
     * - categories (#632): whoever may add one (`CategoryRules.canAdd`: MERCHANT, OUTLET_ADMIN), as iOS
     * - notifications (#937): every role, its own row under the name card
     * - the bank accounts line (#622) and the owner's currency (#1145) sit inside Thu tiền / Thông tin cửa hàng
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
            addAll(listOf(SettingsItem.LANGUAGE, SettingsItem.ADVANCED))
        }
        return listOf(
            SettingsSection(SettingsGroup.TOP, listOf(SettingsItem.NOTIFICATIONS)),
            SettingsSection(SettingsGroup.STORE, listOf(SettingsItem.STORE_INFO, SettingsItem.COLLECT, SettingsItem.PRINTING)),
            SettingsSection(SettingsGroup.MANAGEMENT, management),
            SettingsSection(SettingsGroup.ACCOUNT, account),
        ).filter { it.items.isNotEmpty() }
    }

    /** The lines of Thu tiền: the bank accounts first (owner, outlet admin), then the deposit lines for every role */
    fun collectRows(role: String?): List<CollectRow> =
        listOfNotNull(CollectRow.BANK_ACCOUNTS.takeIf { BankAccountRules.canManage(role) }) +
            listOf(CollectRow.DEPOSIT_MODE, CollectRow.TEMPLATES, CollectRow.POLICY)

    /** "Tiền tệ" is a line of Thông tin cửa hàng, for the shop owner only ([CurrencySetting.canEdit]) */
    fun storeInfoShowsCurrency(role: String?): Boolean = CurrencySetting.canEdit(role)

    /** "Cọc 1 lần · 2 ngân hàng": the deposit mode, then the bank count when known and above zero */
    fun collectValue(staged: Boolean, bankCount: Int?, oneTime: String, stagedText: String, banks: (Int) -> String): String {
        val mode = if (staged) stagedText else oneTime
        return if (bankCount != null && bankCount > 0) "$mode · ${banks(bankCount)}" else mode
    }

    /** "Tiệm Hoa · VND": the shop name, then the currency code for the owner */
    fun storeValue(name: String?, currency: String?): String =
        listOf(name, currency).mapNotNull { it?.trim() }.filter { it.isNotEmpty() }.joinToString(" · ")

    /** "80 mm" once a printer is saved, else the "not set up" text */
    fun printingValue(hasPrinter: Boolean, paperMillimetres: Int, none: String): String =
        if (hasPrinter) "$paperMillimetres mm" else none

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
