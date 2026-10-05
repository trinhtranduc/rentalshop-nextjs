package com.anyrent.pos.ui.navigation

/**
 * #433: where the redesigned cart's "+ Add" takes the user. Always the product list on Home, whatever
 * opened the cart (Home, a customer, an order): pop the root stack back to Main and select Home.
 * The cart state lives in CartStore, so the customer and lines are still there on the way back.
 */
object CartAddItems {
    /** The route to pop back to (inclusive = false), or null when Main is not in the stack: just go back. */
    fun popTarget(backStack: List<String?>): String? = Routes.Main.takeIf { it in backStack }
}
