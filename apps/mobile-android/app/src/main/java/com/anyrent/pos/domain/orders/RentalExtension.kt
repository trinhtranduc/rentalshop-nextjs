package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.availability.RentalCartLine
import com.anyrent.pos.domain.products.CartV2Logic
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/** What Gia hạn sends with `PUT /api/orders/{id}` (#425); null fields are left out */
data class ExtensionUpdate(val returnPlanAt: String, val rentalDuration: Int?, val totalAmount: Double?) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("returnPlanAt", returnPlanAt)
        rentalDuration?.let { put("rentalDuration", it) }
        totalAmount?.let { put("totalAmount", it) }
    }
}

/**
 * "Gia hạn" of a rental (#390): a later return day, checked over the added days only, saved as `returnPlanAt`
 * with the new day count and, when the staff typed extra rent, the new total (#425).
 * Days are shop days ([ShopTime.zone], #602), like the cart ([OrderPlanDays]); the new return day ends at its last second, so a
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

    fun currentReturnDay(returnPlanAt: String?, zone: ZoneId = ShopTime.zone): LocalDate? =
        OrderPlanDays.dayOf(returnPlanAt, zone)

    /** The first day the picker allows */
    fun firstSelectableDay(currentReturn: LocalDate): LocalDate = currentReturn.plusDays(1)

    fun extraDays(currentReturn: LocalDate, newDay: LocalDate): Int =
        ChronoUnit.DAYS.between(currentReturn, newDay).toInt().coerceAtLeast(0)

    /** Days to check: the day after the current return day through the new one; null when nothing is added */
    fun window(currentReturn: LocalDate, newDay: LocalDate): Pair<LocalDate, LocalDate>? =
        if (newDay.isAfter(currentReturn)) currentReturn.plusDays(1) to newDay else null

    /** `returnPlanAt` sent for the new day */
    fun returnPlanAt(newDay: LocalDate, zone: ZoneId = ShopTime.zone): String =
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

    /** Old total plus the extra rent the staff typed (#425); null when there is no extra */
    fun newTotal(oldTotal: Double, extra: Double?): Double? = extra?.takeIf { it > 0 }?.let { oldTotal + it }

    /** Inclusive days from the pickup day to the new return day, as the cart counts them; null without a pickup day */
    fun rentalDuration(pickupPlanAt: String?, newDay: LocalDate, zone: ZoneId = ShopTime.zone): Int? =
        OrderPlanDays.dayOf(pickupPlanAt, zone)?.let { CartV2Logic.rentalDays(it, newDay) }

    fun update(
        pickupPlanAt: String?,
        newDay: LocalDate,
        oldTotal: Double,
        extra: Double?,
        zone: ZoneId = ShopTime.zone,
    ) = ExtensionUpdate(
        returnPlanAt = returnPlanAt(newDay, zone),
        rentalDuration = rentalDuration(pickupPlanAt, newDay, zone),
        totalAmount = newTotal(oldTotal, extra),
    )
}
