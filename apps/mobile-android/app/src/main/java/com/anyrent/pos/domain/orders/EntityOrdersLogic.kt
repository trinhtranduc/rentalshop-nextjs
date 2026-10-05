package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary

/**
 * #482 — header figures of "Đơn theo sản phẩm" / "Đơn theo khách hàng" (boards DT-don-theo-sp, DT-don-theo-kh), from
 * what the list endpoints return (iOS `EntityOrdersLogic`). Cancelled orders never count as rentals or money.
 */
object EntityOrdersLogic {
    private fun cancelled(order: OrderSummary) = order.status.equals("CANCELLED", ignoreCase = true)

    /** Non-cancelled rent orders among the loaded ones ("Lượt thuê") */
    fun rentals(orders: List<OrderSummary>): Int =
        orders.count { it.orderType.equals("RENT", ignoreCase = true) && !cancelled(it) }

    /** The product's line totals in the loaded non-cancelled orders; the order total when a row has no items */
    fun productRevenue(orders: List<OrderSummary>, productId: Int): Double =
        orders.filterNot(::cancelled).sumOf { order ->
            if (order.productTotals.isEmpty()) order.totalAmount else order.productTotals[productId] ?: 0.0
        }

    /** Money of the loaded non-cancelled orders (customer "Đã chi" when the API sent no summary) */
    fun spent(orders: List<OrderSummary>): Double = orders.filterNot(::cancelled).sumOf { it.totalAmount }

    /** "2,1tr" from a million up (board), the full amount below ([full]) */
    fun compactMoney(
        amount: Double,
        full: (Double) -> String,
        million: String = "%d,%dtr",
        millionWhole: String = "%dtr",
    ): String {
        if (amount < 1_000_000) return full(amount)
        val tenths = Math.round(amount / 100_000).toInt()
        val whole = tenths / 10
        val tenth = tenths % 10
        return if (tenth == 0) millionWhole.format(whole) else million.format(whole, tenth)
    }

    /** Values of Số đơn (all matching orders), Lượt thuê and Doanh thu (loaded pages: "+" while more pages exist) */
    fun productValues(
        orders: List<OrderSummary>,
        productId: Int,
        total: Int,
        hasMore: Boolean,
        hidesMoney: Boolean,
        money: (Double) -> String,
    ): List<String> {
        val more = if (hasMore) "+" else ""
        return listOf(
            total.toString(),
            rentals(orders).toString() + more,
            if (hidesMoney) "—" else money(productRevenue(orders, productId)) + more,
        )
    }

    /** Values of Số đơn and Đã chi (API summary), Đang thuê (orders out now); "—" while unknown */
    fun customerValues(total: Int, spent: Double?, renting: Int?, hidesMoney: Boolean, money: (Double) -> String): List<String> =
        listOf(
            total.toString(),
            if (hidesMoney || spent == null) "—" else money(spent),
            renting?.toString() ?: "—",
        )

    /** "VS-004 · Còn 1 hôm nay"; the free part only when something is free */
    fun productSubtitle(code: String?, freeToday: Int?, freeText: (Int) -> String): String =
        listOfNotNull(code, freeToday?.takeIf { it > 0 }?.let(freeText)).joinToString(" · ")
}
