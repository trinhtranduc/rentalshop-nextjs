package com.anyrent.pos.domain.settings

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.domain.bank.BankAccountRules
import com.anyrent.pos.domain.products.CategoryRules
import org.json.JSONObject

enum class SettingsItem {
    /**
     * #1270 CỬA HÀNG (plan B): Thông tin cửa hàng (owner; other roles "Thông tin chi nhánh"; the owner's Tiền tệ row is inside, #1313),
     * Tài khoản ngân hàng (owner, outlet admin), Cọc ›, In & phiếu ›
     */
    STORE_INFO, BANK_ACCOUNTS, DEPOSIT, PRINTING,
    CATEGORIES, CUSTOMERS, USERS, EXPORT,
    /** #1259 TÀI KHOẢN: Gói dịch vụ, Ngôn ngữ, Nâng cao (Thông tin ứng dụng + Xoá tài khoản) */
    PLAN, LANGUAGE, ADVANCED,
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
     * #1259: 3 groups, 12 rows for the owner plus the overlap switch, the name card and the bell.
     * - customers: every role (as today)
     * - users: MERCHANT, OUTLET_ADMIN, ADMIN (`PermissionManager.canManageUsers`)
     * - export: never OUTLET_STAFF (`PermissionManager.canExport`)
     * - plan: once `subscriptions/status` answered, not for ADMIN
     * - categories (#632): whoever may add one (`CategoryRules.canAdd`: MERCHANT, OUTLET_ADMIN), as iOS
     * - notifications (#937): not a row any more; the bell at the top right of Cài đặt (every role, with the unread badge)
     * - the bank accounts line (#622) sits inside Thu tiền; the owner's currency (#1145) inside Thông tin cửa hàng (#1313)
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
            SettingsSection(
                SettingsGroup.STORE,
                listOf(SettingsItem.STORE_INFO) +
                    listOfNotNull(SettingsItem.BANK_ACCOUNTS.takeIf { BankAccountRules.canManage(role) }) +
                    listOf(SettingsItem.DEPOSIT, SettingsItem.PRINTING),
            ),
            SettingsSection(SettingsGroup.MANAGEMENT, management),
            SettingsSection(SettingsGroup.ACCOUNT, account),
        ).filter { it.items.isNotEmpty() }
    }

    /** "80 mm" once a printer is saved, else "80 mm · chưa chọn máy in" */
    fun printingValue(hasPrinter: Boolean, paperMillimetres: Int, none: String): String =
        if (hasPrinter) "$paperMillimetres mm" else "$paperMillimetres mm · $none"

    /** Cọc screen: "Mẫu giai đoạn" and "Chính sách huỷ / dời ngày" look dimmed in "Thu cọc 1 lần" (still tappable) */
    fun depositStagesDimmed(staged: Boolean): Boolean = !staged

    /** #937: badge on the "Thông báo" row: the unread count, capped at 99, none at 0 */
    fun unreadBadge(count: Int): String? = if (count > 0) count.coerceAtMost(99).toString() else null

    /** The list whose `total` (with `limit=1`) shows next to a row (#388) */
    fun countPath(item: SettingsItem): String? = when (item) {
        SettingsItem.CUSTOMERS -> "/api/customers?limit=1&page=1"
        SettingsItem.USERS -> "/api/users?limit=1&page=1"
        SettingsItem.STORE_INFO -> "/api/outlets?limit=1&page=1" // #1313: "3 chi nhánh" on the owner's row
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
