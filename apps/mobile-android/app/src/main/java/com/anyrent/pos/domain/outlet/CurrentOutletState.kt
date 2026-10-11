package com.anyrent.pos.domain.outlet

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Where the choice and the outlet list are kept on the device, per account (SharedPreferences in the app) */
interface OutletChoiceStore {
    fun remembered(userId: Int): Int?
    fun remember(userId: Int, outletId: Int)
    fun forgetChoice(userId: Int)
    fun cachedOutlets(userId: Int): String?
    fun cacheOutlets(userId: Int, raw: String)
    fun forgetOutlets(userId: Int)
}

/** The signed-in user as far as the branch is concerned */
data class OutletSession(
    val userId: Int,
    val role: String?,
    /** The outlet of the login (outlet users; usually none for a MERCHANT) */
    val outletId: Int?,
    val outletName: String? = null,
    val outletPhone: String? = null,
    val outletAddress: String? = null,
)

/**
 * #828: the one place the app asks "which branch am I working in" (iOS `CurrentOutlet`). Outlet users
 * (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY) always work in their own outlet. A MERCHANT works in the branch it
 * picked on Home (remembered on this device per account), else the shop's default outlet. Logout forgets the choice.
 */
class CurrentOutletState(
    private val store: OutletChoiceStore,
    private val session: () -> OutletSession?,
) {
    private var outletsCache: List<OutletChoice> = emptyList()
    private var loadedForUserId: Int? = null

    private val _version = MutableStateFlow(0L)

    /** Bumped when the branch in use or the header changes; screens reload on it */
    val version: StateFlow<Long> = _version.asStateFlow()

    private val _fallbackNotice = MutableStateFlow<String?>(null)

    /** Name of the default branch after the remembered one was turned off; the UI tells the merchant once */
    val fallbackNotice: StateFlow<String?> = _fallbackNotice.asStateFlow()

    private val isMerchant: Boolean get() = session()?.role == CurrentOutletLogic.MERCHANT

    /** Active outlets of the merchant, default first (empty for outlet users or before the first load) */
    val outlets: List<OutletChoice>
        get() {
            val user = session() ?: return emptyList()
            if (user.role != CurrentOutletLogic.MERCHANT) return emptyList()
            syncCache(user.userId)
            return outletsCache
        }

    /**
     * The outlet the app works in: the outlet user's own, or the merchant's chosen (else default) branch.
     * Null only for a merchant before its outlets were ever loaded on this device (the API then uses the default).
     */
    val id: Int?
        get() {
            val user = session() ?: return null
            if (user.role != CurrentOutletLogic.MERCHANT) return user.outletId
            syncCache(user.userId)
            val remembered = store.remembered(user.userId)
            return CurrentOutletLogic.resolve(remembered, outletsCache).outlet?.id ?: remembered ?: user.outletId
        }

    /** For filters the API did not get before (#828): the chosen branch of a merchant, null for outlet users */
    val merchantFilterId: Int? get() = if (isMerchant) id else null

    /** The branch in use with its name, phone and address (receipts, share image, cart) */
    val outlet: OutletChoice?
        get() {
            val user = session() ?: return null
            val own = user.outletId?.let { ownId ->
                user.outletName?.let { OutletChoice(ownId, it, user.outletAddress, user.outletPhone, isDefault = true) }
            }
            if (user.role != CurrentOutletLogic.MERCHANT) return own
            val current = id
            return outlets.firstOrNull { it.id == current } ?: own
        }

    val name: String? get() = outlet?.name

    val canSwitch: Boolean get() = CurrentOutletLogic.canSwitch(session()?.role, outlets.size)

    val isDefault: Boolean
        get() {
            if (!isMerchant || outlets.size < 2) return true
            return outlet?.isDefault == true
        }

    val headerMode: OutletHeaderMode
        get() = CurrentOutletLogic.headerMode(session()?.role, outlets.size, name, isDefault)

    /** Merchant picked a branch in the sheet */
    fun select(outletId: Int) {
        val user = session() ?: return
        if (user.role != CurrentOutletLogic.MERCHANT) return
        val before = id
        store.remember(user.userId, outletId)
        if (before != id) bump()
    }

    /**
     * Applies a fresh list of the merchant's outlets (`GET /api/outlets`). A remembered branch that is no longer
     * active falls back to the default and [fallbackNotice] gets the default's name.
     */
    fun applyLoaded(loaded: List<OutletChoice>, forUserId: Int) {
        val user = session() ?: return
        if (user.userId != forUserId || user.role != CurrentOutletLogic.MERCHANT) return
        val beforeId = id
        val beforeMode = headerMode
        val active = CurrentOutletLogic.activeOutlets(loaded)
        outletsCache = active
        loadedForUserId = user.userId
        store.cacheOutlets(user.userId, CurrentOutletLogic.encode(active))
        val result = CurrentOutletLogic.resolve(store.remembered(user.userId), active)
        if (result.fellBack) {
            store.forgetChoice(user.userId)
            result.outlet?.name?.let { _fallbackNotice.value = it }
        }
        if (beforeId != id || beforeMode != headerMode) bump()
    }

    fun fallbackShown() {
        _fallbackNotice.value = null
    }

    /** Logout or account change: back to the default branch next time */
    fun forget(userId: Int?) {
        if (userId != null) {
            store.forgetChoice(userId)
            store.forgetOutlets(userId)
        }
        outletsCache = emptyList()
        loadedForUserId = null
        _fallbackNotice.value = null
        bump()
    }

    private fun syncCache(userId: Int) {
        if (loadedForUserId == userId) return
        loadedForUserId = userId
        outletsCache = CurrentOutletLogic.activeOutlets(CurrentOutletLogic.decode(store.cachedOutlets(userId)))
    }

    private fun bump() = _version.update { it + 1 }
}
