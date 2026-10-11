package com.anyrent.pos.ui.orders.v2

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.domain.orders.TodayWorkRow
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Rent list sort of the "Lọc & sắp xếp" sheet (board Loc). `nearestTask` (#389): late tasks first, then the nearest
 * planned hand-over or return, then closed orders.
 */
enum class OrdersSort(val apiField: String) {
    NEAREST_TASK("nearestTask"), CREATED("createdAt"), PICKUP("pickupPlanAt"), RETURN("returnPlanAt")
}

/** Which date the range applies to: created, or the planned hand-over / return day (#389, Vietnam days in the API) */
enum class DateBasis(val apiField: String) { CREATED("createdAt"), PICKUP_PLAN("pickupPlanAt"), RETURN_PLAN("returnPlanAt") }

sealed interface DateRangeChoice {
    data object Any : DateRangeChoice
    data object Today : DateRangeChoice
    data object Next7Days : DateRangeChoice
    data object ThisMonth : DateRangeChoice
    data class Custom(val from: LocalDate, val to: LocalDate) : DateRangeChoice
}

/** Rent list query: the status chips plus the sheet */
data class RentOrdersFilter(
    val status: String? = null,
    val sort: OrdersSort = OrdersSort.CREATED,
    val basis: DateBasis = DateBasis.CREATED,
    val range: DateRangeChoice = DateRangeChoice.Any,
) {
    /** The sheet part (sort and dates) is untouched */
    val isDefault get() = sort == OrdersSort.CREATED && range == DateRangeChoice.Any
}

/** One `GET /api/orders` request of the tab */
data class OrdersQuery(
    val q: String? = null,
    val orderType: String? = null,
    val status: String? = null,
    val sortBy: String = "createdAt",
    val startDate: String? = null,
    val endDate: String? = null,
    val dateField: String? = null,
    val page: Int = 1,
    /** Page size; a quiet refresh asks for every loaded page at once (#674) */
    val limit: Int = OrdersHomeViewModel.PAGE_SIZE,
)

/** Right-hand line under a row total (board Main). A fully paid order has none (#458). */
sealed interface PayLine {
    data class Refund(val amount: Double) : PayLine
    data class Due(val amount: Double) : PayLine
}

/** Row tag in the board colours */
enum class RowTag { HAND_OVER, TAKE_BACK, RESERVED, RENTING, RETURNED, COMPLETED, CANCELLED }

/** Day word of a band: "HÔM NAY", "NGÀY MAI", "HÔM QUA", or the date only */
enum class DayWord { TODAY, TOMORROW, YESTERDAY, NONE }

/** Pure texts and counts of the boards Main, VL-tat-ca, VL-ban, VL-tim, Loc (#401); unit tested */
object OrdersBoardLogic {
    /** "0053" of "ORD-1-0053"; numbers without a dash stay whole */
    fun shortNumber(orderNumber: String): String =
        orderNumber.substringAfterLast('-').ifEmpty { orderNumber }

    /**
     * Refund first (the counter hands money back), then what is still to collect. Null when fully paid: a status
     * change already guarantees the money is in, so no "đã thu đủ" line (#458).
     */
    fun payLine(amountDue: Double, refundDue: Double): PayLine? = when {
        refundDue > 0 -> PayLine.Refund(refundDue)
        amountDue > 0 -> PayLine.Due(amountDue)
        else -> null
    }

    /**
     * Pay line of a "Tất cả đơn" / search row from the list balances (#390). Null when the API sent neither field
     * (older server), the order is cancelled, or nothing is due (#458).
     */
    fun listPayLine(order: OrderSummary): PayLine? {
        if (order.status.equals("CANCELLED", ignoreCase = true)) return null
        if (order.amountDue == null && order.refundDue == null) return null
        return payLine(order.amountDue ?: 0.0, order.refundDue ?: 0.0)
    }

    /** "giao N · trả M" of a band: hand-over count to take-back count */
    fun bandCounts(rows: List<OrdersRow>): Pair<Int, Int> {
        val work = rows.filterIsInstance<OrdersRow.Work>()
        return work.count { it.kind == WorkKind.HAND_OVER } to work.count { it.kind == WorkKind.TAKE_BACK }
    }

    /** Red badge on "Việc cần làm": what is late plus what is due today (not tomorrow) */
    fun badgeCount(sections: List<OrdersSection>): Int =
        sections.filter { it.kind == SectionKind.LATE || it.kind == SectionKind.TODAY }.sumOf { it.rows.size }

    /** Sale day band: orders and money of the day, cancelled orders left out */
    fun saleDaySummary(rows: List<OrdersRow>): Pair<Int, Double> {
        val kept = rows.filterIsInstance<OrdersRow.Order>().filterNot { it.order.status.equals("CANCELLED", ignoreCase = true) }
        return kept.size to kept.sumOf { it.order.totalAmount }
    }

    /**
     * Phone behind the call button of a "Việc cần làm" row; null hides the button.
     * Board Main (#468): no call button on any row, late or not; the customer is called from order detail.
     */
    fun workCallPhone(row: TodayWorkRow, isLate: Boolean): String? = null

    /** #496 the date lines of a list row; [lateDays] > 0 on a rented-out order reads "Hạn trả …" */
    fun rowDates(order: OrderSummary, lateDays: Int): OrderRowDates.Input = OrderRowDates.Input(
        code = shortNumber(order.orderNumber),
        orderType = order.orderType,
        status = order.status,
        createdAt = OrdersHomeLogic.parseInstant(order.createdAt),
        pickupPlanAt = OrdersHomeLogic.parseInstant(order.pickupPlanAt),
        returnPlanAt = OrdersHomeLogic.parseInstant(order.returnPlanAt),
        returnedAt = OrdersHomeLogic.parseInstant(order.returnedAt),
        updatedAt = OrdersHomeLogic.parseInstant(order.updatedAt),
        late = lateDays > 0,
    )

    /**
     * #496 the date lines of a "Việc cần làm" row: a hand-over is a RESERVED rent, a take-back a rented-out one.
     * The operations rows carry no created day, so line 1 is the code alone.
     */
    fun rowDates(work: TodayWorkRow, kind: WorkKind, isLate: Boolean): OrderRowDates.Input = OrderRowDates.Input(
        code = shortNumber(work.orderNumber),
        orderType = "RENT",
        status = if (kind == WorkKind.HAND_OVER) "RESERVED" else "PICKUPED",
        pickupPlanAt = work.pickupPlanAt,
        returnPlanAt = work.returnPlanAt,
        late = isLate || work.lateDays > 0,
    )

    fun statusTag(status: String): RowTag = when (status.uppercase()) {
        "RESERVED" -> RowTag.RESERVED
        "PICKUPED", "PICKED_UP" -> RowTag.RENTING
        "RETURNED" -> RowTag.RETURNED
        "COMPLETED" -> RowTag.COMPLETED
        else -> RowTag.CANCELLED
    }

    /** Day word of a band date relative to [now] in [zone] */
    fun dayWord(day: Instant, now: Instant, zone: ZoneId): DayWord {
        val diff = ChronoUnit.DAYS.between(now.atZone(zone).toLocalDate(), day.atZone(zone).toLocalDate())
        return when (diff) {
            0L -> DayWord.TODAY
            1L -> DayWord.TOMORROW
            -1L -> DayWord.YESTERDAY
            else -> DayWord.NONE
        }
    }

    /** First and last shop civil day of a range choice (#602); sent as `YYYY-MM-DD` keys */
    fun dayBounds(range: DateRangeChoice, now: Instant = Instant.now(), zone: ZoneId = ShopTime.zone): Pair<LocalDate, LocalDate>? {
        val today = now.atZone(zone).toLocalDate()
        return when (range) {
            DateRangeChoice.Any -> null
            DateRangeChoice.Today -> today to today
            DateRangeChoice.Next7Days -> today to today.plusDays(6)
            DateRangeChoice.ThisMonth -> today.withDayOfMonth(1) to today.withDayOfMonth(today.lengthOfMonth())
            is DateRangeChoice.Custom -> minOf(range.from, range.to) to maxOf(range.from, range.to)
        }
    }

    /** The rent list request for a filter */
    fun rentQuery(filter: RentOrdersFilter, page: Int = 1, now: Instant = Instant.now(), zone: ZoneId = ShopTime.zone): OrdersQuery {
        val bounds = dayBounds(filter.range, now, zone)
        return OrdersQuery(
            orderType = "RENT",
            status = filter.status,
            sortBy = filter.sort.apiField,
            startDate = bounds?.first?.toString(),
            endDate = bounds?.second?.toString(),
            dateField = bounds?.let { filter.basis.apiField },
            page = page,
        )
    }
}
