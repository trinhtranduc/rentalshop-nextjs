package com.anyrent.pos.domain.overview

import com.anyrent.pos.domain.ShopTime
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** #725 — the iOS Overview logic on Android (mirrors `OverviewDashLogicTests.swift`) */
class OverviewDashLogicTest {
    private fun d(s: String) = LocalDate.parse(s)
    private fun r(a: String, b: String) = DayRange(d(a), d(b))
    private fun point(key: String, collected: Double = 0.0, expected: Double? = null) =
        OverviewReport.Point(key, null, collected, expectedCollected = expected)

    private fun report(
        collected: Double = 0.0,
        series: List<OverviewReport.Point> = emptyList(),
        orderValue: Double? = null,
        outstanding: OutstandingBreakdown? = null,
        flow: CollateralFlow? = null,
        orderValueGrowth: Double? = null,
        revenueGrowth: Double? = null,
    ) = OverviewReport(
        netRevenue = collected, revenueGrowth = revenueGrowth, newOrders = 3, series = series, topProducts = emptyList(),
        totalOrderValue = orderValue, outstanding = outstanding?.let { it.atPickup.amount + it.overduePickup.amount },
        orderValueGrowth = orderValueGrowth?.let { OverviewGrowth(null, null, it) },
        collateralFlow = flow, outstandingBreakdown = outstanding,
    )

    private fun inEachZone(body: (String) -> Unit) {
        val saved = TimeZone.getDefault()
        try {
            for (id in listOf("Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles")) {
                TimeZone.setDefault(TimeZone.getTimeZone(id))
                body(id)
            }
        } finally {
            TimeZone.setDefault(saved)
        }
    }

    @Test
    fun shopTodayIsTheVietnamDayInEveryPhoneZone() = inEachZone { zone ->
        // 16:59:59Z is still 7 Oct in Vietnam; 17:00:00Z is 8 Oct
        assertEquals(zone, d("2026-10-07"), ShopTime.today(Instant.parse("2026-10-07T16:59:59Z")))
        val today = ShopTime.today(Instant.parse("2026-10-07T17:00:00Z"))
        assertEquals(zone, r("2026-10-08", "2026-10-08"), OverviewDashLogic.range(OverviewChip.TODAY, today))
        assertEquals(
            zone, r("2026-10-02", "2026-10-15"),
            OverviewDashLogic.chartRange(OverviewChip.TODAY, OverviewDashLogic.range(OverviewChip.TODAY, today)),
        )
    }

    @Test
    fun chipRanges() {
        val today = d("2026-10-07")
        assertEquals(r("2026-10-07", "2026-10-07"), OverviewDashLogic.range(OverviewChip.TODAY, today))
        assertEquals(r("2026-10-01", "2026-10-07"), OverviewDashLogic.range(OverviewChip.LAST_7, today))
        // Tháng này is the whole month, so its forecast reaches the month end
        assertEquals(r("2026-10-01", "2026-10-31"), OverviewDashLogic.range(OverviewChip.THIS_MONTH, today))
        assertEquals(r("2028-02-01", "2028-02-29"), OverviewDashLogic.range(OverviewChip.THIS_MONTH, d("2028-02-10")))
        assertEquals(r("2026-12-28", "2027-01-03"), OverviewDashLogic.range(OverviewChip.LAST_7, d("2027-01-03")))
        // Custom: reversed is swapped, missing falls back to today, the future is allowed
        assertEquals(r("2026-10-10", "2026-10-20"), OverviewDashLogic.range(OverviewChip.CUSTOM, today, r("2026-10-20", "2026-10-10")))
        assertEquals(r("2026-10-07", "2026-10-07"), OverviewDashLogic.range(OverviewChip.CUSTOM, today))
        assertEquals(d("2027-10-07"), OverviewDashLogic.customMaxDay(today))
    }

    @Test
    fun chartRange() {
        val chart = OverviewDashLogic.chartRange(OverviewChip.TODAY, r("2026-10-07", "2026-10-07"))
        assertEquals(r("2026-10-01", "2026-10-14"), chart)
        assertEquals(14, chart.dayCount)
        assertEquals(r("2026-10-14", "2026-10-20"), OverviewDashLogic.chartRange(OverviewChip.CUSTOM, r("2026-10-20", "2026-10-20")))
        val week = r("2026-10-01", "2026-10-07")
        assertEquals(week, OverviewDashLogic.chartRange(OverviewChip.LAST_7, week))
        assertEquals(r("2026-12-22", "2027-01-04"), OverviewDashLogic.chartRange(OverviewChip.TODAY, r("2026-12-28", "2026-12-28")))
    }

    @Test
    fun forecastSumsFromTodayToTheEndOfThePeriod() {
        val today = d("2026-10-07")
        val series = listOf(
            point("2026-10-06", 2_000_000.0, 900_000.0), // past: not expected money
            point("2026-10-07", 12_420_000.0, 1_500_000.0),
            point("2026-10-08", expected = 0.0),
            point("2026-10-10", expected = 2_800_000.0),
            point("2026-10-31", expected = null),
        )
        val forecast = OverviewDashLogic.forecast(12_420_000.0, series, today)!!
        assertEquals(4_300_000.0, forecast.forecast, 0.0)
        assertEquals("2026-10-10", forecast.until)
        assertEquals(12_420_000.0 / 16_720_000.0, forecast.collectedShare, 1e-9)
        val todayOnly = OverviewDashLogic.forecast(0.0, listOf(point("2026-10-07", expected = 500_000.0)), today)!!
        assertEquals("2026-10-07", todayOnly.until)
        assertEquals(0.0, todayOnly.collectedShare, 0.0)
        assertEquals(0.0, OverviewDashLogic.forecast(-100.0, listOf(point("2026-10-07", expected = 500.0)), today)!!.collectedShare, 0.0)
        assertNull(OverviewDashLogic.forecast(1.0, listOf(point("2026-10-07", expected = 0.0)), today))
        assertNull(OverviewDashLogic.forecast(1.0, listOf(point("2026-10-01", expected = 10.0)), today))
        assertNull(OverviewDashLogic.forecast(1.0, listOf(point("2026-10-07")), today))
        assertNull(OverviewDashLogic.forecast(null, listOf(point("2026-10-07", expected = 10.0)), today))
    }

    @Test
    fun tileChips() {
        val overdue = OutstandingBreakdown(AmountOrders(9_000_000.0, 4), AmountOrders(2_590_000.0, 1))
        val now = OverviewNow(lateReturns = 1, rentedOut = 11, collateralHeld = 6_000_000.0)
        val tiles = OverviewDashLogic.tiles(
            report(12_420_000.0, orderValue = 18_650_000.0, outstanding = overdue, flow = CollateralFlow(7_390_000.0, 1_000_000.0),
                orderValueGrowth = 12.4, revenueGrowth = -3.6),
            now,
        )
        assertEquals(OverviewTileKind.entries.toList(), tiles.map { it.kind })
        assertEquals(OverviewTileChip(OverviewChipTone.UP, OverviewChipText.UP, 12), tiles[0].chip)
        assertEquals(OverviewTileChip(OverviewChipTone.DOWN, OverviewChipText.DOWN, 4), tiles[1].chip)
        assertEquals(OverviewTileChip(OverviewChipTone.WARN, OverviewChipText.OVERDUE, 1), tiles[2].chip)
        assertEquals(11_590_000.0, tiles[2].value!!, 0.0)
        assertEquals(6_390_000.0, tiles[3].value!!, 0.0)
        assertTrue(tiles[3].signed)
        assertEquals(OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.HELD, 11), tiles[3].chip)
        assertEquals("+6,39 tr", OverviewDashLogic.tileText(tiles[3], vietnamese = true))
        assertEquals("+6.390.000", OverviewDashLogic.tileText(tiles[3], vietnamese = true, compact = false))

        val waiting = OutstandingBreakdown(AmountOrders(1.0, 2), AmountOrders(0.0, 0))
        assertEquals(
            OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.WAITING, 2),
            OverviewDashLogic.tiles(report(outstanding = waiting), null)[2].chip,
        )
        val none = OutstandingBreakdown(AmountOrders(0.0, 0), AmountOrders(0.0, 0))
        assertNull(OverviewDashLogic.tiles(report(outstanding = none), null)[2].chip)

        // #719: "N đơn mới" = rent + sale orders behind the money
        assertNull(tiles[0].count)
        val split = report().copy(orderValueOrders = 13)
        assertEquals(OverviewTileChip(OverviewChipTone.INFO, OverviewChipText.NEW_ORDERS, 13), OverviewDashLogic.tiles(split, null)[0].count)

        // #722: Thực thu is cashCollected when the API sends it
        assertEquals(5_000.0, OverviewDashLogic.tiles(report(100.0).copy(cashCollected = 5_000.0), null)[1].value!!, 0.0)
        assertEquals(100.0, OverviewDashLogic.tiles(report(100.0), null)[1].value!!, 0.0)

        // No report: no values, no chips, "—"
        val older = OverviewDashLogic.tiles(null, null)
        assertEquals(listOf<Double?>(null, null, null, null), older.map { it.value })
        assertTrue(older.all { it.chip == null })
        assertEquals("—", OverviewDashLogic.tileText(older[0], vietnamese = true))
    }

    @Test
    fun growthRule() {
        assertEquals(OverviewDashLogic.Growth.None, OverviewDashLogic.growth(null))
        assertEquals(OverviewDashLogic.Growth.None, OverviewDashLogic.growth(0.0))
        assertEquals(OverviewDashLogic.Growth.None, OverviewDashLogic.growth(0.3))
        assertEquals(OverviewDashLogic.Growth.Pct(13, true), OverviewDashLogic.growth(12.5))
        assertEquals(OverviewDashLogic.Growth.Pct(12, false), OverviewDashLogic.growth(-12.4))
        assertEquals(OverviewDashLogic.Growth.New, OverviewDashLogic.growth(1000.0))
        assertEquals(OverviewTileChip(OverviewChipTone.UP, OverviewChipText.NEW), OverviewDashLogic.growthChip(1500.0))
    }

    @Test
    fun compactMoney() {
        assertEquals("18,65 tr", OverviewDashLogic.compact(18_650_000.0, true))
        assertEquals("12,42 tr", OverviewDashLogic.compact(12_420_000.0, true))
        assertEquals("4,3 tr", OverviewDashLogic.compact(4_300_000.0, true))
        assertEquals("2 tr", OverviewDashLogic.compact(2_000_000.0, true))
        assertEquals("1,23 tỷ", OverviewDashLogic.compact(1_234_500_000.0, true))
        assertEquals("450.000", OverviewDashLogic.compact(450_000.0, true))
        assertEquals("−1,2 tr", OverviewDashLogic.compact(-1_200_000.0, true))
        assertEquals("18.65M", OverviewDashLogic.compact(18_650_000.0, false))
        assertEquals("2.5B", OverviewDashLogic.compact(2_500_000_000.0, false))
        assertEquals("1000 tr", OverviewDashLogic.compact(999_999_999.0, true))
        assertEquals("−2.060", OverviewDashLogic.compact(-2_060.0, true))
        assertEquals("+64", OverviewDashLogic.signedMoney(64.0))
        assertEquals("−6.671", OverviewDashLogic.signedMoney(-6_671.0))
    }

    @Test
    fun chartBarsFillTheRangeAndMarkToday() = inEachZone { zone ->
        val source = report(series = listOf(
            point("2026-10-01", 6_200_000.0),
            point("2026-10-07", 12_400_000.0, 4_300_000.0),
            point("2026-10-10", expected = 16_700_000.0),
        ))
        val bars = OverviewDashLogic.chartBars(source, r("2026-10-01", "2026-10-14"), d("2026-10-07"))
        assertEquals(zone, 14, bars.size)
        assertEquals(zone, "2026-10-01", bars.first().key)
        assertEquals(zone, "2026-10-14", bars.last().key)
        assertEquals(zone, listOf("2026-10-07"), bars.filter { it.isToday }.map { it.key })
        assertEquals(12_400_000.0, bars[6].value, 0.0)
        assertEquals(4_300_000.0, bars[6].forecast, 0.0)
        assertEquals(1.0, bars[6].ratio, 1e-9)
        assertEquals(4_300_000.0 / 16_700_000.0, bars[6].forecastRatio, 1e-9)
        assertEquals(1.0, bars[9].ratio, 1e-9)
        assertEquals(0.0, bars[1].ratio, 0.0)
        assertEquals(zone, listOf(0, 6, 13), OverviewDashLogic.axisLabelIndexes(bars))
    }

    @Test
    fun chartBarsWithoutTodayAndMonthly() {
        val bars = OverviewDashLogic.chartBars(report(series = listOf(point("2026-09-03", 5.0))), r("2026-09-01", "2026-09-07"), d("2026-10-07"))
        assertFalse(bars.any { it.isToday })
        assertEquals(listOf(0, 6), OverviewDashLogic.axisLabelIndexes(bars))
        val months = OverviewDashLogic.chartBars(
            report(series = listOf(OverviewReport.Point(null, "10/26", 7.0, expectedCollected = 3.0))),
            r("2026-01-01", "2026-12-31"), d("2026-10-07"),
        )
        assertEquals(listOf("10/26"), months.map { it.key })
        assertEquals(3.0, months.first().forecast, 0.0)
        assertFalse(months.first().isDay)
    }

    @Test
    fun waterfallAndNegativeTotal() {
        val parts = CollectedBreakdown(2_810_000.0, 10_360_000.0, 450_000.0, 1_200_000.0)
        val rows = OverviewDashLogic.waterfall(parts, 12_420_000.0)
        assertEquals(
            listOf(OverviewWaterfallKey.DEPOSITS, OverviewWaterfallKey.PICKUP_AND_SALE, OverviewWaterfallKey.FEES, OverviewWaterfallKey.REFUNDS, OverviewWaterfallKey.TOTAL),
            rows.map { it.key },
        )
        assertEquals(2_810_000.0 / 13_620_000.0, rows[1].left, 1e-9)
        assertEquals(-1_200_000.0, rows[3].amount, 0.0)
        assertEquals(1.0, rows[3].left + rows[3].width, 1e-9)
        assertTrue(rows[4].isTotal)
        assertEquals(12_420_000.0 / 13_620_000.0, rows[4].width, 1e-9)
        val negative = OverviewDashLogic.waterfall(CollectedBreakdown(0.0, 100.0, 0.0, 300.0), -200.0)
        assertEquals(0.0, negative[4].left, 1e-9)
        assertEquals(200.0 / 300.0, negative[4].width, 1e-9)
        assertEquals(200.0 / 300.0, negative[1].left, 1e-9)
        // #708: collateral received − returned is a step before the total, and the rows add up to cashCollected
        val withCollateral = OverviewDashLogic.waterfall(CollectedBreakdown(644.0, 3_903.0, 0.0, 6_671.0), -2_060.0, collateral = 64.0)
        assertEquals(OverviewWaterfallKey.COLLATERAL, withCollateral[4].key)
        assertEquals(64.0, withCollateral[4].amount, 0.0)
        assertEquals(-2_060.0, withCollateral.dropLast(1).sumOf { it.amount }, 1e-9)
    }

    @Test
    fun splitsAndCollateralRows() {
        val (a, b) = OverviewDashLogic.split(AmountOrders(9_000_000.0, 4), AmountOrders(3_000_000.0, 1))
        assertEquals(0.75, a.share, 1e-9)
        assertEquals(0.25, b.share, 1e-9)
        assertEquals(0.0, OverviewDashLogic.split(AmountOrders(0.0, 0), AmountOrders(0.0, 0)).first.share, 0.0)

        val now = OverviewNow(
            lateReturns = 0, rentedOut = 11, collateralHeld = null,
            collateralToCollect = CollateralCount(2_000_000.0, 3), collateralToReturn = CollateralCount(8_000_000.0, 11),
        )
        val rows = OverviewDashLogic.collateralRows(CollateralFlow(4_000_000.0, 1_000_000.0), now)
        assertEquals(OverviewCollateralKey.entries.toList(), rows.map { it.key })
        assertEquals(listOf(false, false, true, true), rows.map { it.upcoming })
        assertEquals(listOf(0.5, 0.125, 0.25, 1.0), rows.map { it.width })
        assertEquals(11, rows[3].orders)
        assertTrue(OverviewDashLogic.collateralRows(null, null).isEmpty())
    }

    @Test
    fun todayCounters() {
        assertEquals("2/3", OverviewDashLogic.doneOfTotal(TodayTask(remaining = 1, done = 2)))
        assertEquals("0/0", OverviewDashLogic.doneOfTotal(TodayTask(0, 0)))
        assertNull(OverviewDashLogic.todayTasks(OverviewNow(0, null, null, pickupsToday = TodayTask(1, 0))))
    }

    @Test
    fun todayCardOnlyForTheTodayPeriod() {
        val today = d("2026-10-07")
        fun shows(chip: OverviewChip, custom: DayRange? = null) =
            OverviewDashLogic.showsTodayCard(OverviewDashLogic.range(chip, today, custom), today)
        assertTrue(shows(OverviewChip.TODAY))
        assertFalse(shows(OverviewChip.LAST_7))
        assertFalse(shows(OverviewChip.THIS_MONTH))
        assertFalse(shows(OverviewChip.CUSTOM, DayRange(today.minusDays(3), today)))
        assertFalse(shows(OverviewChip.CUSTOM, DayRange(today.minusDays(1), today.minusDays(1))))
        assertTrue(shows(OverviewChip.CUSTOM, DayRange(today, today)))
    }

    @Test
    fun parsesTheNewOptionalFields() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"collected":12420000,"totalOrderValue":18650000,
                  "orderValueByType":{"rent":{"amount":15000000,"orders":7},"sale":{"amount":3650000,"orders":2}}},
                 "series":[{"date":"2026/10/07","collected":12420000,"expectedCollected":1500000},
                           {"date":"2026/10/08","collected":0,"expectedCollected":2800000}]}""",
            ),
        )
        assertEquals(AmountOrders(15_000_000.0, 7), report.orderValueByType?.rent)
        assertEquals(2, report.orderValueByType?.sale?.orders)
        assertEquals(9, report.orderValueOrders)
        assertEquals(listOf(1_500_000.0, 2_800_000.0), report.series.map { it.expectedCollected })
        assertEquals("2026-10-07", report.series.first().dayKey)

        val older = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":5},"series":[{"date":"2026/10/07","realIncome":5}]}"""))
        assertNull(older.orderValueByType)
        assertNull(older.series.first().expectedCollected)
        assertNull(OverviewDashLogic.forecast(older.netRevenue, older.series, d("2026-10-07")))

        val now = OverviewLogic.nowFromJson(
            JSONObject(
                """{"overdueReturns":{"count":1},"pickupsToday":{"count":1},"returnsToday":{"count":1},
                 "doneToday":{"pickups":2,"returns":1},"noShows":{"count":1},"tomorrow":{"pickups":4,"returns":2}}""",
            ),
        )
        assertEquals(Tomorrow(4, 2), now.tomorrow)
        assertEquals("2/3", OverviewDashLogic.todayTasks(now)?.first?.let(OverviewDashLogic::doneOfTotal))
        assertNull(OverviewLogic.nowFromJson(JSONObject("""{"overdueReturns":{"count":0},"tomorrow":null}""")).tomorrow)
    }
}
