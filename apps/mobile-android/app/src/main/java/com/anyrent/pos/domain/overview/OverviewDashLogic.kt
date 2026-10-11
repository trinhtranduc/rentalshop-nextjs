package com.anyrent.pos.domain.overview

import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * #725: the Overview as iOS draws it (`OverviewDashLogic.swift`, #616): period chips, four tiles with chips, compact
 * money, the Thực thu forecast, chart bars, sheet rows and the Hôm nay card. Pure mapping of `GET /api/analytics/period`
 * and `GET /api/analytics/outlet-operations`; callers pass the shop's today (`ShopTime.today()`).
 */

/** Period chips: Hôm nay / 7 ngày / Tháng này / Tuỳ chọn */
enum class OverviewChip { TODAY, LAST_7, THIS_MONTH, CUSTOM }

/** The four tiles, in display order */
enum class OverviewTileKind { ORDER_VALUE, COLLECTED, OUTSTANDING, COLLATERAL }

enum class OverviewChipTone { UP, DOWN, WARN, INFO }

/** Text of a chip (string resource chosen by the screen); [count] fills its number */
enum class OverviewChipText { NEW, UP, DOWN, OVERDUE, WAITING, HELD, NEW_ORDERS }

data class OverviewTileChip(val tone: OverviewChipTone, val text: OverviewChipText, val count: Int? = null)

data class OverviewTile(
    val kind: OverviewTileKind,
    val value: Double?,
    /** "+" before a positive value (net collateral) */
    val signed: Boolean,
    val chip: OverviewTileChip?,
    /** #719: "13 đơn mới" on Giá trị đơn mới */
    val count: OverviewTileChip? = null,
)

/** Thực thu against what is still expected from today to the end of the period */
data class OverviewForecast(val collected: Double, val forecast: Double, val collectedShare: Double, val until: String)

data class OverviewDashBar(
    /** `yyyy-MM-dd`, or the month label of a monthly point */
    val key: String,
    val value: Double,
    val forecast: Double,
    /** Height of value + forecast against the tallest bar, 0…1 */
    val ratio: Double,
    /** Height of the forecast part alone, 0…1 */
    val forecastRatio: Double,
    val isToday: Boolean,
    val isDay: Boolean,
)

enum class OverviewWaterfallKey { DEPOSITS, PICKUP_AND_SALE, FEES, REFUNDS, COLLATERAL, TOTAL }

data class OverviewWaterfallRow(val key: OverviewWaterfallKey, val amount: Double, val left: Double, val width: Double, val isTotal: Boolean)

enum class OverviewCollateralKey { RECEIVED, RETURNED, TO_COLLECT, TO_RETURN }

data class OverviewCollateralRow(
    val key: OverviewCollateralKey,
    val amount: Double,
    val orders: Int?,
    /** Hatched: not in the period's numbers yet */
    val upcoming: Boolean,
    /** 0…1 of the largest row */
    val width: Double,
)

data class OverviewSplitPart(val amount: Double, val orders: Int, val share: Double)

object OverviewDashLogic {
    // Periods

    /** Civil-day range of a chip; Tháng này is the whole month; a custom chip without a range falls back to today */
    fun range(chip: OverviewChip, today: LocalDate, custom: DayRange? = null): DayRange = when (chip) {
        OverviewChip.TODAY -> DayRange(today, today)
        OverviewChip.LAST_7 -> DayRange(today.minusDays(6), today)
        OverviewChip.THIS_MONTH -> YearMonth.from(today).let { DayRange(it.atDay(1), it.atEndOfMonth()) }
        OverviewChip.CUSTOM -> when {
            custom == null -> DayRange(today, today)
            custom.start <= custom.end -> custom
            else -> DayRange(custom.end, custom.start)
        }
    }

    /** Hôm nay charts the 7 days up to today and the 7 after (14 bars); another one-day range the 7 days up to it */
    fun chartRange(chip: OverviewChip, range: DayRange): DayRange = when {
        range.start != range.end -> range
        chip == OverviewChip.TODAY -> DayRange(range.end.minusDays(6), range.end.plusDays(7))
        else -> DayRange(range.end.minusDays(6), range.end)
    }

    /** Latest day the custom picker allows: a year ahead */
    fun customMaxDay(today: LocalDate): LocalDate = today.plusDays(365)

    // Tiles

    sealed interface Growth {
        data object None : Growth
        data object New : Growth
        data class Pct(val pct: Int, val up: Boolean) : Growth
    }

    /** 1000 %+ means the previous period was (almost) empty; 0 / unknown shows nothing */
    fun growth(value: Double?): Growth {
        if (value == null || !value.isFinite() || value == 0.0) return Growth.None
        if (abs(value) >= 1000) return Growth.New
        // Swift `rounded()`: half away from zero
        val pct = Math.round(abs(value)).toInt()
        return if (pct == 0) Growth.None else Growth.Pct(pct, value > 0)
    }

    fun growthChip(value: Double?): OverviewTileChip? = when (val g = growth(value)) {
        Growth.None -> null
        Growth.New -> OverviewTileChip(OverviewChipTone.UP, OverviewChipText.NEW)
        is Growth.Pct -> OverviewTileChip(
            if (g.up) OverviewChipTone.UP else OverviewChipTone.DOWN,
            if (g.up) OverviewChipText.UP else OverviewChipText.DOWN,
            g.pct,
        )
    }

    /** The four tiles; chips only say what the data supports */
    fun tiles(report: OverviewReport?, now: OverviewNow?): List<OverviewTile> {
        val parts = report?.outstandingBreakdown
        val outstandingChip = when {
            parts == null -> null
            parts.overduePickup.orders > 0 -> OverviewTileChip(OverviewChipTone.WARN, OverviewChipText.OVERDUE, parts.overduePickup.orders)
            parts.atPickup.orders > 0 -> OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.WAITING, parts.atPickup.orders)
            else -> null
        }
        val collateralChip = now?.rentedOut?.takeIf { it > 0 }?.let { OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.HELD, it) }
        return listOf(
            OverviewTile(
                OverviewTileKind.ORDER_VALUE, report?.totalOrderValue, false, growthChip(report?.orderValueGrowth?.growth),
                count = report?.orderValueOrders?.let { OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.NEW_ORDERS, it) },
            ),
            // #722: Thực thu is the money held, collateral included (cashCollected); older APIs keep collected
            OverviewTile(OverviewTileKind.COLLECTED, report?.let { it.cashCollected ?: it.netRevenue }, false, growthChip(report?.revenueGrowth)),
            OverviewTile(OverviewTileKind.OUTSTANDING, report?.outstanding, false, outstandingChip),
            OverviewTile(OverviewTileKind.COLLATERAL, report?.collateralFlow?.net, true, collateralChip),
        )
    }

    /** Σ `expectedCollected` of the period's days from today on; null without a forecast */
    fun forecast(collected: Double?, series: List<OverviewReport.Point>, today: LocalDate): OverviewForecast? {
        val todayKey = today.toString()
        var total = 0.0
        var until = ""
        for (point in series) {
            val key = point.dayKey ?: continue
            if (key < todayKey) continue
            val value = (point.expectedCollected ?: 0.0).coerceAtLeast(0.0)
            if (value > 0) {
                total += value
                if (key > until) until = key
            }
        }
        if (collected == null || total <= 0) return null
        val done = collected.coerceAtLeast(0.0)
        return OverviewForecast(collected, total, done / (done + total), until)
    }

    // Money text

    /** Full below a million ("450.000"), else "18,65 tr" / "1,2 tỷ" (en "18.65M" / "1.2B"); two decimals at most */
    fun compact(amount: Double, vietnamese: Boolean): String {
        val magnitude = abs(amount)
        if (magnitude < 1_000_000) return money(amount)
        val billion = magnitude >= 1_000_000_000
        val scaled = (magnitude / (if (billion) 1_000_000_000.0 else 1_000_000.0) * 100).roundToLong() / 100.0
        var text = "%.2f".format(java.util.Locale.US, scaled).trimEnd('0').trimEnd('.')
        if (vietnamese) text = text.replace('.', ',')
        val unit = if (vietnamese) (if (billion) " tỷ" else " tr") else (if (billion) "B" else "M")
        return (if (amount < 0) "−" else "") + text + unit
    }

    /** "1.234.567" / "−1.234" (iOS `MoneyFormatter.format`) */
    fun money(amount: Double): String {
        val rounded = Math.round(amount)
        val digits = abs(rounded).toString().reversed().chunked(3).joinToString(".").reversed()
        return (if (rounded < 0) "−" else "") + digits
    }

    /** "+1.234" / "−1.234" */
    fun signedMoney(amount: Double): String = if (amount < 0) "−" + money(-amount) else "+" + money(amount)

    /** Value of a tile: "—" when unknown, "+" before a positive signed value */
    fun tileText(tile: OverviewTile, vietnamese: Boolean, compact: Boolean = true): String {
        val value = tile.value ?: return "—"
        val text = if (compact) compact(value, vietnamese) else money(value)
        return if (tile.signed && value > 0) "+$text" else text
    }

    // Chart

    /** One bar per day of [range] (missing days are 0) or, past 45 days, the API's monthly points */
    fun chartBars(report: OverviewReport, range: DayRange, today: LocalDate): List<OverviewDashBar> {
        data class Raw(val key: String, val value: Double, val forecast: Double, val isDay: Boolean)
        val raw = if (OverviewLogic.groupBy(range) == "month") {
            report.series.map { Raw(it.monthLabel.orEmpty(), it.realIncome, (it.expectedCollected ?: 0.0).coerceAtLeast(0.0), false) }
        } else {
            val values = HashMap<String, Double>()
            val forecasts = HashMap<String, Double>()
            for (point in report.series) {
                val key = point.dayKey ?: continue
                values[key] = (values[key] ?: 0.0) + point.realIncome
                forecasts[key] = (forecasts[key] ?: 0.0) + (point.expectedCollected ?: 0.0).coerceAtLeast(0.0)
            }
            (0 until range.dayCount).map { offset ->
                val key = range.start.plusDays(offset.toLong()).toString()
                Raw(key, values[key] ?: 0.0, forecasts[key] ?: 0.0, true)
            }
        }
        val top = raw.maxOfOrNull { it.value.coerceAtLeast(0.0) + it.forecast } ?: 0.0
        val todayKey = today.toString()
        return raw.map { bar ->
            val total = bar.value.coerceAtLeast(0.0) + bar.forecast
            OverviewDashBar(
                bar.key, bar.value, bar.forecast,
                ratio = if (top > 0) total / top else 0.0,
                forecastRatio = if (top > 0) bar.forecast / top else 0.0,
                isToday = bar.isDay && bar.key == todayKey,
                isDay = bar.isDay,
            )
        }
    }

    /** Indexes of the bars that get an axis label: first, today, last */
    fun axisLabelIndexes(bars: List<OverviewDashBar>): List<Int> {
        if (bars.isEmpty()) return emptyList()
        val indexes = mutableListOf(0)
        val today = bars.indexOfFirst { it.isToday }
        if (today > 0 && today != bars.size - 1) indexes.add(today)
        if (bars.size > 1) indexes.add(bars.size - 1)
        return indexes
    }

    // Detail sheets

    /**
     * Thực thu as a waterfall: three additions, minus refunds, (+ collateral received − returned, #708), = total.
     * Handles a negative total.
     */
    fun waterfall(parts: CollectedBreakdown, total: Double, collateral: Double? = null): List<OverviewWaterfallRow> {
        val steps = mutableListOf(
            OverviewWaterfallKey.DEPOSITS to parts.deposits,
            OverviewWaterfallKey.PICKUP_AND_SALE to parts.pickupAndSale,
            OverviewWaterfallKey.FEES to parts.fees,
            OverviewWaterfallKey.REFUNDS to -parts.refunds,
        )
        if (collateral != null) steps.add(OverviewWaterfallKey.COLLATERAL to collateral)
        data class Span(val key: OverviewWaterfallKey, val amount: Double, val from: Double, val to: Double, val total: Boolean)
        val spans = mutableListOf<Span>()
        var run = 0.0
        for ((key, amount) in steps) {
            spans.add(Span(key, amount, run, run + amount, false))
            run += amount
        }
        spans.add(Span(OverviewWaterfallKey.TOTAL, total, 0.0, total, true))
        val lo = minOf(0.0, spans.minOf { minOf(it.from, it.to) })
        val hi = maxOf(0.0, spans.maxOf { maxOf(it.from, it.to) })
        val width = if (hi - lo == 0.0) 1.0 else hi - lo
        return spans.map {
            OverviewWaterfallRow(it.key, it.amount, (minOf(it.from, it.to) - lo) / width, abs(it.to - it.from) / width, it.total)
        }
    }

    /** Two parts of one stacked bar (shares of their sum; negatives count as 0) */
    fun split(a: AmountOrders, b: AmountOrders): Pair<OverviewSplitPart, OverviewSplitPart> {
        val x = a.amount.coerceAtLeast(0.0)
        val y = b.amount.coerceAtLeast(0.0)
        val sum = x + y
        return OverviewSplitPart(a.amount, a.orders, if (sum > 0) x / sum else 0.0) to
            OverviewSplitPart(b.amount, b.orders, if (sum > 0) y / sum else 0.0)
    }

    /** Thế chân: received / returned in the period, then the upcoming ones from today's cash */
    fun collateralRows(flow: CollateralFlow?, now: OverviewNow?): List<OverviewCollateralRow> {
        data class Raw(val key: OverviewCollateralKey, val amount: Double, val orders: Int?, val upcoming: Boolean)
        val rows = buildList {
            if (flow != null) {
                add(Raw(OverviewCollateralKey.RECEIVED, flow.received, null, false))
                add(Raw(OverviewCollateralKey.RETURNED, flow.returned, null, false))
            }
            now?.collateralToCollect?.let { add(Raw(OverviewCollateralKey.TO_COLLECT, it.amount, it.orders, true)) }
            now?.collateralToReturn?.let { add(Raw(OverviewCollateralKey.TO_RETURN, it.amount, it.orders, true)) }
        }
        val top = rows.maxOfOrNull { abs(it.amount) } ?: 0.0
        return rows.map { OverviewCollateralRow(it.key, it.amount, it.orders, it.upcoming, if (top > 0) abs(it.amount) / top else 0.0) }
    }

    // Hôm nay

    /** "2/3": done of planned */
    fun doneOfTotal(task: TodayTask): String = "${task.done}/${task.total}"

    /** The Hôm nay card (today's counters and the Ngày mai line) belongs to today only */
    fun showsTodayCard(range: DayRange, today: LocalDate): Boolean = range.start == today && range.end == today

    /** The card's counters need both lists (iOS `OverviewNow.today`) */
    fun todayTasks(now: OverviewNow?): Pair<TodayTask, TodayTask>? {
        val pickups = now?.pickupsToday ?: return null
        val returns = now.returnsToday ?: return null
        return pickups to returns
    }
}
