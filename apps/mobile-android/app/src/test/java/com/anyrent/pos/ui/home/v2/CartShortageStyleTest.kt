package com.anyrent.pos.ui.home.v2

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.theme.DS
import org.junit.Assert.assertEquals
import org.junit.Test

/** #1054 (owner): "Chỉ còn 1 trống…" in red read as out of stock; amber (#1032 palette) while units are free */
class CartShortageStyleTest {
    @Test
    fun `low shortage uses the waiting palette in medium`() {
        val low = CartShortageStyle.of(CartV2Logic.ShortageTone.LOW)
        assertEquals(DS.Status.Waiting, low.colors)
        assertEquals(Color(0xFF9A3412), low.colors.text)
        assertEquals(Color(0xFFFFEDD5), low.colors.fill)
        assertEquals(FontWeight.Normal, low.weight)
    }

    /** #1064 (owner): 2+ free and enough for the cart = green, the existing "done" token, same weight as amber */
    @Test
    fun `enough units uses the done palette in medium`() {
        val ok = CartShortageStyle.of(CartV2Logic.ShortageTone.OK)
        assertEquals(DS.Status.Done, ok.colors)
        assertEquals(FontWeight.Normal, ok.weight)
    }

    @Test
    fun `no unit free stays red`() {
        val none = CartShortageStyle.of(CartV2Logic.ShortageTone.NONE)
        assertEquals(Color(0xFF991B1B), none.colors.text)
        assertEquals(Color(0xFFFEE2E2), none.colors.fill)
        assertEquals(FontWeight.Normal, none.weight)
    }
}
