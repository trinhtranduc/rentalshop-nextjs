package com.anyrent.pos.ui.navigation

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #433: the cart's "+ Add" opens the product list (Home), not the screen the cart came from. */
class CartAddItemsTest {

    @Test
    fun `cart opened from a customer pops back to Main, not to the customer page`() {
        val backStack = listOf(Routes.Main, Routes.Customers, Routes.CustomerDetailV2, Routes.CartV2)
        assertEquals(Routes.Main, CartAddItems.popTarget(backStack))
    }

    @Test
    fun `cart opened from an order pops back to Main`() {
        val backStack = listOf(Routes.Main, Routes.OrderDetail, Routes.CartV2)
        assertEquals(Routes.Main, CartAddItems.popTarget(backStack))
    }

    @Test
    fun `cart opened from Home pops back to Main`() {
        assertEquals(Routes.Main, CartAddItems.popTarget(listOf(Routes.Main, Routes.CartV2)))
    }

    @Test
    fun `without Main in the stack there is no target and the cart just goes back`() {
        assertNull(CartAddItems.popTarget(listOf(Routes.CartV2)))
    }

    @Test
    fun `Home requested while the cart covers Main is applied when Main comes back`() = runTest {
        // The cart asks for Home before Main is composed again: nobody collects yet
        MainTabRouter.openHome()
        val delivered = withTimeoutOrNull(1_000) { MainTabRouter.selectTab.first() }
        assertEquals(MainTabRouter.HOME, delivered)

        // Once Main has switched the tab, the request is not replayed on the next return
        MainTabRouter.tabShown(MainTabRouter.HOME)
        assertNull(withTimeoutOrNull(1_000) { MainTabRouter.selectTab.first() })
    }
}
