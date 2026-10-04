package com.anyrent.pos.ui.common

import androidx.compose.ui.graphics.vector.VectorPath
import androidx.compose.ui.unit.dp
import com.anyrent.pos.ui.theme.DS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Board icon sizes are the icon box in dp; outline glyphs keep the boards' 24 viewport and 2px stroke (#396) */
class IconTokensTest {
    @Test
    fun `icon tokens are the board sizes`() {
        assertEquals(18.dp, DS.Icon.Sm)
        assertEquals(20.dp, DS.Icon.Md)
        assertEquals(22.dp, DS.Icon.Lg)
    }

    @Test
    fun `barcode glyph is a 2px round outline on the board viewport`() {
        val icon = AppIcons.Barcode
        assertEquals(24f, icon.viewportWidth)
        assertEquals(24f, icon.viewportHeight)
        val path = icon.root.iterator().next() as VectorPath
        assertEquals(2f, path.strokeLineWidth)
        assertNull(path.fill)
    }
}
