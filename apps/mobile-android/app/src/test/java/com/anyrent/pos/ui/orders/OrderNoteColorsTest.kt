package com.anyrent.pos.ui.orders

import androidx.compose.ui.graphics.Color
import com.anyrent.pos.ui.orders.v2.ItemNoteFill
import com.anyrent.pos.ui.orders.v2.ItemNoteInk
import com.anyrent.pos.ui.orders.v2.NotesFill
import com.anyrent.pos.ui.orders.v2.NotesInk
import com.anyrent.pos.ui.orders.v2.SectionDividerColor
import org.junit.Assert.assertEquals
import org.junit.Test

/** #1430 the warm note colours of the order detail; the band stays */
class OrderNoteColorsTest {
    @Test
    fun warmNoteColoursAndTheBandStays() {
        assertEquals(Color(0xFFFFF7E6), ItemNoteFill)
        assertEquals(Color(0xFF7A4A00), ItemNoteInk)
        assertEquals(Color(0xFFFFFBEB), NotesFill)
        assertEquals(Color(0xFF78350F), NotesInk)
        assertEquals(Color(0xFFEEF0F4), SectionDividerColor)
    }
}
