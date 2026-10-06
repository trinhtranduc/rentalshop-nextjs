package com.anyrent.pos.domain.overview

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.OrderRowDates
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * #496 "Chưa lấy đồ" (board DT-chua-lay): RENT orders still RESERVED, by planned pickup ascending, split at the start
 * of today's Vietnam civil day. Overdue = the pickup day is before today; an order without a pickup day is not overdue.
 */
object NotPickedUpLogic {
    data class Groups(val overdue: List<OrderSummary>, val upcoming: List<OrderSummary>) {
        val total: Int get() = overdue.size + upcoming.size
    }

    private fun instant(value: String?): Instant? = value?.let { runCatching { Instant.parse(it) }.getOrNull() }

    fun isNotPickedUp(order: OrderSummary): Boolean =
        order.orderType.equals("RENT", ignoreCase = true) && order.status.equals("RESERVED", ignoreCase = true)

    /** Civil days from the pickup day to today in [zone]; 0 when not overdue or without a pickup day */
    fun overdueDays(order: OrderSummary, now: Instant = Instant.now(), zone: ZoneId = OrderRowDates.shopZone): Int {
        val pickup = instant(order.pickupPlanAt) ?: return 0
        return ChronoUnit.DAYS.between(pickup.atZone(zone).toLocalDate(), now.atZone(zone).toLocalDate()).toInt().coerceAtLeast(0)
    }

    fun groups(orders: List<OrderSummary>, now: Instant = Instant.now(), zone: ZoneId = OrderRowDates.shopZone): Groups {
        val sorted = orders.filter(::isNotPickedUp).distinctBy { it.id }
            .sortedWith(compareBy(nullsLast<Instant>()) { instant(it.pickupPlanAt) })
        val (overdue, upcoming) = sorted.partition { overdueDays(it, now, zone) > 0 }
        return Groups(overdue, upcoming)
    }
}
