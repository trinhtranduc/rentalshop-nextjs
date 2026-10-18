package com.anyrent.pos.ui.orders.v2

/**
 * #1066: how a page of "Đơn theo sản phẩm / khách hàng" reaches the list.
 *
 * A first page (new sort, period or entity) starts the list at its first row, like iOS (`loadOrders(reset:)` empties
 * the table and reloads). The LazyColumn rows are keyed by order and `LazyListState` remembers the key of the first
 * visible row: shown a new list, it follows that key to the row's new place. After "Cũ nhất trước" the old first row
 * (latest pickup, now last) stayed on screen. So the list scrolls to row 0 while it is still empty, then shows the rows.
 */
object EntityOrdersPaging {
    suspend fun <T> showFirstPage(rows: T, scrollToTop: suspend () -> Unit, show: (T) -> Unit) {
        scrollToTop()
        show(rows)
    }

    /** A next page (infinite scroll) is appended where the user is; no scroll */
    fun <T> showNextPage(rows: T, show: (T) -> Unit) {
        show(rows)
    }
}
