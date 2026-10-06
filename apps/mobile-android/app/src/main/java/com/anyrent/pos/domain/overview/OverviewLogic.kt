package com.anyrent.pos.domain.overview

import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

/** #484: what the bar chart plots: money collected, or orders created (`series[].newOrderCount`) */
enum class OverviewChart { MONEY, ORDERS }

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
    /** #484: orders created in the period, not cancelled; null on an older API (tile hidden) */
    val totalOrderValue: Double? = null,
    /** #484: the part of those orders not collected yet; null on an older API (tile hidden) */
    val outstanding: Double? = null,
    /** #492: what makes up [netRevenue]; null on an older API (cọc tile hidden, sheet shows only the total) */
    val collectedBreakdown: CollectedBreakdown? = null,
    /** #492: `growth.orderValue`, the hero's change vs the previous period; null on an older API (hero falls back) */
    val orderValueGrowth: OverviewGrowth? = null,
    /** #494 `revenue.collateralFlow`; null on an older API (the "Thực thu" sheet keeps the #492 layout) */
    val collateralFlow: CollateralFlow? = null,
    /** #494 `revenue.outstandingBreakdown`; null on an older API ("Còn phải thu" tile not clickable) */
    val outstandingBreakdown: OutstandingBreakdown? = null,
) {
    /**
     * [dayKey] `yyyy-MM-dd` for daily points; [monthLabel] "10/26" for monthly ones.
     * [newOrderCount] (#484) is null on an older API.
     */
    data class Point(val dayKey: String?, val monthLabel: String?, val realIncome: Double, val newOrderCount: Int? = null)
    data class TopProduct(val id: Int?, val name: String, val rentalCount: Int, val totalRevenue: Double, val image: String?)
}

/**
 * #492 `revenue.collectedBreakdown`: [deposits] + [pickupAndSale] + [fees] - [refunds] = `revenue.collected`.
 * [refunds] is a positive amount that is subtracted.
 */
data class CollectedBreakdown(val deposits: Double, val pickupAndSale: Double, val fees: Double, val refunds: Double) {
    val total: Double get() = deposits + pickupAndSale + fees - refunds
}

/**
 * #494 `revenue.collateralFlow`: collateral (thế chân) [received] at pickup and [returned] to customers in the period.
 * Not part of `revenue.collected`.
 */
data class CollateralFlow(val received: Double, val returned: Double) {
    /** Signed change of the collateral held over the period */
    val net: Double get() = received - returned

    /** All money the shop took in over the period, collateral included */
    fun totalReceived(collected: Double): Double = collected + net
}

/** #494 an amount over [orders] orders */
data class AmountOrders(val amount: Double, val orders: Int)

/** #494 `revenue.outstandingBreakdown`: [atPickup] + [overduePickup] = `revenue.outstanding` */
data class OutstandingBreakdown(val atPickup: AmountOrders, val overduePickup: AmountOrders)

/** #494 collateral of [orders] orders; [orders] is null when an older API only sends `depositsHeld.securityDeposit` */
data class CollateralCount(val amount: Double, val orders: Int?)

/** #492 one `growth.*` entry of `GET /api/analytics/period`; [growth] is a percentage (8.0 = 8%) */
data class OverviewGrowth(val current: Double?, val previous: Double?, val growth: Double?)

/** "Now" figures of `GET /api/analytics/outlet-operations`; [rentedOut] and the collateral figures need the revenue right */
data class OverviewNow(
    val lateReturns: Int,
    val rentedOut: Int?,
    val collateralHeld: Double?,
    /** #494 `cash.collateralToCollect`: reserved rent orders' collateral, received at pickup; null on an older API */
    val collateralToCollect: CollateralCount? = null,
    /** #494 `cash.collateralToReturn`, or `depositsHeld.securityDeposit` without a count on an older API */
    val collateralToReturn: CollateralCount? = null,
)

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

    /** The value of one point for [chart]; a missing `newOrderCount` (older API) is 0 */
    fun pointValue(point: OverviewReport.Point, chart: OverviewChart): Double = when (chart) {
        OverviewChart.MONEY -> point.realIncome
        OverviewChart.ORDERS -> (point.newOrderCount ?: 0).toDouble()
    }

    /**
     * One bar per day (missing days are 0), or per month as the API sends them; [weekday] labels short ranges.
     * [chart] picks money collected (default) or orders created (#484).
     */
    fun bars(
        report: OverviewReport,
        range: DayRange,
        chart: OverviewChart = OverviewChart.MONEY,
        weekday: (LocalDate) -> String,
    ): List<OverviewBar> {
        if (groupBy(range) == "month") {
            return report.series.map { OverviewBar(it.monthLabel.orEmpty(), it.monthLabel.orEmpty(), pointValue(it, chart)) }
        }
        val byKey = report.series.filter { it.dayKey != null }.groupBy { it.dayKey!! }
            .mapValues { (_, points) -> points.sumOf { pointValue(it, chart) } }
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
        // `collected` leaves collateral out (#484); an older API only sends `revenue`
        val growth = data.optJSONObject("growth")?.let { it.optJSONObject("collected") ?: it.optJSONObject("revenue") }
        val counts = data.optJSONObject("operational")?.optJSONObject("orderCounts")
        val series = data.optJSONArray("series")
        val top = data.optJSONArray("topProducts")
        return OverviewReport(
            netRevenue = number(revenue, "collected") ?: number(revenue, "totalActualRevenue") ?: number(revenue, "totalRevenue") ?: 0.0,
            revenueGrowth = number(growth, "growth"),
            newOrders = if (counts != null && counts.has("new") && !counts.isNull("new")) counts.optInt("new") else null,
            series = (0 until (series?.length() ?: 0)).mapNotNull { i ->
                val p = series?.optJSONObject(i) ?: return@mapNotNull null
                val date = if (p.isNull("date")) null else p.optString("date").takeIf { it.isNotBlank() }
                val monthly = p.has("monthNumber") && !p.isNull("monthNumber")
                OverviewReport.Point(
                    dayKey = date?.take(10)?.replace('/', '-'),
                    monthLabel = if (monthly || date == null) p.optString("month").takeIf { it.isNotBlank() } else null,
                    realIncome = number(p, "collected") ?: number(p, "realIncome") ?: 0.0,
                    newOrderCount = number(p, "newOrderCount")?.toInt(),
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
            totalOrderValue = number(revenue, "totalOrderValue"),
            outstanding = number(revenue, "outstanding"),
            orderValueGrowth = data.optJSONObject("growth")?.optJSONObject("orderValue")?.let { g ->
                OverviewGrowth(current = number(g, "current"), previous = number(g, "previous"), growth = number(g, "growth"))
            },
            collectedBreakdown = revenue?.optJSONObject("collectedBreakdown")?.let { b ->
                CollectedBreakdown(
                    deposits = number(b, "deposits") ?: 0.0,
                    pickupAndSale = number(b, "pickupAndSale") ?: 0.0,
                    fees = number(b, "fees") ?: 0.0,
                    refunds = number(b, "refunds") ?: 0.0,
                )
            },
            collateralFlow = revenue?.optJSONObject("collateralFlow")?.let { f ->
                CollateralFlow(received = number(f, "received") ?: 0.0, returned = number(f, "returned") ?: 0.0)
            },
            outstandingBreakdown = revenue?.optJSONObject("outstandingBreakdown")?.let { b ->
                fun part(key: String): AmountOrders = b.optJSONObject(key).let { p ->
                    AmountOrders(amount = number(p, "amount") ?: 0.0, orders = number(p, "orders")?.toInt() ?: 0)
                }
                OutstandingBreakdown(atPickup = part("atPickup"), overduePickup = part("overduePickup"))
            },
        )
    }

    fun nowFromJson(data: JSONObject): OverviewNow {
        val cash = data.optJSONObject("cash")
        val held = cash?.optJSONObject("depositsHeld")
        val collateralHeld = held?.takeIf { it.has("securityDeposit") && !it.isNull("securityDeposit") }
            ?.optDouble("securityDeposit")?.takeIf { !it.isNaN() }
        // #494: `{ securityDeposit, orders }`; an entry without an amount counts as missing
        fun collateral(key: String): CollateralCount? = cash?.optJSONObject(key)?.let { c ->
            val amount = if (!c.has("securityDeposit") || c.isNull("securityDeposit")) null
            else c.optDouble("securityDeposit").takeIf { !it.isNaN() }
            amount?.let { CollateralCount(it, if (c.has("orders") && !c.isNull("orders")) c.optInt("orders") else null) }
        }
        return OverviewNow(
            lateReturns = data.optJSONObject("overdueReturns")?.optInt("count", 0) ?: 0,
            rentedOut = held?.takeIf { it.has("orders") && !it.isNull("orders") }?.optInt("orders"),
            collateralHeld = collateralHeld,
            collateralToCollect = collateral("collateralToCollect"),
            collateralToReturn = collateral("collateralToReturn") ?: collateralHeld?.let { CollateralCount(it, null) },
        )
    }
}
