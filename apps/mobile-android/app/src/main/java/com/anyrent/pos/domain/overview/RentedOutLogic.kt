package com.anyrent.pos.domain.overview

import com.anyrent.pos.data.model.OrderSummary
import java.time.Instant
import java.time.ZoneId

/**
 * #484 "Đang cho thuê" list (board DT-dang-thue): RENT orders still PICKUPED, the late ones first, each group by
 * planned return ascending. "Late" = the planned return falls on a Vietnam civil day before today (timezone-dates).
 */
object RentedOutLogic {
    /** Day logic runs in shop days, never the device zone */
    val shopZone: ZoneId = ZoneId.of("Asia/Ho_Chi_Minh")

    data class Groups(val late: List<OrderSummary>, val onTime: List<OrderSummary>) {
        val total: Int get() = late.size + onTime.size
    }

    private fun instant(value: String?): Instant? = value?.let { runCatching { Instant.parse(it) }.getOrNull() }

    fun isRentedOut(order: OrderSummary): Boolean =
        order.orderType.equals("RENT", ignoreCase = true) &&
            (order.status.equals("PICKUPED", ignoreCase = true) || order.status.equals("PICKED_UP", ignoreCase = true))

    /** True when the planned return day (in [zone]) is before today; an order without a return plan is never late */
    fun isLate(order: OrderSummary, now: Instant = Instant.now(), zone: ZoneId = shopZone): Boolean {
        val planned = instant(order.returnPlanAt) ?: return false
        return planned.atZone(zone).toLocalDate().isBefore(now.atZone(zone).toLocalDate())
    }

    fun groups(orders: List<OrderSummary>, now: Instant = Instant.now(), zone: ZoneId = shopZone): Groups {
        val sorted = orders.filter(::isRentedOut).distinctBy { it.id }
            .sortedWith(compareBy(nullsLast<Instant>()) { instant(it.returnPlanAt) })
        val (late, onTime) = sorted.partition { isLate(it, now, zone) }
        return Groups(late, onTime)
    }
}
