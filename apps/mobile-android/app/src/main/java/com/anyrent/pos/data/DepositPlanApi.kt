package com.anyrent.pos.data

import com.anyrent.pos.domain.deposit.CollectInstallmentRequest
import com.anyrent.pos.domain.deposit.DepositMode
import com.anyrent.pos.domain.deposit.DepositSettings
import com.anyrent.pos.domain.deposit.DepositTemplate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/**
 * Calls of "Thu cọc theo giai đoạn" (#1199, iOS `DepositPlanAPIService`): the shop setting, collecting / voiding a
 * stage, editing the plan of one order. Blocking calls; run them off the main thread (the suspend wrappers do).
 */
object DepositPlanApi {
    private val json = "application/json; charset=utf-8".toMediaType()
    private fun body(o: JSONObject) = o.toString().toRequestBody(json)

    /** GET /api/settings/deposit (every role) */
    fun settings(): Result<DepositSettings> =
        runCatching { DepositSettings.fromJson(ApiClient.get().authedGet("/api/settings/deposit")) }

    /** PUT /api/settings/deposit (shop owner only, 403 for others). Only the keys given are sent. Answers the saved setting. */
    fun saveSettings(
        mode: DepositMode? = null,
        cancellationPolicy: String? = null,
        templates: List<DepositTemplate>? = null,
    ): Result<DepositSettings> = runCatching {
        DepositSettings.fromJson(
            ApiClient.get().authedPut("/api/settings/deposit", body(DepositSettings.saveBody(mode, cancellationPolicy, templates))),
        )
    }

    fun collectPath(orderId: Int, key: String) = "/api/orders/$orderId/installments/$key/collect"
    fun voidPath(orderId: Int, key: String) = "/api/orders/$orderId/installments/$key/void"
    fun planPath(orderId: Int) = "/api/orders/$orderId/deposit-plan"

    /** POST /api/orders/{id}/installments/{key}/collect; [reference] is one value per tap, reused on a retry */
    fun collect(orderId: Int, key: String, amount: Double, method: String, reference: String): Result<Unit> = runCatching {
        ApiClient.get().authedPost(collectPath(orderId, key), body(CollectInstallmentRequest.body(amount, method, reference)))
        Unit
    }

    /** POST /api/orders/{id}/installments/{key}/void (shop owner) */
    fun void(orderId: Int, key: String): Result<Unit> = runCatching {
        ApiClient.get().authedPost(voidPath(orderId, key), body(JSONObject()))
        Unit
    }

    /** PUT /api/orders/{id}/deposit-plan (shop owner and outlet admin): the explicit stages, never the last one */
    fun editPlan(orderId: Int, items: List<JSONObject>): Result<Unit> = runCatching {
        ApiClient.get().authedPut(planPath(orderId), body(JSONObject().put("items", JSONArray(items))))
        Unit
    }
}

/**
 * The shop's deposit mode and the last setting read from the API (iOS `DepositModeStore`). A flag missing from the
 * login payload is fetched, not guessed (lesson of #1138); until then it acts as "Thu cọc 1 lần".
 */
object DepositModeStore {
    private val _latest = MutableStateFlow<DepositSettings?>(null)

    /** The last setting read from the API: the cart needs its templates */
    val latest: StateFlow<DepositSettings?> = _latest.asStateFlow()

    /** A save is on its way: a refresh must not overwrite it */
    @Volatile var saving = false

    private var lastRefreshAt = 0L

    /** The mode in effect: the cached one, else "Thu cọc 1 lần" */
    val current: DepositMode get() = SessionStore.depositMode ?: DepositMode.ONE_TIME

    /** True while the mode or (for a staged shop) the templates are unknown */
    val needsFetch: Boolean get() = SessionStore.depositMode == null || (current == DepositMode.STAGED && _latest.value == null)

    /** A save answered with the setting in effect */
    fun didSave(settings: DepositSettings) {
        _latest.value = settings
        SessionStore.depositMode = settings.depositMode
    }

    /**
     * Reads the shop's setting when the cache has none (or [force]), at most once a minute. Returns the mode in effect.
     */
    suspend fun refresh(force: Boolean = false): DepositMode {
        val now = System.currentTimeMillis()
        if (!force) {
            val age = now - lastRefreshAt
            if (lastRefreshAt != 0L && (age < 10_000 || (age < 60_000 && !needsFetch))) return current
        }
        lastRefreshAt = now
        val result = withContext(Dispatchers.IO) { DepositPlanApi.settings() }
        result.getOrNull()?.let { if (!saving) didSave(it) }
        return current
    }

    /** Logout / tests */
    fun reset() {
        _latest.value = null
        lastRefreshAt = 0L
        saving = false
    }
}
