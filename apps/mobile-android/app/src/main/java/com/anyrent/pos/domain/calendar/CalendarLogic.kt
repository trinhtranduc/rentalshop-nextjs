package com.anyrent.pos.domain.calendar

import org.json.JSONObject
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit

/** Hand-overs (RESERVED by pickup plan) and returns (PICKUPED by return plan) of one day (#374) */
data class CalendarDayCount(val pickups: Int, val returns: Int)

/** `data` of `GET /api/calendar/orders/count?month&year&timeZone` */
data class CalendarMonthCounts(val byDate: Map<String, CalendarDayCount>, val lateReturns: Int)

/** One order of `GET /api/calendar/orders/by-date` */
data class CalendarDayOrder(
    val id: Int,
    val orderNumber: String,
    val customerName: String?,
    val status: String?,
    val orderType: String?,
    val totalAmount: Double,
    val itemsSummary: String,
)

data class CalendarDayMarks(val handOver: Boolean = false, val returning: Boolean = false, val lateReturn: Boolean = false) {
    companion object {
        val NONE = CalendarDayMarks()
    }
}

data class CalendarCell(val key: String, val day: Int, val inMonth: Boolean, val isToday: Boolean)

enum class CalendarRowKind { HAND_OVER, TAKE_BACK }

data class CalendarDayRow(val kind: CalendarRowKind, val order: CalendarDayOrder, val lateDays: Int)

/** Pure logic of the redesigned calendar; days are `yyyy-MM-dd` keys in the device time zone */
object CalendarLogic {
    /** Month grid, weeks starting on Monday, whole weeks only */
    fun monthGrid(month: YearMonth, todayKey: String): List<CalendarCell> {
        val first = month.atDay(1)
        val leading = (first.dayOfWeek.value - DayOfWeek.MONDAY.value + 7) % 7
        val total = ((leading + month.lengthOfMonth() + 6) / 7) * 7
        return (0 until total).map { index ->
            val date = first.plusDays((index - leading).toLong())
            val key = date.toString()
            CalendarCell(key, date.dayOfMonth, YearMonth.from(date) == month, key == todayKey)
        }
    }

    /** Dot for hand-overs; ring for returns due today or later; red square for returns due before today
     * (still out, so late) */
    fun marks(key: String, counts: CalendarMonthCounts?, todayKey: String): CalendarDayMarks {
        val day = counts?.byDate?.get(key) ?: return CalendarDayMarks.NONE
        val isPast = key < todayKey
        return CalendarDayMarks(
            handOver = day.pickups > 0,
            returning = day.returns > 0 && !isPast,
            lateReturn = day.returns > 0 && isPast,
        )
    }

    fun lateDays(dayKey: String, todayKey: String): Int =
        ChronoUnit.DAYS.between(LocalDate.parse(dayKey), LocalDate.parse(todayKey)).toInt().coerceAtLeast(0)

    /** Hand-overs first, then returns, in the API order */
    fun rows(dayKey: String, todayKey: String, pickups: List<CalendarDayOrder>, returns: List<CalendarDayOrder>): List<CalendarDayRow> {
        val late = lateDays(dayKey, todayKey)
        return pickups.map { CalendarDayRow(CalendarRowKind.HAND_OVER, it, late) } +
            returns.map { CalendarDayRow(CalendarRowKind.TAKE_BACK, it, late) }
    }

    /** Day selected when a month opens: today in its own month, else the first day */
    fun defaultSelection(month: YearMonth, todayKey: String): String =
        if (YearMonth.from(LocalDate.parse(todayKey)) == month) todayKey else month.atDay(1).toString()

    fun countsFromJson(data: JSONObject): CalendarMonthCounts {
        val raw = data.optJSONObject("byDate")
        val byDate = buildMap {
            raw?.keys()?.forEach { key ->
                val day = raw.optJSONObject(key) ?: return@forEach
                put(key, CalendarDayCount(day.optInt("pickups", 0), day.optInt("returns", 0)))
            }
        }
        return CalendarMonthCounts(byDate, data.optInt("lateReturns", 0))
    }

    fun dayOrdersFromJson(data: JSONObject): List<CalendarDayOrder> {
        val orders = data.optJSONArray("orders") ?: return emptyList()
        return (0 until orders.length()).mapNotNull { index ->
            val o = orders.optJSONObject(index) ?: return@mapNotNull null
            if (!o.has("id") || o.isNull("id")) return@mapNotNull null
            fun text(key: String): String? = if (o.isNull(key)) null else o.optString(key).takeIf { it.isNotBlank() }
            val items = o.optJSONArray("orderItems")
            val summary = (0 until (items?.length() ?: 0)).mapNotNull { i ->
                val item = items?.optJSONObject(i) ?: return@mapNotNull null
                val name = if (item.isNull("productName")) "" else item.optString("productName")
                if (name.isBlank()) return@mapNotNull null
                val quantity = item.optInt("quantity", 1)
                if (quantity > 1) "$name ×$quantity" else name
            }.joinToString(", ")
            CalendarDayOrder(
                id = o.optInt("id"),
                orderNumber = text("orderNumber").orEmpty(),
                customerName = text("customerName"),
                status = text("status"),
                orderType = text("orderType"),
                totalAmount = o.optDouble("totalAmount").let { if (it.isNaN()) 0.0 else it },
                itemsSummary = summary,
            )
        }
    }
}
