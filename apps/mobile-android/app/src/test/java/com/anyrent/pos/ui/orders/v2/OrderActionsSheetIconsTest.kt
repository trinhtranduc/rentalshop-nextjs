package com.anyrent.pos.ui.orders.v2

import com.anyrent.pos.domain.orders.OrderActionSheet.Action
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Test

/** #1438: the icon of each row of the ⋯ sheet, and the one camera of the note editor and the hand-over photo block */
class OrderActionsSheetIconsTest {
    @Test
    fun `every sheet row has its outlined icon`() {
        val expected = mapOf(
            Action.PRINT to "Outlined.Print",
            Action.NOTES to "AutoMirrored.Outlined.Notes",
            Action.HISTORY to "Outlined.History",
            Action.EDIT to "Outlined.Edit",
            Action.EXTEND to "Outlined.Event",
            Action.SHARE to "Outlined.Share",
            Action.CANCEL to "Outlined.Cancel",
            Action.DELETE to "Outlined.Delete",
        )
        assertEquals(Action.entries.toSet(), expected.keys)
        expected.forEach { (action, name) -> assertEquals(action.name, name, orderActionIcon(action).name) }
    }

    @Test
    fun `the hand-over photo block draws the note editor camera`() {
        assertEquals("Outlined.PhotoCamera", AddPhotoIcon.name)
        assertEquals(22.dp, AddPhotoIconSize)
    }
}
