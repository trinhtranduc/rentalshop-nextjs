package com.anyrent.pos.ui.navigation

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Bridges root-level screens (cart checkout) to the nested Main tab NavHost.
 *
 * Why: after creating an order we must leave Cart/CartPreview and land on the
 * Orders tab — tabNav is not reachable from root composables directly.
 */
object MainTabRouter {
    const val HOME = "tab_home"
    const val ORDERS = "tab_orders"

    private val _selectTab = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val selectTab = _selectTab.asSharedFlow()

    private val _refreshOrders = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val refreshOrders = _refreshOrders.asSharedFlow()

    /** Close cart flow externally, then call this to show the orders list. */
    fun openOrdersList(refresh: Boolean = true) {
        _selectTab.tryEmit(ORDERS)
        if (refresh) _refreshOrders.tryEmit(Unit)
    }

    /** iOS swipe “Update Order” → Home tab (cart badge), then open cart route. */
    fun openHome() {
        _selectTab.tryEmit(HOME)
    }
}
