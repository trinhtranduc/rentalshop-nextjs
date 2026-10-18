package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.util.TimeZone

/** #1059 "Đơn tạo hôm nay" (mirrors the #1059 cases of `OverviewDashLogicTests.swift`) */
class OverviewTodayOrdersTest {
    private val savedZone: TimeZone = TimeZone.getDefault()

    @After fun restore() = TimeZone.setDefault(savedZone)

    private fun inEachZone(body: (String) -> Unit) {
        for (id in listOf("Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles")) {
            TimeZone.setDefault(TimeZone.getTimeZone(id))
            body(id)
        }
    }

    private fun d(s: String) = LocalDate.parse(s)

    private fun page(json: String): List<IncomeRow> =
        OverviewRelated.pageFromJson(JSONObject("""{"days":[{"date":"2026/10/18","orders":$json}]}""")).first

    private fun report(orderValue: Double?, orders: Int?) = OverviewReport(
        netRevenue = 0.0, revenueGrowth = null, newOrders = 9, series = emptyList(), topProducts = emptyList(),
        totalOrderValue = orderValue, orderValueOrders = orders,
    )

    @Test fun topCardsHideOnlyOnARangeOfExactlyToday() {
        val today = d("2026-10-18")
        val todayRange = OverviewDashLogic.range(OverviewChip.TODAY, today)
        assertFalse(OverviewTodayOrders.showsTopCards(todayRange, today))
        assertTrue(OverviewTodayOrders.showsTodayOrders(todayRange, today))
        for (chip in listOf(OverviewChip.LAST_7, OverviewChip.THIS_MONTH)) {
            val range = OverviewDashLogic.range(chip, today)
            assertTrue("$chip", OverviewTodayOrders.showsTopCards(range, today))
            assertFalse("$chip", OverviewTodayOrders.showsTodayOrders(range, today))
        }
        // Tuỳ chọn of today alone behaves as Hôm nay; another day or a longer range keeps the Top cards
        assertFalse(OverviewTodayOrders.showsTopCards(OverviewDashLogic.range(OverviewChip.CUSTOM, today, DayRange(today, today)), today))
        assertTrue(OverviewTodayOrders.showsTopCards(OverviewDashLogic.range(OverviewChip.CUSTOM, today, DayRange(d("2026-10-17"), d("2026-10-17"))), today))
        assertTrue(OverviewTodayOrders.showsTopCards(OverviewDashLogic.range(OverviewChip.CUSTOM, today, DayRange(d("2026-10-17"), today)), today))
    }

    @Test fun summaryIsTheOrderValueTile() {
        val split = report(2_201_000.0, 8)
        val tile = OverviewDashLogic.tiles(split, null).first { it.kind == OverviewTileKind.ORDER_VALUE }
        val summary = OverviewTodayOrders.summary(split, rowsCount = 99)
        assertEquals(OverviewTodayOrdersSummary(8, 2_201_000.0), summary)
        assertEquals(tile.count?.count, summary?.count)
        assertEquals(tile.value, summary?.total)
        assertEquals(OverviewDashLogic.tileText(tile, vietnamese = true), OverviewDashLogic.compact(summary!!.total, vietnamese = true))
        // An API without orderValueByType: the non-cancelled rows count
        assertEquals(OverviewTodayOrdersSummary(2, 500_000.0), OverviewTodayOrders.summary(report(500_000.0, null), rowsCount = 2))
        assertNull(OverviewTodayOrders.summary(null, rowsCount = 2))
    }

    @Test fun rowsNewestFirstWithoutCancelledFiveAtMost() {
        val items = page(
            """[{"id":1,"orderNumber":"100001","orderType":"RENT","status":"RESERVED","customerName":"Amber","totalAmount":155000,"createdAt":"2026-10-18T02:12:00.000Z"},
             {"id":2,"orderNumber":"100002","orderType":"RENT","status":"PICKUPED","customerName":"Jason","totalAmount":189000,"createdAt":"2026-10-18T04:40:00.000Z"},
             {"id":3,"orderNumber":"100003","orderType":"SALE","status":"COMPLETED","customerName":"Kiểm Thử","totalAmount":186000,"createdAt":"2026-10-18T07:05:00.000Z"},
             {"id":4,"orderNumber":"100004","orderType":"RENT","status":"CANCELLED","customerName":"Huỷ","totalAmount":900000,"createdAt":"2026-10-18T11:59:00.000Z"},
             {"id":5,"orderNumber":"100005","orderType":"RENT","status":"RESERVED","customerName":"Sarah","totalAmount":396000,"createdAt":"2026-10-18T09:22:00.000Z"},
             {"id":6,"orderNumber":"100006","orderType":"RENT","status":"RESERVED","customerName":"Lisa","totalAmount":309000,"createdAt":"2026-10-18T11:50:00.000Z"},
             {"id":7,"orderNumber":"100007","orderType":"RENT","status":"RESERVED","customerName":"Old","totalAmount":100000,"createdAt":"2026-10-17T17:30:00.000Z"},
             {"id":6,"orderNumber":"100006","orderType":"RENT","status":"RESERVED","customerName":"Lisa","totalAmount":309000,"createdAt":"2026-10-18T11:50:00.000Z"}]""",
        )
        val rows = OverviewTodayOrders.rows(items)
        assertEquals(listOf(6, 5, 3, 2, 1), rows.map { it.id })
        assertEquals(listOf("Lisa", "Sarah", "Kiểm Thử", "Jason", "Amber"), rows.map { it.customer })
        assertEquals(listOf(309_000.0, 396_000.0, 186_000.0, 189_000.0, 155_000.0), rows.map { it.amount })
        assertEquals(listOf(true, true, false, true, true), rows.map { it.isRent })
        assertEquals(6, OverviewTodayOrders.count(items))
        assertEquals(listOf(6, 5), OverviewTodayOrders.rows(items, limit = 2).map { it.id })
        assertTrue(OverviewTodayOrders.rows(emptyList()).isEmpty())
    }

    @Test fun lineIsVietnamTimeAndKindInEveryPhoneZone() = inEachZone { zone ->
        val rows = OverviewTodayOrders.rows(
            page(
                """[{"id":6,"orderNumber":"901052","orderType":"RENT","status":"RESERVED","customerName":"Lisa","totalAmount":309000,"createdAt":"2026-10-18T11:50:00.000Z"},
                 {"id":3,"orderNumber":"#0031","orderType":"SALE","status":"COMPLETED","totalAmount":186000,"createdAt":"2026-10-17T17:05:00.000Z"},
                 {"id":2,"orderNumber":"100002","orderType":"RENT","status":"RESERVED","totalAmount":0}]""",
            ),
        )
        // 11:50Z = 18:50 in Vietnam; 17:05Z the day before = 00:05 of today
        assertEquals(zone, "#901052 · 18:50 · Thuê", OverviewTodayOrders.subtitle(rows[0], "Thuê", "Bán"))
        assertEquals(zone, "#0031 · 00:05 · Bán", OverviewTodayOrders.subtitle(rows[1], "Thuê", "Bán"))
        assertEquals(zone, "#100002", OverviewTodayOrders.numberAndTime(rows[2]))
        assertEquals(zone, "", rows[1].customer)
    }

    @Test fun pathAsksTheShopDayAndTheChosenBranch() {
        val today = d("2026-10-18")
        assertEquals(
            "/api/analytics/income/orders?startDate=2026-10-18&endDate=2026-10-18&status=new&plan=false&limit=200&offset=400" +
                "&timeZone=Asia%2FHo_Chi_Minh&outletIds=3",
            OverviewTodayOrders.path(DayRange(today, today), offset = 400, outletId = 3),
        )
    }
}
