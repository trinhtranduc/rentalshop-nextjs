package com.anyrent.pos.ui.home.v2

import androidx.compose.ui.graphics.Color
import com.anyrent.pos.data.CartStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1079 — when the cart bar shows (iOS `testSwitchBarShowsWithItemsOrManyCarts`) and the avatar colour */
class CartBarLogicTest {
    @Test
    fun barShowsWithItemsOrManyCarts() {
        assertFalse(CartBarLogic.shouldShow(cartCount = 1, itemCount = 0, isEditing = false))
        assertTrue(CartBarLogic.shouldShow(cartCount = 1, itemCount = 2, isEditing = false))
        assertTrue(CartBarLogic.shouldShow(cartCount = 2, itemCount = 0, isEditing = false))
        assertTrue("other carts stay in reach while editing", CartBarLogic.shouldShow(cartCount = 3, itemCount = 2, isEditing = true))
        assertFalse(CartBarLogic.shouldShow(cartCount = 1, itemCount = 2, isEditing = true))
    }

    private fun summary(number: Int, name: String?) = CartStore.CartSummary(
        number = number, customerName = name, avatar = "X", itemCount = 1, total = 0.0, isSale = false, dates = null, editOrderNumber = null,
    )

    @Test
    fun avatarIsGreyWithoutACustomerElseByCartNumber() {
        assertEquals(Color(0xFF94A3B8), CartBarLogic.avatarColor(summary(2, null)))
        assertEquals(Color(0xFF1D4ED8), CartBarLogic.avatarColor(summary(1, "Mai")))
        assertEquals(Color(0xFF7C3AED), CartBarLogic.avatarColor(summary(2, "Lâm")))
        assertEquals(Color(0xFF1D4ED8), CartBarLogic.avatarColor(summary(5, "Bảo")))
    }
}
