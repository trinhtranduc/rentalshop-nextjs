package com.anyrent.pos.ui.orders.v2

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.formatDayShort
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Rent list sort of the "Lọc & sắp xếp" sheet (board Loc) */
enum class OrdersSort(val apiField: String) { CREATED("createdAt"), PICKUP("pickupPlanAt"), RETURN("returnPlanAt") }

/**
 * Which date the range applies to. The list API filters actual hand-over / return dates (`pickedUpAt`, `returnedAt`);
 * it has no planned-date range.
 */
enum class DateBasis(val apiField: String) { CREATED("createdAt"), PICKED_UP("pickedUpAt"), RETURNED("returnedAt") }

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
)

/** Right-hand line under a row total (board Main) */
sealed interface PayLine {
    data class Refund(val amount: Double) : PayLine
    data class Due(val amount: Double) : PayLine
    data object Paid : PayLine
}

/** Row tag in the board colours */
enum class RowTag { HAND_OVER, TAKE_BACK, RESERVED, RENTING, RETURNED, COMPLETED, CANCELLED }

/** Day word of a band: "HÔM NAY", "NGÀY MAI", "HÔM QUA", or the date only */
enum class DayWord { TODAY, TOMORROW, YESTERDAY, NONE }

/** Templates of the date lines; the defaults are the Vietnamese ones, the screen passes the string resources */
data class OrdersBoardTexts(
    val days: String = "%d ngày",
    val handOverDue: String = "hẹn giao %s",
    val returnDue: String = "hạn trả %s",
    val createdToday: String = "tạo hôm nay",
    val created: String = "tạo %s",
    val due: String = "hạn %s",
    val cancelled: String = "huỷ %s",
    val returns: String = "trả %s",
    val sold: String = "bán %s",
)

/** Pure texts and counts of the boards Main, VL-tat-ca, VL-ban, VL-tim, Loc (#401); unit tested */
object OrdersBoardLogic {
    /** "0053" of "ORD-1-0053"; numbers without a dash stay whole */
    fun shortNumber(orderNumber: String): String =
        orderNumber.substringAfterLast('-').ifEmpty { orderNumber }

    /** Refund first (the counter hands money back), then what is still to collect, else paid in full */
    fun payLine(amountDue: Double, refundDue: Double): PayLine = when {
        refundDue > 0 -> PayLine.Refund(refundDue)
        amountDue > 0 -> PayLine.Due(amountDue)
        else -> PayLine.Paid
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

    fun dayMonth(instant: Instant, zone: ZoneId): String {
        val date = instant.atZone(zone).toLocalDate()
        return "%02d/%02d".format(date.dayOfMonth, date.monthValue)
    }

    /** Civil days from [from] to [to], both counted (a same-day rental is 1 day) */
    fun inclusiveDays(from: Instant, to: Instant, zone: ZoneId): Int =
        (ChronoUnit.DAYS.between(from.atZone(zone).toLocalDate(), to.atZone(zone).toLocalDate()) + 1).toInt().coerceAtLeast(1)

    /** "03/10 → 05/10 · 3 ngày"; just the hand-over day without a return day */
    fun span(from: Instant?, to: Instant?, withDays: Boolean, zone: ZoneId, texts: OrdersBoardTexts = OrdersBoardTexts()): String {
        val start = from?.let { dayMonth(it, zone) } ?: "—"
        if (to == null) return start
        val text = "$start → ${dayMonth(to, zone)}"
        return if (withDays && from != null) "$text · ${texts.days.format(inclusiveDays(from, to, zone))}" else text
    }

    /** Date line of a "Việc cần làm" row: the missed day on TRỄ HẠN, the rental span otherwise */
    fun workWhen(
        row: TodayWorkRow,
        kind: WorkKind,
        isLate: Boolean,
        zone: ZoneId = ZoneId.systemDefault(),
        locale: Locale = Locale.getDefault(),
        texts: OrdersBoardTexts = OrdersBoardTexts(),
    ): String {
        if (!isLate) return span(row.pickupPlanAt, row.returnPlanAt, withDays = true, zone = zone, texts = texts)
        val planned = if (kind == WorkKind.HAND_OVER) row.pickupPlanAt else row.returnPlanAt
        val day = planned?.let { formatDayShort(it, zone, locale) } ?: "—"
        return (if (kind == WorkKind.HAND_OVER) texts.handOverDue else texts.returnDue).format(day)
    }

    private fun isRent(order: OrderSummary) = order.orderType.equals("RENT", ignoreCase = true)

    /** Date line of a "Tất cả đơn" row: "tạo hôm nay · 05/10 → 07/10", "tạo 28/09 · hạn 02/10", "tạo 28/09 · huỷ 29/09" */
    fun listWhen(
        order: OrderSummary,
        lateDays: Int,
        now: Instant = Instant.now(),
        zone: ZoneId = ZoneId.systemDefault(),
        texts: OrdersBoardTexts = OrdersBoardTexts(),
    ): String {
        val createdAt = OrdersHomeLogic.parseInstant(order.createdAt)
        val created = when {
            createdAt == null -> null
            createdAt.atZone(zone).toLocalDate() == now.atZone(zone).toLocalDate() -> texts.createdToday
            else -> texts.created.format(dayMonth(createdAt, zone))
        }
        val status = order.status.uppercase()
        val returnAt = OrdersHomeLogic.parseInstant(order.returnPlanAt)
        val tail = when {
            status == "CANCELLED" -> OrdersHomeLogic.parseInstant(order.updatedAt)?.let { texts.cancelled.format(dayMonth(it, zone)) }
            isRent(order) && status == "PICKUPED" && lateDays > 0 && returnAt != null -> texts.due.format(dayMonth(returnAt, zone))
            isRent(order) -> span(OrdersHomeLogic.parseInstant(order.pickupPlanAt), returnAt, withDays = false, zone = zone, texts = texts)
            else -> null
        }
        return listOfNotNull(created, tail).joinToString(" · ")
    }

    /** Date line of a search result (board VL-tim): "hạn 01/10", "trả T3 06/10", "bán T6 02/10", "27/09 → 28/09" */
    fun searchWhen(
        order: OrderSummary,
        lateDays: Int,
        zone: ZoneId = ZoneId.systemDefault(),
        locale: Locale = Locale.getDefault(),
        texts: OrdersBoardTexts = OrdersBoardTexts(),
    ): String {
        val returnAt = OrdersHomeLogic.parseInstant(order.returnPlanAt)
        if (!isRent(order)) {
            return OrdersHomeLogic.parseInstant(order.createdAt)?.let { texts.sold.format(formatDayShort(it, zone, locale)) }.orEmpty()
        }
        return when (order.status.uppercase()) {
            "CANCELLED" -> OrdersHomeLogic.parseInstant(order.updatedAt)?.let { texts.cancelled.format(dayMonth(it, zone)) }.orEmpty()
            "PICKUPED", "PICKED_UP" ->
                if (lateDays > 0) texts.due.format(returnAt?.let { dayMonth(it, zone) } ?: "—")
                else texts.returns.format(returnAt?.let { formatDayShort(it, zone, locale) } ?: "—")
            else -> span(OrdersHomeLogic.parseInstant(order.pickupPlanAt), returnAt, withDays = false, zone = zone, texts = texts)
        }
    }

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

    /** First and last civil day of a range choice */
    fun dayBounds(range: DateRangeChoice, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): Pair<LocalDate, LocalDate>? {
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
    fun rentQuery(filter: RentOrdersFilter, page: Int = 1, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): OrdersQuery {
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
