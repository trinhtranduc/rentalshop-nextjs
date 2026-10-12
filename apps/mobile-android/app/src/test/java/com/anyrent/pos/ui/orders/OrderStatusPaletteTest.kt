package com.anyrent.pos.ui.orders

import androidx.compose.ui.graphics.Color
import com.anyrent.pos.ui.common.OrderStatusStyle
import com.anyrent.pos.ui.orders.v2.OrderStatusTag
import org.junit.Assert.assertEquals
import org.junit.Test

/** #888 (owner): every status badge is the old app's solid colour with white text; no other palette (iOS) */
class OrderStatusPaletteTest {
    @Test
    fun `status badges are the old app solid colours`() {
        listOf(
            "RESERVED" to Color(0xFFEF4444), "PICKUPED" to Color(0xFFF19920), "RETURNED" to Color(0xFF16A34A),
            "COMPLETED" to Color(0xFF16A34A), "CANCELLED" to Color(0xFF991B1B),
        ).forEach { (status, fill) ->
            val pill = OrderStatusTag.colors(status)
            assertEquals(status, fill, pill.fill)
            assertEquals(status, Color.White, pill.text)
            assertEquals("old-screen badge $status", fill, OrderStatusStyle.badgeColor(status))
        }
    }
}
