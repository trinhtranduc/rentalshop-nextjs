package com.anyrent.pos.ui.orders.v2

import com.anyrent.pos.domain.orders.OrderActionSheet.Action
import org.junit.Assert.assertEquals
import org.junit.Test

/** #1438: the icon of each row of the ⋯ sheet */
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
}
