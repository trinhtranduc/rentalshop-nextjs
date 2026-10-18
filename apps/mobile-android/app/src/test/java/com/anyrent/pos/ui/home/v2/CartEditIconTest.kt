package com.anyrent.pos.ui.home.v2

import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.VectorPath
import androidx.compose.ui.unit.dp
import com.anyrent.pos.domain.products.CartV2Icon
import com.anyrent.pos.ui.common.AppIcons
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

/**
 * #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): every edit spot in the cart (Giảm giá, Đặt cọc,
 * Ghi chú đơn, a line's note) draws the mockup's pen-line through one icon (iOS `DS.editIcon`, `V2.editPencil`)
 */
class CartEditIconTest {
    @Test
    fun `every cart edit uses the one pen-line`() {
        assertSame(AppIcons.EditLine, cartIcon(CartV2Icon.EDIT))
        assertSame(AppIcons.EditLine, cartIcon(CartV2Icon.ITEM_NOTE))
        assertSame(AppIcons.EditLine, cartIcon(CartV2Icon.ORDER_NOTE))
        assertSame(AppIcons.EditLine, CartEditIcon)
        assertEquals(16.dp, CartEditIconSize)
    }

    @Test
    fun `pen-line is the mockup's Lucide paths, 2_2 round stroke, no fill`() {
        val icon = AppIcons.EditLine
        assertEquals(24f, icon.viewportWidth)
        assertEquals(24f, icon.viewportHeight)
        val paths = icon.root.iterator().asSequence().map { it as VectorPath }.toList()
        assertEquals(2, paths.size)
        paths.forEach { path ->
            assertEquals(2.2f, path.strokeLineWidth)
            assertEquals(StrokeCap.Round, path.strokeLineCap)
            assertEquals(StrokeJoin.Round, path.strokeLineJoin)
            assertNull(path.fill)
        }
    }
}
