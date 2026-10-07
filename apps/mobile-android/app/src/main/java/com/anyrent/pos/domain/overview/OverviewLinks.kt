package com.anyrent.pos.domain.overview

import androidx.annotation.StringRes
import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.ShopTime
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
     * Title of the `overview-orders/{kind}` list. `new` is the "New orders" card: every order created in the
     * period, rent and sale, later-cancelled included (#434, iOS uses the card label too).
     */
    @StringRes
    fun listTitle(kind: String): Int = when (kind.lowercase()) {
        NEW -> R.string.overview_v2_new_orders
        "pickup" -> R.string.in_progress
        "return" -> R.string.completed
        "cancelled" -> R.string.cancelled
        RENTED -> R.string.overview_v2_rented_out
        LATE -> R.string.overview_v2_late_returns
        else -> R.string.orders
    }

    /**
     * "Trễ hạn": PICKUPED rent orders sorted by return day ascending, cut at the first one not late.
     * Returns the late rows of a page and whether the next page can still hold late rows.
     */
    fun latePage(
        orders: List<OrderSummary>,
        hasMore: Boolean,
        now: Instant = Instant.now(),
        zone: ZoneId = ShopTime.zone,
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
