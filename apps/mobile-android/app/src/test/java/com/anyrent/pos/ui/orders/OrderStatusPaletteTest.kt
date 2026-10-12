package com.anyrent.pos.ui.orders

import androidx.compose.ui.graphics.Color
import com.anyrent.pos.ui.orders.v2.OrderStatusPalette
import com.anyrent.pos.ui.orders.v2.OrderStatusTag
import com.anyrent.pos.ui.theme.DS
import org.junit.Assert.assertEquals
import org.junit.Test

/** #888 (owner): status badges default to the old app colours (solid, white text); "Nhạt" is the pastel set (iOS) */
class OrderStatusPaletteTest {
    @Test
    fun `bold is the default and the old app colours`() {
        assertEquals(OrderStatusPalette.BOLD, OrderStatusPalette.fromStored(null))
        assertEquals(OrderStatusPalette.BOLD, OrderStatusPalette.fromStored("garbage"))
        assertEquals(OrderStatusPalette.LIGHT, OrderStatusPalette.fromStored(OrderStatusPalette.LIGHT.stored))
        listOf(
            "RESERVED" to Color(0xFFEF4444), "PICKUPED" to Color(0xFFF19920), "RETURNED" to Color(0xFF16A34A),
            "COMPLETED" to Color(0xFF16A34A), "CANCELLED" to Color(0xFF991B1B),
        ).forEach { (status, fill) ->
            val pill = OrderStatusTag.colors(status, OrderStatusPalette.BOLD)
            assertEquals(status, fill, pill.fill)
            assertEquals(status, Color.White, pill.text)
        }
    }

    @Test
    fun `light is the pastel set`() {
        assertEquals(DS.Status.HandOver, OrderStatusTag.colors("RESERVED", OrderStatusPalette.LIGHT))
        assertEquals(DS.Status.Return, OrderStatusTag.colors("PICKUPED", OrderStatusPalette.LIGHT))
        assertEquals(DS.Status.Done, OrderStatusTag.colors("RETURNED", OrderStatusPalette.LIGHT))
        assertEquals(DS.Status.Cancelled, OrderStatusTag.colors("CANCELLED", OrderStatusPalette.LIGHT))
    }
}
