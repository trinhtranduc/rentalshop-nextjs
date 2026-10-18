package com.anyrent.pos.ui.orders

import com.anyrent.pos.ui.orders.v2.EntityOrdersPaging
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * #1066: after "Cũ nhất trước" the product's order list kept the old first row (#0003, 21/10) on top. The
 * LazyColumn rows are keyed by order and LazyListState follows the remembered first row's key into the new list,
 * so the list must be scrolled to row 0 while it is still empty, before the first page of the new sort is shown.
 */
class EntityOrdersPagingTest {
    @Test
    fun `a first page scrolls to the top before its rows are shown`() = runTest {
        val events = mutableListOf<String>()
        EntityOrdersPaging.showFirstPage(
            rows = listOf("#0017", "#0003"),
            scrollToTop = { events += "scrollToTop" },
            show = { events += "show ${it.joinToString()}" },
        )
        assertEquals(listOf("scrollToTop", "show #0017, #0003"), events)
    }

    @Test
    fun `a next page is appended without scrolling`() = runTest {
        val events = mutableListOf<String>()
        EntityOrdersPaging.showNextPage(
            rows = listOf("#0020"),
            show = { events += "show ${it.joinToString()}" },
        )
        assertEquals(listOf("show #0020"), events)
    }
}
