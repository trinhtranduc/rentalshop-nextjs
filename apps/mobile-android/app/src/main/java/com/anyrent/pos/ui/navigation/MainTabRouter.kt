package com.anyrent.pos.ui.navigation

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.filterNotNull

/**
 * Bridges root-level screens (cart checkout) to the nested Main tab NavHost.
 *
 * Why: after creating an order we must leave Cart/CartPreview and land on the
 * Orders tab — tabNav is not reachable from root composables directly.
 *
 * #433: the request is kept until Main applies it. Main is not composed while a root screen
 * (the cart) covers it, so a fire-and-forget event sent from the cart was lost.
 */
object MainTabRouter {
    const val HOME = "tab_home"
    const val ORDERS = "tab_orders"

    private val pendingTab = MutableStateFlow<String?>(null)

    /** The tab Main should switch to; Main calls [tabShown] once it has. */
    val selectTab: Flow<String> = pendingTab.filterNotNull()

    private val _refreshOrders = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val refreshOrders = _refreshOrders.asSharedFlow()

    /** Close cart flow externally, then call this to show the orders list. */
    fun openOrdersList(refresh: Boolean = true) {
        pendingTab.value = ORDERS
        if (refresh) _refreshOrders.tryEmit(Unit)
    }

    /** iOS swipe “Update Order” → Home tab (cart badge), then open cart route. */
    fun openHome() {
        pendingTab.value = HOME
    }

    /** Main switched to [route]: drop the request unless a newer one replaced it. */
    fun tabShown(route: String) {
        pendingTab.compareAndSet(route, null)
    }
}
