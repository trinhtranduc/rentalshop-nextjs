package com.anyrent.pos.data

import android.content.Context
import android.content.SharedPreferences
import com.anyrent.pos.domain.outlet.CurrentOutletLogic
import com.anyrent.pos.domain.outlet.CurrentOutletState
import com.anyrent.pos.domain.outlet.OutletChoice
import com.anyrent.pos.domain.outlet.OutletChoiceStore
import com.anyrent.pos.domain.outlet.OutletHeaderMode
import com.anyrent.pos.domain.outlet.OutletSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * #828: the branch the app works in, for every screen and request (iOS `CurrentOutlet.shared`). See
 * [CurrentOutletState] for the rules. Before [init] (plain unit tests) it answers like a signed-out app.
 */
object CurrentOutlet {
    private const val PREFS = "anyrent.currentOutlet"
    private const val CHOICE_PREFIX = "choice."
    private const val OUTLETS_PREFIX = "outlets."

    private var prefs: SharedPreferences? = null
    private val refreshLock = Mutex()

    private val store = object : OutletChoiceStore {
        override fun remembered(userId: Int): Int? =
            prefs?.getInt(CHOICE_PREFIX + userId, -1)?.takeIf { it > 0 }

        override fun remember(userId: Int, outletId: Int) {
            prefs?.edit()?.putInt(CHOICE_PREFIX + userId, outletId)?.apply()
        }

        override fun forgetChoice(userId: Int) {
            prefs?.edit()?.remove(CHOICE_PREFIX + userId)?.apply()
        }

        override fun cachedOutlets(userId: Int): String? = prefs?.getString(OUTLETS_PREFIX + userId, null)

        override fun cacheOutlets(userId: Int, raw: String) {
            prefs?.edit()?.putString(OUTLETS_PREFIX + userId, raw)?.apply()
        }

        override fun forgetOutlets(userId: Int) {
            prefs?.edit()?.remove(OUTLETS_PREFIX + userId)?.apply()
        }
    }

    private val state = CurrentOutletState(store) {
        if (!SessionStore.isReady || !SessionStore.isLoggedIn) return@CurrentOutletState null
        val userId = SessionStore.userId ?: return@CurrentOutletState null
        OutletSession(
            userId = userId,
            role = SessionStore.role,
            outletId = SessionStore.outletId,
            outletName = SessionStore.outletName,
            outletPhone = SessionStore.outletPhone,
            outletAddress = SessionStore.outletAddress,
        )
    }

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    val version: StateFlow<Long> get() = state.version
    val fallbackNotice: StateFlow<String?> get() = state.fallbackNotice
    val id: Int? get() = state.id
    val merchantFilterId: Int? get() = state.merchantFilterId
    val outlet: OutletChoice? get() = state.outlet
    val name: String? get() = state.name
    val outlets: List<OutletChoice> get() = state.outlets
    val canSwitch: Boolean get() = state.canSwitch
    val headerMode: OutletHeaderMode get() = state.headerMode

    /** Store phone for receipts: the branch in use, then the shop (was `SessionStore.storePhone`) */
    val storePhone: String?
        get() = outlet?.phone?.takeIf { it.isNotBlank() } ?: SessionStore.merchantPhone?.takeIf { it.isNotBlank() }

    /** Store address for receipts: the branch in use, then the shop (was `SessionStore.storeAddress`) */
    val storeAddress: String?
        get() = outlet?.address?.takeIf { it.isNotBlank() } ?: SessionStore.merchantAddress?.takeIf { it.isNotBlank() }

    fun select(outletId: Int) = state.select(outletId)

    fun fallbackShown() = state.fallbackShown()

    fun forget(userId: Int?) = state.forget(userId)

    /** Reloads a merchant's active outlets (`GET /api/outlets`); no-op for other roles or while one is running */
    suspend fun refresh() {
        if (!SessionStore.isReady || SessionStore.role != CurrentOutletLogic.MERCHANT) return
        val userId = SessionStore.userId ?: return
        if (refreshLock.isLocked) return
        refreshLock.withLock {
            val loaded = withContext(Dispatchers.IO) {
                runCatching { CurrentOutletLogic.parseOutlets(ApiClient.get().authedGet("/api/outlets?page=1&limit=50")) }.getOrNull()
            } ?: return
            state.applyLoaded(loaded, userId)
        }
    }
}
