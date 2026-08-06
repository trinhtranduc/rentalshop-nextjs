package com.anyrent.pos.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.UUID

/**
 * Persists auth session + stable device id for FCM register/unregister.
 * Why SharedPreferences: tiny session for MVP; EncryptedSharedPreferences can replace later.
 */
object SessionStore {
    private const val PREFS = "anyrent.session"
    private const val KEY_TOKEN = "accessToken"
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

    private lateinit var prefs: SharedPreferences
    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    var accessToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().putString(KEY_TOKEN, value).apply()
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
        prefs.edit()
            .remove(KEY_TOKEN)
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
            .apply()
        if (!rememberedEmail.isNullOrBlank()) {
            lastLoginEmail = rememberedEmail
        }
        runCatching { com.anyrent.pos.billing.PurchasesManager.logOut() }
    }

    fun expireAuth() {
        clearAuth()
        _sessionExpired.tryEmit(Unit)
    }
}
