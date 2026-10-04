package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.domain.availability.RentalCartLine
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * "Gia hạn" of a rental (#390): a later return day, checked over the added days only, saved as `returnPlanAt`.
 * Days are device-zone days, like the cart ([OrderPlanDays]); the new return day ends at its last second, so a
 * one-day extension still occupies that day.
 */
object RentalExtension {
    fun canExtend(orderType: String, status: String, canUpdateOrders: Boolean): Boolean {
        if (!canUpdateOrders || !orderType.equals("RENT", ignoreCase = true)) return false
        return when (status.uppercase()) {
            "RESERVED", "PICKUPED", "PICKED_UP" -> true
            else -> false
        }
    }

    fun currentReturnDay(returnPlanAt: String?, zone: ZoneId = ZoneId.systemDefault()): LocalDate? =
        OrderPlanDays.dayOf(returnPlanAt, zone)

    /** The first day the picker allows */
    fun firstSelectableDay(currentReturn: LocalDate): LocalDate = currentReturn.plusDays(1)

    fun extraDays(currentReturn: LocalDate, newDay: LocalDate): Int =
        ChronoUnit.DAYS.between(currentReturn, newDay).toInt().coerceAtLeast(0)

    /** Days to check: the day after the current return day through the new one; null when nothing is added */
    fun window(currentReturn: LocalDate, newDay: LocalDate): Pair<LocalDate, LocalDate>? =
        if (newDay.isAfter(currentReturn)) currentReturn.plusDays(1) to newDay else null

    /** `returnPlanAt` sent for the new day */
    fun returnPlanAt(newDay: LocalDate, zone: ZoneId = ZoneId.systemDefault()): String =
        OrderPlanDays.returnInstant(newDay, zone)

    /** One availability line per product, quantities summed */
    fun lines(items: List<OrderItem>): List<RentalCartLine> =
        items.groupBy { it.productId }.map { (productId, group) ->
            RentalCartLine(
                productId = productId,
                productName = group.firstNotNullOfOrNull { it.productName?.takeIf(String::isNotBlank) } ?: "#$productId",
                quantity = group.sumOf { it.quantity },
            )
        }
}
