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

    @Test
    fun operationsWithAndWithoutCash() {
        val merchant = OverviewLogic.nowFromJson(
            JSONObject("""{"overdueReturns":{"count":4,"orders":[]},"cash":{"depositsHeld":{"depositAmount":1236,"securityDeposit":3500000,"orders":9}}}"""),
        )
        assertEquals(OverviewNow(4, 9, 3_500_000.0), merchant)
        val staff = OverviewLogic.nowFromJson(JSONObject("""{"overdueReturns":{"count":2},"cash":null}"""))
        assertEquals(OverviewNow(2, null, null), staff)
        assertEquals(OverviewNow(0, null, null), OverviewLogic.nowFromJson(JSONObject("{}")))
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
