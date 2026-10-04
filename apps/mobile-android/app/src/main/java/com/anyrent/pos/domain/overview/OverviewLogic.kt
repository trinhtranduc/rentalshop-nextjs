package com.anyrent.pos.domain.overview

import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

enum class OverviewPreset { TODAY, YESTERDAY, LAST_7, LAST_30, THIS_MONTH, LAST_MONTH }

/** Inclusive range of `yyyy-MM-dd` days */
data class DayRange(val start: LocalDate, val end: LocalDate) {
    val dayCount: Int get() = ChronoUnit.DAYS.between(start, end).toInt() + 1
}

sealed interface OverviewPeriod {
    data class Preset(val preset: OverviewPreset) : OverviewPeriod
    data class Custom(val range: DayRange) : OverviewPeriod
}

data class OverviewBar(val key: String, val label: String, val value: Double)

/** `data` of `GET /api/analytics/period`, only what the overview shows */
data class OverviewReport(
    val netRevenue: Double,
    val revenueGrowth: Double?,
    val newOrders: Int?,
    val series: List<Point>,
    val topProducts: List<TopProduct>,
) {
    /** [dayKey] `yyyy-MM-dd` for daily points; [monthLabel] "10/26" for monthly ones */
    data class Point(val dayKey: String?, val monthLabel: String?, val realIncome: Double)
    data class TopProduct(val id: Int?, val name: String, val rentalCount: Int, val totalRevenue: Double, val image: String?)
}

/** "Now" figures of `GET /api/analytics/outlet-operations`; [rentedOut] and [collateralHeld] need the revenue right */
data class OverviewNow(val lateReturns: Int, val rentedOut: Int?, val collateralHeld: Double?)

object OverviewLogic {
    /** Ranges longer than this are charted per month (same rule as the API) */
    const val MAX_DAILY_BARS = 45

    fun range(preset: OverviewPreset, today: LocalDate): DayRange = when (preset) {
        OverviewPreset.TODAY -> DayRange(today, today)
        OverviewPreset.YESTERDAY -> today.minusDays(1).let { DayRange(it, it) }
        OverviewPreset.LAST_7 -> DayRange(today.minusDays(6), today)
        OverviewPreset.LAST_30 -> DayRange(today.minusDays(29), today)
        OverviewPreset.THIS_MONTH -> DayRange(today.withDayOfMonth(1), today)
        OverviewPreset.LAST_MONTH -> YearMonth.from(today).minusMonths(1).let { DayRange(it.atDay(1), it.atEndOfMonth()) }
    }

    fun range(period: OverviewPeriod, today: LocalDate): DayRange = when (period) {
        is OverviewPeriod.Preset -> range(period.preset, today)
        is OverviewPeriod.Custom -> period.range
    }

    /** Same number of days right before the start */
    fun previous(range: DayRange): DayRange {
        val end = range.start.minusDays(1)
        return DayRange(end.minusDays((range.dayCount - 1).toLong()), end)
    }

    fun groupBy(range: DayRange): String = if (range.dayCount <= MAX_DAILY_BARS) "day" else "month"

    fun dayMonth(date: LocalDate): String = "%02d/%02d".format(date.dayOfMonth, date.monthValue)

    /** "27/09 – 03/10", or one day "03/10" */
    fun shortRange(range: DayRange): String =
        if (range.start == range.end) dayMonth(range.start) else "${dayMonth(range.start)} – ${dayMonth(range.end)}"

    /** One bar per day (missing days are 0), or per month as the API sends them; [weekday] labels short ranges */
    fun bars(report: OverviewReport, range: DayRange, weekday: (LocalDate) -> String): List<OverviewBar> {
        if (groupBy(range) == "month") {
            return report.series.map { OverviewBar(it.monthLabel.orEmpty(), it.monthLabel.orEmpty(), it.realIncome) }
        }
        val byKey = report.series.filter { it.dayKey != null }.groupBy { it.dayKey!! }
            .mapValues { (_, points) -> points.sumOf { it.realIncome } }
        return (0 until range.dayCount).map { offset ->
            val date = range.start.plusDays(offset.toLong())
            val key = date.toString()
            OverviewBar(key, if (range.dayCount <= 7) weekday(date) else dayMonth(date), byKey[key] ?: 0.0)
        }
    }

    /** Heights from 0 to 1 against the highest bar; a loss draws as 0 */
    fun barRatios(bars: List<OverviewBar>): List<Double> {
        val top = bars.maxOfOrNull { it.value.coerceAtLeast(0.0) } ?: 0.0
        if (top <= 0) return bars.map { 0.0 }
        return bars.map { it.value.coerceAtLeast(0.0) / top }
    }

    /** "▲ 8%" / "▼ 12,5%" / "0%" */
    fun changeText(growth: Double): String {
        val rounded = (growth * 10).roundToLong() / 10.0
        val magnitude = abs(rounded)
        val number = if (magnitude == Math.floor(magnitude)) magnitude.toLong().toString()
        else "%.1f".format(java.util.Locale.US, magnitude).replace('.', ',')
        return when {
            rounded > 0 -> "▲ $number%"
            rounded < 0 -> "▼ $number%"
            else -> "0%"
        }
    }

    /** `GET /api/analytics/period` needs `analytics.view.revenue`: not OUTLET_STAFF */
    fun showsRevenue(role: String?): Boolean = role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN")

    /** `GET /api/analytics/outlet-operations` needs `analytics.view.dashboard`: every shop role */
    fun showsOperations(role: String?): Boolean = role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF")

    fun reportFromJson(data: JSONObject): OverviewReport {
        fun number(o: JSONObject?, key: String): Double? =
            if (o == null || !o.has(key) || o.isNull(key)) null else o.optDouble(key).takeIf { !it.isNaN() }
        val revenue = data.optJSONObject("revenue")
        val growth = data.optJSONObject("growth")?.optJSONObject("revenue")
        val counts = data.optJSONObject("operational")?.optJSONObject("orderCounts")
        val series = data.optJSONArray("series")
        val top = data.optJSONArray("topProducts")
        return OverviewReport(
            netRevenue = number(revenue, "totalActualRevenue") ?: number(revenue, "totalRevenue") ?: 0.0,
            revenueGrowth = number(growth, "growth"),
            newOrders = if (counts != null && counts.has("new") && !counts.isNull("new")) counts.optInt("new") else null,
            series = (0 until (series?.length() ?: 0)).mapNotNull { i ->
                val p = series?.optJSONObject(i) ?: return@mapNotNull null
                val date = if (p.isNull("date")) null else p.optString("date").takeIf { it.isNotBlank() }
                val monthly = p.has("monthNumber") && !p.isNull("monthNumber")
                OverviewReport.Point(
                    dayKey = date?.take(10)?.replace('/', '-'),
                    monthLabel = if (monthly || date == null) p.optString("month").takeIf { it.isNotBlank() } else null,
                    realIncome = number(p, "realIncome") ?: 0.0,
                )
            },
            topProducts = (0 until (top?.length() ?: 0)).mapNotNull { i ->
                val p = top?.optJSONObject(i) ?: return@mapNotNull null
                OverviewReport.TopProduct(
                    id = if (p.has("id") && !p.isNull("id")) p.optInt("id") else null,
                    name = if (p.isNull("name")) "" else p.optString("name"),
                    rentalCount = p.optInt("rentalCount", 0),
                    totalRevenue = number(p, "totalRevenue") ?: 0.0,
                    image = if (p.isNull("image")) null else p.optString("image").takeIf { it.isNotBlank() },
                )
            },
        )
    }

    fun nowFromJson(data: JSONObject): OverviewNow {
        val held = data.optJSONObject("cash")?.optJSONObject("depositsHeld")
        return OverviewNow(
            lateReturns = data.optJSONObject("overdueReturns")?.optInt("count", 0) ?: 0,
            rentedOut = held?.takeIf { it.has("orders") && !it.isNull("orders") }?.optInt("orders"),
            collateralHeld = held?.takeIf { it.has("securityDeposit") && !it.isNull("securityDeposit") }
                ?.optDouble("securityDeposit")?.takeIf { !it.isNaN() },
        )
    }
}
