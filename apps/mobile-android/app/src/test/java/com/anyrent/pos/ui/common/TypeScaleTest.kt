package com.anyrent.pos.ui.common

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.ui.theme.DS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/** One type ramp for the new UI, same numbers as iOS `DS.TextSize` (#424) */
class TypeScaleTest {
    private val ramp = listOf(
        DS.TextSize.Title, DS.TextSize.Amount, DS.TextSize.Name, DS.TextSize.Input,
        DS.TextSize.Body, DS.TextSize.Secondary, DS.TextSize.Pill,
    )

    @Test
    fun `ramp is the board scale`() {
        assertEquals(24.sp, DS.TextSize.Title)
        assertEquals(20.sp, DS.TextSize.Amount)
        assertEquals(17.sp, DS.TextSize.Name)
        assertEquals(16.sp, DS.TextSize.Input)
        assertEquals(15.sp, DS.TextSize.Body)
        assertEquals(14.sp, DS.TextSize.Secondary)
        assertEquals(12.sp, DS.TextSize.Pill)
    }

    @Test
    fun `no 11 or 13 and 12 is the minimum`() {
        assertFalse(ramp.contains(11.sp))
        assertFalse(ramp.contains(13.sp))
        assertEquals(12f, ramp.minOf { it.value })
    }

    @Test
    fun `list rhythm`() {
        assertEquals(5.dp, DS.Gap.Line)
        assertEquals(4.dp, DS.Gap.LineTight)
        assertEquals(15.dp, DS.Gap.OrderRowVertical)
        assertEquals(16.dp, DS.Gap.RowHorizontal)
        assertEquals(14.dp, DS.Gap.ProductRow)
        assertEquals(96.dp, DS.Gap.ProductRowMinHeight)
    }
}
