package com.anyrent.pos.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import com.anyrent.pos.domain.deposit.DepositMode
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.money.ShopMoney
import java.util.UUID

/**
 * Persists auth session + stable device id for FCM register/unregister.
 * Why SharedPreferences: tiny session for MVP. The refresh token is encrypted with a
 * Keystore key ([TokenCipher]); the access token is short-lived (1 hour).
 */
object SessionStore {
    private const val PREFS = "anyrent.session"
    private const val KEY_TOKEN = "accessToken"
    private const val KEY_REFRESH_TOKEN = "refreshTokenEnc"
    private const val KEY_USER_NAME = "userName"
    private const val KEY_EMAIL = "email"
    /** Survives logout — same as iOS `LastLoginEmail`. */
    private const val KEY_LAST_LOGIN_EMAIL = "lastLoginEmail"
    private const val KEY_ROLE = "role"
    private const val KEY_USER_ID = "userId"
    private const val KEY_MERCHANT_ID = "merchantId"
    private const val KEY_OUTLET_ID = "outletId"
    private const val KEY_MERCHANT_NAME = "merchantName"
    private const val KEY_OUTLET_NAME = "outletName"
    private const val KEY_OUTLET_PHONE = "outletPhone"
    private const val KEY_OUTLET_ADDRESS = "outletAddress"
    private const val KEY_MERCHANT_PHONE = "merchantPhone"
    private const val KEY_MERCHANT_ADDRESS = "merchantAddress"
    private const val KEY_DEVICE_ID = "deviceId"
    private const val KEY_PENDING_ORDER_ID = "pendingOrderId"
    private const val KEY_ONBOARDING = "onboardingDone"
    private const val KEY_APP_CONFIG = "appConfig"
    /** #518 shop setting "Cho tạo đơn khi trùng lịch"; absent = ON */
    private const val KEY_ALLOW_OVERLAP = "allowOverlappingOrders"
    /** #910 active module keys of the shop (`merchant.modules`, #907) */
    private const val KEY_MODULES = "merchantModules"
    private const val KEY_PERMISSIONS = "permissions"
    /** #1145 the shop's currency (`merchant.currency`, "VND" / "USD"); absent = VND */
    private const val KEY_CURRENCY = "merchantCurrency"
    /** #1199 "Cách thu cọc" (`merchant.depositMode`, "ONE_TIME" / "STAGED"); absent = unknown, the screens read GET /api/settings/deposit */
    private const val KEY_DEPOSIT_MODE = "merchantDepositMode"
    /** #1354 "Hiện ghi chú đơn trên ảnh chia sẻ" (`merchant.shareOrderNote` of GET /api/users/profile); absent = OFF */
    private const val KEY_SHARE_ORDER_NOTE = "shareOrderNote"

    private lateinit var prefs: SharedPreferences
    /** Emits the server's 401 code (e.g. SESSION_REPLACED) so the UI can say why the user was signed out. */
    private val _sessionExpired = MutableSharedFlow<String?>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    /** Last good app config (#370) as JSON; kept across logouts so a forced update survives them */
    var appConfigJson: String?
        get() = prefs.getString(KEY_APP_CONFIG, null)
        set(value) { prefs.edit().putString(KEY_APP_CONFIG, value).apply() }

    /** False in plain unit tests (no Context): readers that may run there check it first */
    val isReady: Boolean get() = ::prefs.isInitialized

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        _allowOverlappingOrders.value = prefs.getBoolean(KEY_ALLOW_OVERLAP, true)
        _modules.value = prefs.getStringSet(KEY_MODULES, emptySet()).orEmpty().toSet()
        setCurrencyValue(ShopCurrency.from(prefs.getString(KEY_CURRENCY, null)))
        _depositMode.value = prefs.getString(KEY_DEPOSIT_MODE, null)?.let(DepositMode::from)
        _shareOrderNote.value = prefs.getBoolean(KEY_SHARE_ORDER_NOTE, false)
    }

    private val _shareOrderNote = MutableStateFlow(false)

    /** #1354 the shop's "Hiện ghi chú đơn trên ảnh chia sẻ", cached from GET /api/users/profile; OFF while never read */
    val shareOrderNoteFlow: StateFlow<Boolean> = _shareOrderNote.asStateFlow()

    var shareOrderNote: Boolean
        get() = _shareOrderNote.value
        set(value) {
            _shareOrderNote.value = value
            if (isReady) prefs.edit().putBoolean(KEY_SHARE_ORDER_NOTE, value).apply()
        }

    /** #1354 a save is on its way: a profile read must not overwrite the optimistic value */
    @Volatile var shareOrderNoteSaving: Boolean = false

    private val _depositMode = MutableStateFlow<DepositMode?>(null)

    /** #1199 the shop's "Cách thu cọc" from login `merchant.depositMode` and GET /api/settings/deposit; null while unknown */
    val depositModeFlow: StateFlow<DepositMode?> = _depositMode.asStateFlow()

    var depositMode: DepositMode?
        get() = _depositMode.value
        set(value) {
            _depositMode.value = value
            if (isReady) prefs.edit().apply { if (value == null) remove(KEY_DEPOSIT_MODE) else putString(KEY_DEPOSIT_MODE, value.raw) }.apply()
        }

    private val _currency = MutableStateFlow(ShopCurrency.VND)

    /** #1145 the shop's currency, from login `merchant.currency` and GET /api/settings/currency; VND when unknown */
    val currencyFlow: StateFlow<ShopCurrency> = _currency.asStateFlow()

    var currency: ShopCurrency
        get() = _currency.value
        set(value) {
            setCurrencyValue(value)
            if (isReady) prefs.edit().putString(KEY_CURRENCY, value.code).apply()
        }

    private fun setCurrencyValue(value: ShopCurrency) {
        _currency.value = value
        ShopMoney.publish(value)
    }

    private val _modules = MutableStateFlow<Set<String>>(emptySet())

    /** #910 active modules of the user's shop (login / profile `merchant.modules`); empty when the API sends none */
    val modulesFlow: StateFlow<Set<String>> = _modules.asStateFlow()

    var modules: Set<String>
        get() = _modules.value
        set(value) {
            _modules.value = value
            if (isReady) prefs.edit().putStringSet(KEY_MODULES, value).apply()
        }

    private val _allowOverlappingOrders = MutableStateFlow(true)

    /** #518 "Cho tạo đơn khi trùng lịch" of the user's shop, cached from login / profile; ON when unknown */
    val allowOverlappingOrdersFlow: StateFlow<Boolean> = _allowOverlappingOrders.asStateFlow()

    var allowOverlappingOrders: Boolean
        get() = _allowOverlappingOrders.value
        set(value) {
            _allowOverlappingOrders.value = value
            prefs.edit().putBoolean(KEY_ALLOW_OVERLAP, value).apply()
        }

    var accessToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().putString(KEY_TOKEN, value).apply()
        }

    /** Rotated on every refresh (#344). Stored encrypted; null when absent or unreadable. */
    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)?.let { TokenCipher.decrypt(it) }
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_REFRESH_TOKEN)
                else putString(KEY_REFRESH_TOKEN, TokenCipher.encrypt(value))
            }.apply()
        }

    var userName: String?
        get() = prefs.getString(KEY_USER_NAME, null)
        set(value) {
            prefs.edit().putString(KEY_USER_NAME, value).apply()
        }

    var email: String?
        get() = prefs.getString(KEY_EMAIL, null)
        set(value) {
            prefs.edit().putString(KEY_EMAIL, value).apply()
        }

    /** Prefill login email after logout (not cleared by [clearAuth]). */
    var lastLoginEmail: String?
        get() = prefs.getString(KEY_LAST_LOGIN_EMAIL, null)
        set(value) {
            prefs.edit().putString(KEY_LAST_LOGIN_EMAIL, value).apply()
        }

    /**
     * #1124 the login's permission list (`user.permissions`); null for a session signed in before this version,
     * then [com.anyrent.pos.domain.booking.BookingLogic] decides by [role].
     */
    var permissions: Set<String>?
        get() = if (isReady) prefs.getStringSet(KEY_PERMISSIONS, null)?.toSet() else null
        set(value) {
            if (!isReady) return
            prefs.edit().apply { if (value == null) remove(KEY_PERMISSIONS) else putStringSet(KEY_PERMISSIONS, value) }.apply()
        }

    var role: String?
        get() = prefs.getString(KEY_ROLE, null)
        set(value) {
            prefs.edit().putString(KEY_ROLE, value).apply()
        }

    var userId: Int?
        get() = prefs.getInt(KEY_USER_ID, -1).takeIf { it > 0 }
        set(value) {
            prefs.edit().putInt(KEY_USER_ID, value ?: -1).apply()
        }

    var merchantId: Int?
        get() = prefs.getInt(KEY_MERCHANT_ID, -1).takeIf { it > 0 }
        set(value) {
            prefs.edit().putInt(KEY_MERCHANT_ID, value ?: -1).apply()
        }

    var outletId: Int?
        get() = prefs.getInt(KEY_OUTLET_ID, -1).takeIf { it > 0 }
        set(value) {
            prefs.edit().putInt(KEY_OUTLET_ID, value ?: -1).apply()
        }

    var merchantName: String?
        get() = prefs.getString(KEY_MERCHANT_NAME, null)
        set(value) {
            prefs.edit().putString(KEY_MERCHANT_NAME, value).apply()
        }

    var outletName: String?
        get() = prefs.getString(KEY_OUTLET_NAME, null)
        set(value) {
            prefs.edit().putString(KEY_OUTLET_NAME, value).apply()
        }

    var outletPhone: String?
        get() = prefs.getString(KEY_OUTLET_PHONE, null)
        set(value) {
            prefs.edit().putString(KEY_OUTLET_PHONE, value).apply()
        }

    var outletAddress: String?
        get() = prefs.getString(KEY_OUTLET_ADDRESS, null)
        set(value) {
            prefs.edit().putString(KEY_OUTLET_ADDRESS, value).apply()
        }

    var merchantPhone: String?
        get() = prefs.getString(KEY_MERCHANT_PHONE, null)
        set(value) {
            prefs.edit().putString(KEY_MERCHANT_PHONE, value).apply()
        }

    var merchantAddress: String?
        get() = prefs.getString(KEY_MERCHANT_ADDRESS, null)
        set(value) {
            prefs.edit().putString(KEY_MERCHANT_ADDRESS, value).apply()
        }

    /** Store phone for receipts — outlet first, then merchant (iOS OrderViewModel). */
    val storePhone: String?
        get() = outletPhone?.takeIf { it.isNotBlank() } ?: merchantPhone?.takeIf { it.isNotBlank() }

    /** Store address for receipts — outlet first, then merchant (iOS OrderViewModel). */
    val storeAddress: String?
        get() = outletAddress?.takeIf { it.isNotBlank() } ?: merchantAddress?.takeIf { it.isNotBlank() }

    val isLoggedIn: Boolean
        get() = !accessToken.isNullOrBlank()

    /** Stable per-install id — mirrors iOS `anyrent.deviceId`. */
    val deviceId: String
        get() {
            val existing = prefs.getString(KEY_DEVICE_ID, null)
            if (!existing.isNullOrBlank()) return existing
            val id = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
            return id
        }

    var pendingOrderId: Int?
        get() = prefs.getInt(KEY_PENDING_ORDER_ID, -1).takeIf { it > 0 }
        set(value) {
            prefs.edit().putInt(KEY_PENDING_ORDER_ID, value ?: -1).apply()
        }

    var onboardingDone: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING, false)
        set(value) { prefs.edit().putBoolean(KEY_ONBOARDING, value).apply() }

    fun clearAuth() {
        // Keep lastLoginEmail so login screen can prefill like iOS.
        val rememberedEmail = email?.takeIf { it.isNotBlank() } ?: lastLoginEmail
        // #828: logout or a kicked session forgets the merchant's chosen branch (back to the default next time)
        CurrentOutlet.forget(userId)
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_NAME)
            .remove(KEY_EMAIL)
            .remove(KEY_ROLE)
            .remove(KEY_USER_ID)
            .remove(KEY_MERCHANT_ID)
            .remove(KEY_OUTLET_ID)
            .remove(KEY_MERCHANT_NAME)
            .remove(KEY_OUTLET_NAME)
            .remove(KEY_OUTLET_PHONE)
            .remove(KEY_OUTLET_ADDRESS)
            .remove(KEY_MERCHANT_PHONE)
            .remove(KEY_MERCHANT_ADDRESS)
            .remove(KEY_ALLOW_OVERLAP)
            .remove(KEY_MODULES)
            .remove(KEY_PERMISSIONS)
            .remove(KEY_CURRENCY)
            .remove(KEY_DEPOSIT_MODE)
            .remove(KEY_SHARE_ORDER_NOTE)
            .apply()
        _shareOrderNote.value = false
        _depositMode.value = null
        DepositModeStore.reset()
        _allowOverlappingOrders.value = true
        setCurrencyValue(ShopCurrency.VND)
        _modules.value = emptySet()
        if (!rememberedEmail.isNullOrBlank()) {
            lastLoginEmail = rememberedEmail
        }
        runCatching { com.anyrent.pos.billing.PurchasesManager.logOut() }
        com.anyrent.pos.push.DraftOrderReminder.cancel()
        CartStore.clear(persistToDisk = false)
    }

    /** [code] is the server's 401 code, e.g. SESSION_REPLACED when another device signed in. */
    fun expireAuth(code: String? = null) {
        clearAuth()
        _sessionExpired.tryEmit(code)
    }
}
