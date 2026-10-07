package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.bank.BankAccountRules
import com.anyrent.pos.domain.bank.OutletBankAccount
import com.anyrent.pos.domain.error.AppError
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/** An outlet the bank accounts screen can switch to (a MERCHANT login has no outlet of its own) */
data class BankOutlet(val id: Int, val name: String, val isDefault: Boolean)

/**
 * #622: `/api/merchants/{merchantId}/outlets/{outletId}/bank-accounts[/{id}]`, same routes as iOS `BankAccountService`.
 * Blocking calls: run them on Dispatchers.IO.
 */
object BankAccountRepository {
    private val json = "application/json; charset=utf-8".toMediaType()

    /** Account printed on bills, per outlet, for this app session. Cleared by any write; failures are not cached. */
    private val printCache = ConcurrentHashMap<Int, Cached>()

    private class Cached(val account: OutletBankAccount?)

    private fun basePath(outletId: Int): String {
        val merchantId = SessionStore.merchantId ?: throw AppError.Validation("Merchant ID or Outlet ID not found")
        return "/api/merchants/$merchantId/outlets/$outletId/bank-accounts"
    }

    /** Active outlets of the shop: the login's own outlet when it has one, else every active outlet (default first) */
    fun outlets(): List<BankOutlet> {
        SessionStore.outletId?.let { own -> return listOf(BankOutlet(own, SessionStore.outletName.orEmpty(), true)) }
        val data = ApiClient.get().authedGet("/api/outlets?page=1&limit=50").optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("outlets") ?: return emptyList()
        return (0 until array.length()).map { array.getJSONObject(it) }
            .filter { it.optBoolean("isActive", true) }
            .map { BankOutlet(it.optInt("id"), it.optString("name"), it.optBoolean("isDefault", false)) }
            .sortedByDescending { it.isDefault }
    }

    /** Active accounts, default first (API order) */
    fun list(outletId: Int): List<OutletBankAccount> {
        val response = ApiClient.get().authedGet(basePath(outletId))
        val array = response.optJSONArray("data") ?: return emptyList()
        return (0 until array.length()).map { OutletBankAccount.fromJson(array.getJSONObject(it)) }.filter { it.isActive }
    }

    fun create(outletId: Int, body: JSONObject): OutletBankAccount {
        printCache.clear()
        val response = ApiClient.get().authedPost(basePath(outletId), body.toString().toRequestBody(json))
        return OutletBankAccount.fromJson(response.optJSONObject("data") ?: JSONObject())
    }

    fun update(outletId: Int, accountId: Int, body: JSONObject): OutletBankAccount {
        printCache.clear()
        val response = ApiClient.get().authedPut("${basePath(outletId)}/$accountId", body.toString().toRequestBody(json))
        return OutletBankAccount.fromJson(response.optJSONObject("data") ?: JSONObject())
    }

    /** Soft delete on the API (`isActive = false`) */
    fun delete(outletId: Int, accountId: Int) {
        printCache.clear()
        ApiClient.get().authedDelete("${basePath(outletId)}/$accountId")
    }

    /** The outlet's account for a bill (default, else first), or null when there is none or the load fails */
    fun printAccount(outletId: Int): OutletBankAccount? {
        printCache[outletId]?.let { return it.account }
        val accounts = runCatching { list(outletId) }.getOrNull() ?: return null
        val account = BankAccountRules.pick(accounts)
        printCache[outletId] = Cached(account)
        return account
    }
}
