package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** #374 — preset ranges in the device zone, previous period, report and operations parsing, bars */
class OverviewLogicTest {
    private fun d(s: String) = LocalDate.parse(s)
    private fun r(a: String, b: String) = DayRange(d(a), d(b))

    @Test
    fun presetRangesInsideAMonth() {
        val today = d("2026-10-03")
        assertEquals(r("2026-10-03", "2026-10-03"), OverviewLogic.range(OverviewPreset.TODAY, today))
        assertEquals(r("2026-10-02", "2026-10-02"), OverviewLogic.range(OverviewPreset.YESTERDAY, today))
        assertEquals(r("2026-09-27", "2026-10-03"), OverviewLogic.range(OverviewPreset.LAST_7, today))
        assertEquals(r("2026-09-04", "2026-10-03"), OverviewLogic.range(OverviewPreset.LAST_30, today))
        assertEquals(r("2026-10-01", "2026-10-03"), OverviewLogic.range(OverviewPreset.THIS_MONTH, today))
        assertEquals(r("2026-09-01", "2026-09-30"), OverviewLogic.range(OverviewPreset.LAST_MONTH, today))
        assertEquals(7, OverviewLogic.range(OverviewPreset.LAST_7, today).dayCount)
        assertEquals(30, OverviewLogic.range(OverviewPreset.LAST_30, today).dayCount)
    }

    @Test
    fun presetRangesAcrossMonthAndYearEdges() {
        assertEquals(r("2026-02-28", "2026-02-28"), OverviewLogic.range(OverviewPreset.YESTERDAY, d("2026-03-01")))
        assertEquals(r("2026-03-01", "2026-03-01"), OverviewLogic.range(OverviewPreset.THIS_MONTH, d("2026-03-01")))
        assertEquals(r("2026-02-01", "2026-02-28"), OverviewLogic.range(OverviewPreset.LAST_MONTH, d("2026-03-31")))
        assertEquals(r("2028-02-01", "2028-02-29"), OverviewLogic.range(OverviewPreset.LAST_MONTH, d("2028-03-15")))
        assertEquals(r("2026-12-31", "2026-12-31"), OverviewLogic.range(OverviewPreset.YESTERDAY, d("2027-01-01")))
        assertEquals(r("2026-12-28", "2027-01-03"), OverviewLogic.range(OverviewPreset.LAST_7, d("2027-01-03")))
        assertEquals(r("2026-12-01", "2026-12-31"), OverviewLogic.range(OverviewPreset.LAST_MONTH, d("2027-01-10")))
        assertEquals(r("2026-12-12", "2027-01-10"), OverviewLogic.range(OverviewPreset.LAST_30, d("2027-01-10")))
    }

    @Test
    fun todayFollowsTheDeviceZone() {
        // 2026-10-02 18:30 UTC is already 3 Oct in Vietnam, still 2 Oct in UTC
        val instant = Instant.parse("2026-10-02T18:30:00Z")
        val vn = instant.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate()
        val utc = instant.atZone(ZoneId.of("UTC")).toLocalDate()
        assertEquals(d("2026-10-03"), OverviewLogic.range(OverviewPreset.TODAY, vn).start)
        assertEquals(d("2026-10-01"), OverviewLogic.range(OverviewPreset.YESTERDAY, utc).start)
    }

    @Test
    fun previousPeriod() {
        assertEquals(r("2026-09-20", "2026-09-26"), OverviewLogic.previous(r("2026-09-27", "2026-10-03")))
        assertEquals(r("2026-10-02", "2026-10-02"), OverviewLogic.previous(r("2026-10-03", "2026-10-03")))
        assertEquals(r("2026-01-29", "2026-02-28"), OverviewLogic.previous(r("2026-03-01", "2026-03-31")))
        assertEquals(r("2026-12-29", "2026-12-31"), OverviewLogic.previous(r("2027-01-01", "2027-01-03")))
    }

    @Test
    fun labelsGroupingAndChange() {
        assertEquals("27/09 – 03/10", OverviewLogic.shortRange(r("2026-09-27", "2026-10-03")))
        assertEquals("03/10", OverviewLogic.shortRange(r("2026-10-03", "2026-10-03")))
        assertEquals("day", OverviewLogic.groupBy(r("2026-09-27", "2026-10-03")))
        assertEquals("month", OverviewLogic.groupBy(r("2026-01-01", "2026-03-31")))
        assertEquals("▲ 8%", OverviewLogic.changeText(8.0))
        assertEquals("▼ 12,5%", OverviewLogic.changeText(-12.46))
        assertEquals("0%", OverviewLogic.changeText(0.01))
    }

    @Test
    fun reportParsingAndBars() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"startDate":"2026-09-28","endDate":"2026-10-04","groupBy":"day",
                "operational":{"orderCounts":{"new":24,"pickup":11,"return":4,"cancelled":21},"totalActualRevenue":105342},
                "revenue":{"totalRevenue":106232,"totalActualRevenue":105342,"totalOrders":60},
                "growth":{"orders":{"current":25,"previous":5,"growth":400},"revenue":{"current":106232,"previous":2696,"growth":3840.36}},
                "series":[{"month":"28/09/26","date":"2026/09/28","realIncome":1440},{"month":"29/09/26","date":"2026/09/29","realIncome":708},
                          {"month":"04/10/26","date":"2026/10/04","realIncome":-420}],
                "topProducts":[{"id":12,"name":"Garden Tools","rentalCount":3,"totalRevenue":80148,"image":null},{"name":"No id"}],
                "topCustomers":[],"topOutlets":[]}""",
            ),
        )
        assertEquals(105342.0, report.netRevenue, 0.0)
        assertEquals(3840.36, report.revenueGrowth!!, 0.001)
        assertEquals(24, report.newOrders)
        assertEquals(OverviewReport.TopProduct(null, "No id", 0, 0.0, null), report.topProducts[1])

        val weekday = mapOf(1 to "T2", 2 to "T3", 3 to "T4", 4 to "T5", 5 to "T6", 6 to "T7", 7 to "CN")
        val bars = OverviewLogic.bars(report, r("2026-09-28", "2026-10-04")) { weekday.getValue(it.dayOfWeek.value) }
        assertEquals(listOf(1440.0, 708.0, 0.0, 0.0, 0.0, 0.0, -420.0), bars.map { it.value })
        assertEquals(listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN"), bars.map { it.label })
        assertEquals(listOf(1.0, 708.0 / 1440, 0.0, 0.0, 0.0, 0.0, 0.0), OverviewLogic.barRatios(bars))
    }

    @Test
    fun reportWithMissingSectionsAndMonthlySeries() {
        val empty = OverviewLogic.reportFromJson(JSONObject("""{"startDate":"2026-01-01","operational":null}"""))
        assertEquals(OverviewReport(0.0, null, null, emptyList(), emptyList()), empty)

        val monthly = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"totalRevenue":500},"series":[{"month":"01/26","year":2026,"monthNumber":1,"realIncome":200},
                {"month":"02/26","year":2026,"monthNumber":2,"realIncome":300}]}""",
            ),
        )
        assertEquals(500.0, monthly.netRevenue, 0.0)
        val bars = OverviewLogic.bars(monthly, r("2026-01-01", "2026-02-28")) { "" }
        assertEquals(listOf("01/26", "02/26"), bars.map { it.label })
        assertEquals(listOf(200.0, 300.0), bars.map { it.value })
    }

    /** #484: money tiles and the orders chart; an older API leaves them null and the chart at 0 */
    /** #492: what makes up "Thực thu" */
    @Test
    fun collectedBreakdown() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"collected":12450000,
                "collectedBreakdown":{"deposits":3000000,"pickupAndSale":9200000,"fees":650000,"refunds":400000}}}""",
            ),
        )
        assertEquals(12_450_000.0, report.netRevenue, 0.0)
        assertEquals(CollectedBreakdown(3_000_000.0, 9_200_000.0, 650_000.0, 400_000.0), report.collectedBreakdown)
        assertEquals(report.netRevenue, report.collectedBreakdown!!.total, 0.0)

        // A breakdown with a missing part counts it as 0; no refunds is the usual case
        val partial = OverviewLogic.reportFromJson(
            JSONObject("""{"revenue":{"collected":700,"collectedBreakdown":{"deposits":500,"pickupAndSale":200,"refunds":null}}}"""),
        )
        assertEquals(CollectedBreakdown(500.0, 200.0, 0.0, 0.0), partial.collectedBreakdown)
        assertEquals(700.0, partial.collectedBreakdown!!.total, 0.0)
    }

    /** #719: the new-order count is rent + sale of `orderValueByType` (cancelled left out), not `orderCounts.new` */
    @Test
    fun orderValueOrders() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"operational":{"orderCounts":{"new":15}},
                "revenue":{"totalOrderValue":3579,"orderValueByType":{"rent":{"amount":1457,"orders":8},"sale":{"amount":2122,"orders":5}}}}""",
            ),
        )
        assertEquals(13, report.orderValueOrders)
        assertEquals(15, report.newOrders)
        // An API without the split shows no count
        assertEquals(null, OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"totalOrderValue":10}}""")).orderValueOrders)
    }

    /** #492: the hero's change comes from `growth.orderValue`; an older API has none */
    @Test
    fun orderValueGrowth() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"collected":100,"totalOrderValue":15800000},
                "growth":{"collected":{"growth":-3},"orderValue":{"current":15800000,"previous":14600000,"growth":8.2}}}""",
            ),
        )
        assertEquals(OverviewGrowth(15_800_000.0, 14_600_000.0, 8.2), report.orderValueGrowth)
        assertEquals(-3.0, report.revenueGrowth!!, 0.0)
        assertEquals("▲ 8,2%", OverviewLogic.changeText(report.orderValueGrowth!!.growth!!))

        val noPrevious = OverviewLogic.reportFromJson(
            JSONObject("""{"growth":{"orderValue":{"current":500,"previous":null,"growth":null}}}"""),
        )
        assertEquals(OverviewGrowth(500.0, null, null), noPrevious.orderValueGrowth)

        val older = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":100},"growth":{"collected":{"growth":5}}}"""))
        assertEquals(null, older.orderValueGrowth)
        assertEquals(null, older.totalOrderValue)
        assertEquals(5.0, older.revenueGrowth!!, 0.0)
        assertEquals(null, OverviewLogic.reportFromJson(JSONObject("{}")).orderValueGrowth)
    }

    /** #492: an older API sends no breakdown: the detail sheet shows only the total */
    @Test
    fun olderApiWithoutBreakdown() {
        val older = OverviewLogic.reportFromJson(
            JSONObject("""{"revenue":{"collected":12450000,"totalOrderValue":15800000,"outstanding":3350000}}"""),
        )
        assertEquals(null, older.collectedBreakdown)
        assertEquals(15_800_000.0, older.totalOrderValue!!, 0.0)
        val nulls = OverviewLogic.reportFromJson(
            JSONObject("""{"revenue":{"collected":1,"collectedBreakdown":null}}"""),
        )
        assertEquals(null, nulls.collectedBreakdown)
        assertEquals(null, OverviewLogic.reportFromJson(JSONObject("{}")).collectedBreakdown)
    }

    @Test
    fun orderValueOutstandingAndOrdersChart() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"totalActualRevenue":12450000,"totalOrderValue":15800000,"outstanding":3350000},
                "series":[{"date":"2026/09/28","realIncome":1440,"newOrderCount":3},{"date":"2026/09/29","realIncome":708,"newOrderCount":0},
                          {"date":"2026/10/04","realIncome":-420}]}""",
            ),
        )
        assertEquals(15_800_000.0, report.totalOrderValue!!, 0.0)
        assertEquals(3_350_000.0, report.outstanding!!, 0.0)
        assertEquals(3, report.series[0].newOrderCount)
        assertEquals(null, report.series[2].newOrderCount)
        val range = r("2026-09-28", "2026-10-04")
        val money = OverviewLogic.bars(report, range) { "" }
        assertEquals(listOf(1440.0, 708.0, 0.0, 0.0, 0.0, 0.0, -420.0), money.map { it.value })
        val orders = OverviewLogic.bars(report, range, OverviewChart.ORDERS) { "" }
        assertEquals(listOf(3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), orders.map { it.value })

        val older = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"totalRevenue":500},"series":[{"date":"2026/09/28","realIncome":5}]}"""))
        assertEquals(null, older.totalOrderValue)
        assertEquals(null, older.outstanding)
        assertEquals(0.0, OverviewLogic.bars(older, r("2026-09-28", "2026-09-28"), OverviewChart.ORDERS) { "" }.single().value, 0.0)

        val monthly = OverviewLogic.reportFromJson(
            JSONObject("""{"series":[{"month":"01/26","monthNumber":1,"realIncome":200,"newOrderCount":7},{"month":"02/26","monthNumber":2,"realIncome":300}]}"""),
        )
        assertEquals(listOf(7.0, 0.0), OverviewLogic.bars(monthly, r("2026-01-01", "2026-02-28"), OverviewChart.ORDERS) { "" }.map { it.value })
    }

    @Test
    fun operationsWithAndWithoutCash() {
        val merchant = OverviewLogic.nowFromJson(
            JSONObject("""{"overdueReturns":{"count":4,"orders":[]},"cash":{"depositsHeld":{"depositAmount":1236,"securityDeposit":3500000,"orders":9}}}"""),
        )
        // An older API without `collateralToReturn`: the held collateral, no order count
        assertEquals(OverviewNow(4, 9, 3_500_000.0, collateralToReturn = CollateralCount(3_500_000.0, null)), merchant)
        val staff = OverviewLogic.nowFromJson(JSONObject("""{"overdueReturns":{"count":2},"cash":null}"""))
        assertEquals(OverviewNow(2, null, null), staff)
        assertEquals(OverviewNow(0, null, null), OverviewLogic.nowFromJson(JSONObject("{}")))
    }

    /** #494: collateral received / returned in the period and the split of "Còn phải thu" */
    @Test
    fun collateralFlowAndOutstandingBreakdown() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"collected":12450000,"outstanding":3350000,
                "collateralFlow":{"received":5000000,"returned":1500000},
                "outstandingBreakdown":{"atPickup":{"amount":2150000,"orders":5},"overduePickup":{"amount":1200000,"orders":2}}}}""",
            ),
        )
        assertEquals(CollateralFlow(5_000_000.0, 1_500_000.0), report.collateralFlow)
        assertEquals(3_500_000.0, report.collateralFlow!!.net, 0.0)
        assertEquals(15_950_000.0, report.collateralFlow!!.totalReceived(report.netRevenue), 0.0)
        assertEquals(
            OutstandingBreakdown(AmountOrders(2_150_000.0, 5), AmountOrders(1_200_000.0, 2)),
            report.outstandingBreakdown,
        )

        // More returned than received: the net is negative; a missing part counts as 0
        val partial = OverviewLogic.reportFromJson(
            JSONObject(
                """{"revenue":{"collected":100,"collateralFlow":{"returned":300},
                "outstandingBreakdown":{"atPickup":{"amount":50,"orders":1}}}}""",
            ),
        )
        assertEquals(CollateralFlow(0.0, 300.0), partial.collateralFlow)
        assertEquals(-300.0, partial.collateralFlow!!.net, 0.0)
        assertEquals(-200.0, partial.collateralFlow!!.totalReceived(partial.netRevenue), 0.0)
        assertEquals(OutstandingBreakdown(AmountOrders(50.0, 1), AmountOrders(0.0, 0)), partial.outstandingBreakdown)
    }

    /** #494: an older API sends neither: the old "Thực thu" sheet and a "Còn phải thu" tile that does not open */
    @Test
    fun olderApiWithoutCollateralFlowOrOutstandingBreakdown() {
        val older = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":1,"outstanding":2}}"""))
        assertEquals(null, older.collateralFlow)
        assertEquals(null, older.outstandingBreakdown)
        val nulls = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collateralFlow":null,"outstandingBreakdown":null}}"""))
        assertEquals(null, nulls.collateralFlow)
        assertEquals(null, nulls.outstandingBreakdown)
    }

    /** #494: collateral to collect at pickup and to hand back, from outlet-operations `cash` */
    @Test
    fun upcomingCollateral() {
        val now = OverviewLogic.nowFromJson(
            JSONObject(
                """{"overdueReturns":{"count":1},"cash":{"depositsHeld":{"securityDeposit":3500000,"orders":9},
                "collateralToCollect":{"securityDeposit":2000000,"orders":4},
                "collateralToReturn":{"securityDeposit":3400000,"orders":8}}}""",
            ),
        )
        assertEquals(CollateralCount(2_000_000.0, 4), now.collateralToCollect)
        // `collateralToReturn` wins over `depositsHeld` when the API sends it
        assertEquals(CollateralCount(3_400_000.0, 8), now.collateralToReturn)
        assertEquals(3_500_000.0, now.collateralHeld!!, 0.0)

        val noAmount = OverviewLogic.nowFromJson(
            JSONObject("""{"cash":{"collateralToCollect":{"securityDeposit":null,"orders":4},"collateralToReturn":{"orders":2}}}"""),
        )
        assertEquals(null, noAmount.collateralToCollect)
        assertEquals(null, noAmount.collateralToReturn)
        assertEquals(null, OverviewLogic.nowFromJson(JSONObject("{}")).collateralToReturn)
    }

    /** #496: "Việc hôm nay" counts and the no-shows count of outlet-operations */
    @Test
    fun todayWorkCounts() {
        val now = OverviewLogic.nowFromJson(
            JSONObject(
                """{"pickupsToday":{"count":3,"orders":[]},"returnsToday":{"count":0,"orders":[]},
                "noShows":{"count":2,"orders":[]},"doneToday":{"pickups":4,"returns":1}}""",
            ),
        )
        assertEquals(TodayTask(remaining = 3, done = 4), now.pickupsToday)
        assertEquals(7, now.pickupsToday!!.total)
        assertEquals(TodayTask(remaining = 0, done = 1), now.returnsToday)
        assertEquals(1, now.returnsToday!!.total)
        assertEquals(2, now.noShows)

        // Without `doneToday` the done count is 0; without a list the row is hidden
        val partial = OverviewLogic.nowFromJson(JSONObject("""{"pickupsToday":{"count":5},"noShows":{"count":null}}"""))
        assertEquals(TodayTask(5, 0), partial.pickupsToday)
        assertEquals(null, partial.returnsToday)
        assertEquals(null, partial.noShows)
        val empty = OverviewLogic.nowFromJson(JSONObject("{}"))
        assertEquals(null, empty.pickupsToday)
        assertEquals(null, empty.returnsToday)
        assertEquals(null, empty.noShows)
    }

    @Test
    fun visibilityByRole() {
        assertFalse(OverviewLogic.showsRevenue("OUTLET_STAFF"))
        assertTrue(OverviewLogic.showsOperations("OUTLET_STAFF"))
        assertTrue(OverviewLogic.showsRevenue("MERCHANT"))
        assertTrue(OverviewLogic.showsRevenue("OUTLET_ADMIN"))
        assertFalse(OverviewLogic.showsRevenue(null))
        assertFalse(OverviewLogic.showsOperations(null))
    }
}
