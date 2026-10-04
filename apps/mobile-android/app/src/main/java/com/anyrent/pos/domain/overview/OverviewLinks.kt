package com.anyrent.pos.domain.overview

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import java.time.Instant
import java.time.ZoneId

/**
 * #388: overview figures open their lists through the `overview-orders/{kind}/{start}/{end}` route.
 * `new` (income orders of the period) existed; `rented` and `late` are "now" lists.
 */
object OverviewLinks {
    const val NEW = "new"
    const val RENTED = "rented"
    const val LATE = "late"

    /**
     * "Trễ hạn": PICKUPED rent orders sorted by return day ascending, cut at the first one not late.
     * Returns the late rows of a page and whether the next page can still hold late rows.
     */
    fun latePage(
        orders: List<OrderSummary>,
        hasMore: Boolean,
        now: Instant = Instant.now(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): Pair<List<OrderSummary>, Boolean> {
        val late = orders.takeWhile { order ->
            OrdersHomeLogic.lateDays(
                order.orderType, order.status,
                order.pickupPlanAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
                order.returnPlanAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
                now, zone,
            ) > 0
        }
        return late to (hasMore && late.size == orders.size)
    }
}
