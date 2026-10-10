package com.anyrent.pos.domain.overview

import com.anyrent.pos.domain.ShopTime
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
    /** #633 top spenders of the period; empty when the API leaves them out */
    val topCustomers: List<TopCustomer> = emptyList(),
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
    /**
     * #719: the orders behind [totalOrderValue]: rent + sale of `revenue.orderValueByType` (cancelled left out, unlike
     * [newOrders]); null on an API without the split (no count shown)
     */
    val orderValueOrders: Int? = null,
    /** #722 `revenue.cashCollected` (#710): money held from the period, collateral included; null on an older API */
    val cashCollected: Double? = null,
    /** #725 (iOS #616) `revenue.orderValueByType`: rent / sale split of [totalOrderValue]; null on an older API */
    val orderValueByType: OrderValueByType? = null,
) {
    /** "Thực thu" as iOS and web show it: money held, collateral included; an older API falls back */
    val heldCash: Double get() = cashCollected ?: collateralFlow?.totalReceived(netRevenue) ?: netRevenue

    /**
     * [dayKey] `yyyy-MM-dd` for daily points; [monthLabel] "10/26" for monthly ones.
     * [newOrderCount] (#484) is null on an older API.
     */
    data class Point(
        val dayKey: String?,
        val monthLabel: String?,
        val realIncome: Double,
        val newOrderCount: Int? = null,
        /** #725 (iOS #616) `expectedCollected`: money still expected that day; null on an older API */
        val expectedCollected: Double? = null,
    )
    data class TopProduct(val id: Int?, val name: String, val rentalCount: Int, val totalRevenue: Double, val image: String?)

    /** #633 one of `topCustomers`; [totalSpent] null (hidden) counts as 0 */
    data class TopCustomer(val id: Int?, val name: String, val orderCount: Int, val totalSpent: Double?)
}

/** #633 which ranking: Top sản phẩm or Top khách hàng; [key] is the route segment */
enum class OverviewTopKind(val key: String) {
    PRODUCTS("products"),
    CUSTOMERS("customers"),
    ;

    companion object {
        fun from(key: String?): OverviewTopKind = entries.firstOrNull { it.key == key } ?: PRODUCTS
    }
}

/**
 * #633 one row of a top list: [count] is rentals of a product, orders of a customer; [ratio] is the bar width against
 * the first (largest) row, 0…1. A null [id] does not open anything.
 */
data class OverviewTopRow(val id: Int?, val name: String, val amount: Double, val count: Int, val ratio: Double, val image: String? = null)

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

/** #725 `revenue.orderValueByType`: the new orders' value split into rentals and sales (cancelled left out) */
data class OrderValueByType(val rent: AmountOrders, val sale: AmountOrders)

/** #725 (iOS #616) `tomorrow` of outlet-operations: tomorrow's hand-overs and returns */
data class Tomorrow(val pickups: Int, val returns: Int)

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
    /** #496 hand-overs of today: `pickupsToday.count` left, `doneToday.pickups` done; null when missing */
    val pickupsToday: TodayTask? = null,
    /** #496 returns of today: `returnsToday.count` left, `doneToday.returns` done; null when missing */
    val returnsToday: TodayTask? = null,
    /** #496 `noShows.count`: rent orders still RESERVED past their pickup day; null when missing */
    val noShows: Int? = null,
    /** #725 `tomorrow`; null when the API leaves it out */
    val tomorrow: Tomorrow? = null,
)

/** #496 one row of "VIỆC HÔM NAY": [remaining] still to do, [done] already done today */
data class TodayTask(val remaining: Int, val done: Int) {
    val total: Int get() = remaining + done
}

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

    /** Rows of a top list on the overview (#633, iOS `OverviewDashLogic.topLimit`) */
    const val TOP_LIMIT = 5

    /** Rows of "Xem tất cả" (#633): the API cap, same as web `TOP_ALL_LIMIT` */
    const val TOP_ALL_LIMIT = 50

    /**
     * Report of a range of shop days; `timeZone` is the shop zone (#602, iOS `overviewReportParameters`).
     * [limit] sizes `topProducts` / `topCustomers` (#633).
     */
    fun periodPath(range: DayRange, limit: Int = TOP_LIMIT): String =
        "/api/analytics/period?startDate=${range.start}&endDate=${range.end}" +
            "&groupBy=${groupBy(range)}&limit=$limit&timeZone=${ShopTime.timeZoneParam()}"

    /** #633 Top sản phẩm: the API's order (largest revenue first), [limit] rows at most */
    fun topProductRows(products: List<OverviewReport.TopProduct>, limit: Int = TOP_LIMIT): List<OverviewTopRow> =
        topRows(products.take(limit).map { OverviewTopRow(it.id, it.name, it.totalRevenue, it.rentalCount, 0.0, it.image) })

    /** #633 Top khách hàng: the API's order, [limit] rows at most; a hidden `totalSpent` counts as 0 */
    fun topCustomerRows(customers: List<OverviewReport.TopCustomer>, limit: Int = TOP_LIMIT): List<OverviewTopRow> =
        topRows(customers.take(limit).map { OverviewTopRow(it.id, it.name, it.totalSpent ?: 0.0, it.orderCount, 0.0) })

    fun topRows(report: OverviewReport, kind: OverviewTopKind, limit: Int = TOP_LIMIT): List<OverviewTopRow> = when (kind) {
        OverviewTopKind.PRODUCTS -> topProductRows(report.topProducts, limit)
        OverviewTopKind.CUSTOMERS -> topCustomerRows(report.topCustomers, limit)
    }

    private fun topRows(rows: List<OverviewTopRow>): List<OverviewTopRow> {
        val top = rows.maxOfOrNull { it.amount.coerceAtLeast(0.0) } ?: 0.0
        return rows.map { it.copy(ratio = if (top > 0) it.amount.coerceAtLeast(0.0) / top else 0.0) }
    }

    /** "Now" figures and today's work of the outlet for the shop today (#602, iOS `outletOperationsParameters`) */
    fun outletOperationsPath(): String = "/api/analytics/outlet-operations?timeZone=${ShopTime.timeZoneParam()}"

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
    fun showsOperations(role: String?): Boolean = role in setOf("ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY")

    fun reportFromJson(data: JSONObject): OverviewReport {
        fun number(o: JSONObject?, key: String): Double? =
            if (o == null || !o.has(key) || o.isNull(key)) null else o.optDouble(key).takeIf { !it.isNaN() }
        val revenue = data.optJSONObject("revenue")
        // `collected` leaves collateral out (#484); an older API only sends `revenue`
        val growth = data.optJSONObject("growth")?.let { it.optJSONObject("collected") ?: it.optJSONObject("revenue") }
        val counts = data.optJSONObject("operational")?.optJSONObject("orderCounts")
        val series = data.optJSONArray("series")
        val top = data.optJSONArray("topProducts")
        val customers = data.optJSONArray("topCustomers")
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
                    expectedCollected = number(p, "expectedCollected"),
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
            topCustomers = (0 until (customers?.length() ?: 0)).mapNotNull { i ->
                val c = customers?.optJSONObject(i) ?: return@mapNotNull null
                OverviewReport.TopCustomer(
                    id = if (c.has("id") && !c.isNull("id")) c.optInt("id") else null,
                    name = if (c.isNull("name")) "" else c.optString("name"),
                    orderCount = c.optInt("orderCount", 0),
                    totalSpent = number(c, "totalSpent"),
                )
            },
            totalOrderValue = number(revenue, "totalOrderValue"),
            cashCollected = number(revenue, "cashCollected"),
            orderValueOrders = revenue?.optJSONObject("orderValueByType")?.let { split ->
                (split.optJSONObject("rent")?.optInt("orders", 0) ?: 0) + (split.optJSONObject("sale")?.optInt("orders", 0) ?: 0)
            },
            orderValueByType = revenue?.optJSONObject("orderValueByType")?.let { split ->
                fun part(key: String): AmountOrders = split.optJSONObject(key).let { p ->
                    AmountOrders(amount = number(p, "amount") ?: 0.0, orders = number(p, "orders")?.toInt() ?: 0)
                }
                OrderValueByType(rent = part("rent"), sale = part("sale"))
            },
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

    private fun count(o: JSONObject?, key: String): Int? =
        if (o == null || !o.has(key) || o.isNull(key)) null else o.optDouble(key).takeIf { !it.isNaN() }?.toInt()

    /** #496 `{list}.count` left and `doneToday.{done}`; a missing count hides the row, a missing done count is 0 */
    private fun todayTask(data: JSONObject, list: String, done: String): TodayTask? {
        val remaining = count(data.optJSONObject(list), "count") ?: return null
        return TodayTask(remaining, count(data.optJSONObject("doneToday"), done) ?: 0)
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
            pickupsToday = todayTask(data, "pickupsToday", "pickups"),
            returnsToday = todayTask(data, "returnsToday", "returns"),
            noShows = count(data.optJSONObject("noShows"), "count"),
            tomorrow = data.optJSONObject("tomorrow")?.let { Tomorrow(count(it, "pickups") ?: 0, count(it, "returns") ?: 0) },
        )
    }
}
