package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** One cell of the 7-day free strip (#388, board SP-chi-tiet) */
data class FreeStripDay(val key: String, val day: String, val free: Int, val isToday: Boolean) {
    enum class Tone { NONE, LOW, OK }

    /** 0 red, 1 orange, 2 or more green */
    val tone: Tone get() = when {
        free <= 0 -> Tone.NONE
        free == 1 -> Tone.LOW
        else -> Tone.OK
    }
}

/** "Sắp tới / Đang thuê / Đã xong"; cancelled orders are in no chip */
enum class ProductOrdersChip(val statuses: List<String>, val sortBy: String, val sortOrder: String) {
    UPCOMING(listOf("RESERVED"), "pickupPlanAt", "asc"),
    RENTING(listOf("PICKUPED"), "returnPlanAt", "asc"),
    DONE(listOf("RETURNED", "COMPLETED"), "createdAt", "desc"),
}

/** Right-hand text of a product order row */
sealed interface ProductOrderRowState {
    data object PickupToday : ProductOrderRowState
    data class PickupOn(val day: String) : ProductOrderRowState
    data class Late(val days: Int) : ProductOrderRowState
    data object ReturnToday : ProductOrderRowState
    data class ReturnOn(val day: String) : ProductOrderRowState
    /** Đã xong: the status badge */
    data object Status : ProductOrderRowState
}

object ProductDetailLogic {
    const val STRIP_LENGTH = 7

    /** #642: the detail shows 6 days, the 7th tile is the calendar icon */
    const val DETAIL_STRIP_DAYS = 6

    /** [count] day keys from [todayKey] */
    fun weekKeys(todayKey: String, count: Int = STRIP_LENGTH): List<String> {
        val start = runCatching { LocalDate.parse(todayKey) }.getOrNull() ?: return emptyList()
        return (0 until count).map { start.plusDays(it.toLong()).toString() }
    }

    /** Cells for the strip; a day missing from the answer counts as 0 free */
    fun strip(todayKey: String, available: Map<String, Int>, count: Int = STRIP_LENGTH): List<FreeStripDay> =
        weekKeys(todayKey, count).map { key ->
            FreeStripDay(key = key, day = key.takeLast(2), free = (available[key] ?: 0).coerceAtLeast(0), isToday = key == todayKey)
        }

    /** Đã xong = RETURNED + COMPLETED, newest first, at most [limit] */
    fun mergeDone(lists: List<List<OrderSummary>>, limit: Int = 20): List<OrderSummary> =
        lists.flatten()
            .distinctBy { it.id }
            .sortedByDescending { it.createdAt?.let { raw -> runCatching { Instant.parse(raw) }.getOrNull() } ?: Instant.EPOCH }
            .take(limit)

    /**
     * #496 left line of a product order row: "#0057 · trả T2 05/10" (no quantity); just "#0057" without a planned
     * return (a sale). Days are Vietnam civil days.
     */
    fun meta(order: OrderSummary, zone: ZoneId = OrderRowDates.shopZone, texts: OrderRowDates.Texts = OrderRowDates.Texts()): String {
        val ret = parse(order.returnPlanAt)?.takeIf { order.orderType.equals("RENT", ignoreCase = true) }
            ?: return "#${order.orderNumber}"
        return "#${order.orderNumber} · ${texts.handOverReturn.format(OrderRowDates.day(ret, zone, texts.weekdays))}"
    }

    fun rowState(
        order: OrderSummary,
        chip: ProductOrdersChip,
        now: Instant = Instant.now(),
        zone: ZoneId = OrderRowDates.shopZone,
        /** #496: the right-hand day reads "T2 05/10" */
        weekdays: List<String> = OrderRowDates.Texts().weekdays,
    ): ProductOrderRowState {
        val today = now.atZone(zone).toLocalDate()
        return when (chip) {
            ProductOrdersChip.UPCOMING -> {
                val pickup = parse(order.pickupPlanAt) ?: return ProductOrderRowState.Status
                // A hand-over past its day (still RESERVED) is late too
                val late = OrdersHomeLogic.lateDays(order.orderType, order.status, pickup, parse(order.returnPlanAt), now, zone)
                when {
                    late > 0 -> ProductOrderRowState.Late(late)
                    pickup.atZone(zone).toLocalDate() == today -> ProductOrderRowState.PickupToday
                    else -> ProductOrderRowState.PickupOn(OrderRowDates.day(pickup, zone, weekdays))
                }
            }
            ProductOrdersChip.RENTING -> {
                val ret = parse(order.returnPlanAt) ?: return ProductOrderRowState.Status
                val late = OrdersHomeLogic.lateDays(order.orderType, order.status, parse(order.pickupPlanAt), ret, now, zone)
                when {
                    late > 0 -> ProductOrderRowState.Late(late)
                    ret.atZone(zone).toLocalDate() == today -> ProductOrderRowState.ReturnToday
                    else -> ProductOrderRowState.ReturnOn(OrderRowDates.day(ret, zone, weekdays))
                }
            }
            ProductOrdersChip.DONE -> ProductOrderRowState.Status
        }
    }

    private fun parse(raw: String?): Instant? = raw?.let { runCatching { Instant.parse(it) }.getOrNull() }
}
