package com.anyrent.pos.domain.bank

import org.json.JSONObject

/** An outlet's bank account, `/api/merchants/{m}/outlets/{o}/bank-accounts` (#622) */
data class OutletBankAccount(
    val id: Int,
    val bankName: String,
    val accountNumber: String,
    val accountHolderName: String,
    val bankCode: String? = null,
    val branch: String? = null,
    val isDefault: Boolean = false,
    val isActive: Boolean = true,
) {
    companion object {
        fun fromJson(o: JSONObject): OutletBankAccount = OutletBankAccount(
            id = o.optInt("id"),
            bankName = o.optString("bankName"),
            accountNumber = o.optString("accountNumber"),
            accountHolderName = o.optString("accountHolderName"),
            bankCode = o.text("bankCode"),
            branch = o.text("branch"),
            isDefault = o.optBoolean("isDefault", false),
            isActive = o.optBoolean("isActive", true),
        )

        private fun JSONObject.text(key: String): String? =
            if (!has(key) || isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
    }
}

/** Form problems, checked before the API call (same checks as the iOS form) */
enum class BankAccountProblem { NO_BANK, NO_NUMBER, NO_HOLDER }

object BankAccountRules {
    /** #1320: how long the account printed on bills is kept before it is loaded again (same 5 minutes as iOS) */
    const val CACHE_TTL_MS = 300_000L

    /** #1320: whether an account cached at [cachedAtMs] may still be printed at [nowMs]; stale at the limit or when the clock went backwards */
    fun isCacheFresh(cachedAtMs: Long, nowMs: Long): Boolean {
        val age = nowMs - cachedAtMs
        return age >= 0 && age < CACHE_TTL_MS
    }

    /** Bank accounts screen: owners and outlet admins see it; staff only print the account, as iOS */
    fun canView(role: String?): Boolean = role == "MERCHANT" || role == "OUTLET_ADMIN"

    /** #1319: only the shop owner adds, edits, deletes and sets the default; the API refuses the outlet admin */
    fun canManage(role: String?): Boolean = role == "MERCHANT"

    /** The account printed on bills: the default active one, else the first active one */
    fun pick(accounts: List<OutletBankAccount>): OutletBankAccount? {
        val active = accounts.filter { it.isActive }
        return active.firstOrNull { it.isDefault } ?: active.firstOrNull()
    }

    fun validate(bankName: String, accountNumber: String, holder: String): BankAccountProblem? = when {
        bankName.isBlank() -> BankAccountProblem.NO_BANK
        accountNumber.isBlank() -> BankAccountProblem.NO_NUMBER
        holder.isBlank() -> BankAccountProblem.NO_HOLDER
        else -> null
    }

    /** POST / PUT body, same fields as iOS (`bankCode` is the BIN from the picker) */
    fun body(bankName: String, accountNumber: String, holder: String, branch: String, isDefault: Boolean): JSONObject =
        JSONObject()
            .put("bankName", bankName)
            .put("accountNumber", accountNumber.trim())
            .put("accountHolderName", holder.trim())
            .put("isDefault", isDefault)
            .apply {
                VietQr.binByBankName[bankName]?.let { put("bankCode", it) }
                branch.trim().takeIf { it.isNotEmpty() }?.let { put("branch", it) }
            }
}
