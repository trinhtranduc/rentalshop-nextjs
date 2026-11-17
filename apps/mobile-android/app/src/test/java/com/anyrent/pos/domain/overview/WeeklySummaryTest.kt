package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** #1612 AI weekly summary: parsing, growth badges, red dot, bars, day labels (same rules as the web model) */
class WeeklySummaryTest {
    private val savedZone: TimeZone = TimeZone.getDefault()

    @After fun restore() = TimeZone.setDefault(savedZone)

    private val vi = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")
    private val en = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

    private val ready = """
        {"available":true,"week":{"start":"2026-11-09","end":"2026-11-15"},"nextWeekStart":"2026-11-23","status":"READY",
         "branchName":null,"futureField":{"x":1},
         "summary":{"generatedAt":"2026-11-16T01:12:00.000Z","language":"vi","model":"m",
          "numbers":{"week":{"start":"2026-11-09","end":"2026-11-15"},
           "revenue":{"orderValue":{"current":18450000,"previous":16470000,"growth":12.02},
                      "collected":{"current":15200000,"previous":14000000,"growth":8.57},"outstanding":3250000,"fees":600000},
           "branches":[{"outletId":3,"name":"Lê Lợi","orderValue":{"current":10200000,"previous":8640000,"growth":18.06},"collected":8400000,"newOrders":21},
                       {"outletId":4,"name":"Võ Văn Tần","orderValue":{"current":8250000,"previous":7830000,"growth":5.36},"collected":6800000,"newOrders":21}],
           "orders":{"new":{"current":42,"previous":37,"growth":13.51},"rent":38,"sale":4,"cancelled":2,
                     "byDay":[{"date":"2026-11-09","count":3},{"date":"2026-11-10","count":4},{"date":"2026-11-11","count":5},
                              {"date":"2026-11-12","count":4},{"date":"2026-11-13","count":6},{"date":"2026-11-14","count":14},{"date":"2026-11-15","count":0}]},
           "rentals":{"pickedUp":36,"returned":31,"late":{"current":4,"previous":1,"growth":300},"notPickedUp":2},
           "products":{"hot":[{"productId":7,"name":"Áo dài cưới đỏ","rentals":9,"sales":0,"revenue":3600000},
                              {"productId":8,"name":"Giày","rentals":0,"sales":3,"revenue":900000}],"notRented":12},
           "customers":{"total":30,"new":18,"returning":12,"returningShare":55}},
          "content":{"summary":"Tuần đông hơn.","actions":["Một","  ","Hai",null,"Ba"],"revenueNote":"R","ordersNote":"","productsNote":null}}}
    """.trimIndent()

    @Test fun parsesAReadySummaryAndIgnoresUnknownKeys() {
        val s = WeeklySummaryLogic.fromJson(JSONObject(ready))
        assertTrue(s.available)
        assertEquals(WeeklySummaryStatus.READY, s.status)
        assertEquals(LocalDate.parse("2026-11-09"), s.weekStart)
        assertEquals(LocalDate.parse("2026-11-15"), s.weekEnd)
        assertEquals(LocalDate.parse("2026-11-23"), s.nextWeekStart)
        assertNull("JSON null is not the text \"null\"", s.branchName)
        assertEquals(Instant.parse("2026-11-16T01:12:00Z"), s.generatedAt)
        val n = s.numbers!!
        assertEquals(18_450_000.0, n.orderValue!!.current, 0.0)
        assertEquals(12.02, n.orderValue!!.growth, 0.0)
        assertEquals(3_250_000.0, n.outstanding!!, 0.0)
        assertEquals(listOf("Lê Lợi", "Võ Văn Tần"), n.branches.map { it.name })
        assertEquals(21, n.branches[0].newOrders)
        assertEquals(7, n.byDay.size)
        assertEquals(LocalDate.parse("2026-11-09"), n.byDay.first().date)
        assertEquals(4.0, n.late!!.current, 0.0)
        assertEquals(2, n.notPickedUp)
        assertEquals(30, n.customers)
        assertEquals(18, n.newCustomers)
        assertEquals(12, n.returningCustomers)
        val c = s.content!!
        assertEquals("Tuần đông hơn.", c.summary)
        assertEquals("blank and null actions dropped", listOf("Một", "Hai", "Ba"), c.actions)
        assertEquals("R", c.revenueNote)
        assertNull(c.ordersNote)
        assertNull(c.productsNote)
        assertTrue(WeeklySummaryLogic.isShowable(s))
    }

    @Test fun hotItemsCountRentalsAndSales() {
        val hot = WeeklySummaryLogic.fromJson(JSONObject(ready)).numbers!!.hot
        assertEquals(listOf(9, 3), hot.map { WeeklySummaryLogic.times(it) })
    }

    @Test fun noneAndNoOrdersAndMissingParts() {
        val none = WeeklySummaryLogic.fromJson(
            JSONObject("""{"available":true,"week":{"start":"2026-11-09","end":"2026-11-15"},"nextWeekStart":"2026-11-23","status":"NONE","branchName":"Lê Lợi","summary":null}"""),
        )
        assertEquals(WeeklySummaryStatus.NONE, none.status)
        assertEquals("Lê Lợi", none.branchName)
        assertNull(none.numbers)
        assertNull(none.content)
        assertFalse(WeeklySummaryLogic.isShowable(none))

        val empty = WeeklySummaryLogic.fromJson(
            JSONObject("""{"available":true,"status":"NO_ORDERS","summary":{"generatedAt":"2026-11-16T01:12:00.000Z","numbers":{"revenue":{"orderValue":{"current":0,"previous":0,"growth":0}}},"content":null}}"""),
        )
        assertEquals(WeeklySummaryStatus.NO_ORDERS, empty.status)
        assertNull(empty.content)
        assertTrue(WeeklySummaryLogic.isShowable(empty))
        assertTrue(empty.numbers!!.branches.isEmpty())
        assertNull("missing parts stay null, never NaN", empty.numbers!!.outstanding)

        // READY without text (should not happen) is not shown as READY
        val noText = WeeklySummaryLogic.fromJson(JSONObject("""{"available":true,"status":"READY","summary":{"content":{"summary":null}}}"""))
        assertFalse(WeeklySummaryLogic.isShowable(noText))

        // An unknown status reads as NONE; a missing `available` hides the button
        val odd = WeeklySummaryLogic.fromJson(JSONObject("""{"status":"LATER"}"""))
        assertEquals(WeeklySummaryStatus.NONE, odd.status)
        assertFalse(WeeklySummaryLogic.showsButton(odd))
    }

    @Test fun buttonAndRedDot() {
        fun s(available: Boolean, status: WeeklySummaryStatus) = WeeklySummary(available, null, null, null, status, null)
        assertFalse(WeeklySummaryLogic.showsButton(null))
        assertFalse(WeeklySummaryLogic.showsDot(null))
        assertFalse("no AI key", WeeklySummaryLogic.showsButton(s(false, WeeklySummaryStatus.NONE)))
        assertFalse(WeeklySummaryLogic.showsDot(s(false, WeeklySummaryStatus.NONE)))
        assertTrue(WeeklySummaryLogic.showsButton(s(true, WeeklySummaryStatus.NONE)))
        assertTrue("not opened this week", WeeklySummaryLogic.showsDot(s(true, WeeklySummaryStatus.NONE)))
        assertFalse(WeeklySummaryLogic.showsDot(s(true, WeeklySummaryStatus.READY)))
        assertFalse(WeeklySummaryLogic.showsDot(s(true, WeeklySummaryStatus.NO_ORDERS)))
    }

    @Test fun percentBadgeRoundsAndHidesZero() {
        fun c(growth: Double) = WeeklyChange(1.0, 1.0, growth)
        assertEquals(WeeklyBadge("▲12%", WeeklyTone.GOOD), WeeklySummaryLogic.percentBadge(c(12.02)))
        assertEquals(WeeklyBadge("▲9%", WeeklyTone.GOOD), WeeklySummaryLogic.percentBadge(c(8.57)))
        assertEquals(WeeklyBadge("▼5%", WeeklyTone.BAD), WeeklySummaryLogic.percentBadge(c(-4.6)))
        assertNull("rounds to 0", WeeklySummaryLogic.percentBadge(c(0.4)))
        assertNull(WeeklySummaryLogic.percentBadge(c(0.0)))
        assertNull(WeeklySummaryLogic.percentBadge(null))
        // Late returns: up is bad
        assertEquals(WeeklyBadge("▲300%", WeeklyTone.BAD), WeeklySummaryLogic.percentBadge(c(300.0), upIsBad = true))
        assertEquals(WeeklyBadge("▼50%", WeeklyTone.GOOD), WeeklySummaryLogic.percentBadge(c(-50.0), upIsBad = true))
    }

    @Test fun countBadgeIsTheDifference() {
        assertEquals(WeeklyBadge("▲5", WeeklyTone.GOOD), WeeklySummaryLogic.countBadge(WeeklyChange(42.0, 37.0, 13.51)))
        assertEquals(WeeklyBadge("▼3", WeeklyTone.BAD), WeeklySummaryLogic.countBadge(WeeklyChange(7.0, 10.0, -30.0)))
        assertNull(WeeklySummaryLogic.countBadge(WeeklyChange(4.0, 4.0, 0.0)))
        // Late returns 1 → 4: red ▲3; 4 → 1: green ▼3
        assertEquals(WeeklyBadge("▲3", WeeklyTone.BAD), WeeklySummaryLogic.countBadge(WeeklyChange(4.0, 1.0, 300.0), upIsBad = true))
        assertEquals(WeeklyBadge("▼3", WeeklyTone.GOOD), WeeklySummaryLogic.countBadge(WeeklyChange(1.0, 4.0, -75.0), upIsBad = true))
    }

    @Test fun dayBarsMarkTheBusiestDay() {
        val n = WeeklySummaryLogic.fromJson(JSONObject(ready)).numbers!!
        val bars = WeeklySummaryLogic.dayBars(n.byDay, vi)
        assertEquals(vi, bars.map { it.label })
        assertEquals(listOf(false, false, false, false, false, true, false), bars.map { it.top })
        assertEquals(1.0, bars[5].ratio, 0.0)
        assertEquals(3.0 / 14, bars[0].ratio, 1e-9)
        assertTrue("a zero day keeps a stub", bars[6].ratio > 0)
        // Two busiest days are both solid; a week of zeros has no solid bar
        val tie = WeeklySummaryLogic.dayBars(listOf(WeeklyDayCount(LocalDate.parse("2026-11-09"), 2), WeeklyDayCount(LocalDate.parse("2026-11-10"), 2)), en)
        assertEquals(listOf(true, true), tie.map { it.top })
        val zero = WeeklySummaryLogic.dayBars(listOf(WeeklyDayCount(LocalDate.parse("2026-11-09"), 0)), en)
        assertFalse(zero.single().top)
        assertEquals("Mon", zero.single().label)
    }

    @Test fun dayLabelsUseTheAppWeekdaysAndTheShopZone() {
        for (id in listOf("Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles")) {
            TimeZone.setDefault(TimeZone.getTimeZone(id))
            val s = WeeklySummaryLogic.fromJson(JSONObject(ready))
            assertEquals(id, "T2 09/11 – CN 15/11", WeeklySummaryLogic.weekLabel(s.weekStart, s.weekEnd, vi))
            assertEquals(id, "Mon 09/11 – Sun 15/11", WeeklySummaryLogic.weekLabel(s.weekStart, s.weekEnd, en))
            // 01:12 UTC is 08:12 in Vietnam, whatever the phone zone
            assertEquals(id, "T2 16/11 08:12", WeeklySummaryLogic.writtenAt(s.generatedAt!!, vi))
            assertEquals(id, "T2 23/11", WeeklySummaryLogic.dayLabel(s.nextWeekStart!!, vi))
        }
        // 23:30 UTC on Sunday is already Monday in Vietnam
        assertEquals("T2 16/11 06:30", WeeklySummaryLogic.writtenAt(Instant.parse("2026-11-15T23:30:00Z"), vi))
        assertEquals("", WeeklySummaryLogic.weekLabel(null, LocalDate.parse("2026-11-15"), vi))
    }

    @Test fun joinedFigures() {
        assertEquals("38 · 4 · 2", WeeklySummaryLogic.joined(38, 4, 2))
        assertEquals("36 · —", WeeklySummaryLogic.joined(36, null))
    }

    @Test fun pathSendsTheShopZone() {
        assertEquals("/api/analytics/weekly-summary?timeZone=Asia%2FHo_Chi_Minh", WeeklySummaryLogic.path())
    }
}
