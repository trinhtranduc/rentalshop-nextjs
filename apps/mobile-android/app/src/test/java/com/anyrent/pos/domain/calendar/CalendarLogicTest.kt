package com.anyrent.pos.domain.calendar

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.YearMonth

/** #374 — calendar grid, marks from byDate / lateReturns, day rows, parsing */
class CalendarLogicTest {
    @Test
    fun october2026GridStartsOnMonday() {
        val grid = CalendarLogic.monthGrid(YearMonth.of(2026, 10), "2026-10-03")
        assertEquals(35, grid.size)
        assertEquals(listOf("2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"), grid.take(4).map { it.key })
        assertFalse(grid[0].inMonth)
        assertTrue(grid[3].inMonth)
        assertEquals(31, grid.count { it.inMonth })
        assertEquals(listOf("2026-10-03"), grid.filter { it.isToday }.map { it.key })
        assertEquals("2026-11-01", grid.last().key)
    }

    @Test
    fun gridAcrossYearAndLeapFebruary() {
        val feb2027 = CalendarLogic.monthGrid(YearMonth.of(2027, 2), "2027-02-10")
        assertEquals(28, feb2027.size)
        assertEquals("2027-02-01", feb2027.first().key)
        val feb2028 = CalendarLogic.monthGrid(YearMonth.of(2028, 2), "2028-02-29")
        assertEquals(29, feb2028.count { it.inMonth })
        assertEquals("2028-01-31", feb2028.first().key)
        val jan = CalendarLogic.monthGrid(YearMonth.of(2027, 1), "2026-12-31")
        assertEquals("2026-12-28", jan.first().key)
        assertEquals(listOf("2026-12-31"), jan.filter { it.isToday }.map { it.key })
    }

    @Test
    fun defaultSelection() {
        assertEquals("2026-10-03", CalendarLogic.defaultSelection(YearMonth.of(2026, 10), "2026-10-03"))
        assertEquals("2026-11-01", CalendarLogic.defaultSelection(YearMonth.of(2026, 11), "2026-10-03"))
    }

    @Test
    fun marksFromByDate() {
        val counts = CalendarLogic.countsFromJson(
            JSONObject(
                """{"countByDate":{"2026-10-01":1},"total":1,
                "byDate":{"2026-10-01":{"pickups":0,"returns":1},"2026-10-03":{"pickups":2,"returns":1},
                          "2026-10-05":{"pickups":3,"returns":0},"2026-10-06":{"pickups":0,"returns":0}},
                "lateReturns":4}""",
            ),
        )
        assertEquals(4, counts.lateReturns)
        val today = "2026-10-03"
        assertEquals(CalendarDayMarks(lateReturn = true), CalendarLogic.marks("2026-10-01", counts, today))
        assertEquals(CalendarDayMarks(handOver = true, returning = true), CalendarLogic.marks(today, counts, today))
        assertEquals(CalendarDayMarks(handOver = true), CalendarLogic.marks("2026-10-05", counts, today))
        assertEquals(CalendarDayMarks.NONE, CalendarLogic.marks("2026-10-06", counts, today))
        assertEquals(CalendarDayMarks.NONE, CalendarLogic.marks("2026-10-31", counts, today))
        assertEquals(CalendarDayMarks.NONE, CalendarLogic.marks(today, null, today))
    }

    @Test
    fun countsWithoutNewFields() {
        val old = CalendarLogic.countsFromJson(JSONObject("""{"countByDate":{"2026-10-01":3},"total":3}"""))
        assertTrue(old.byDate.isEmpty())
        assertEquals(0, old.lateReturns)
        val partial = CalendarLogic.countsFromJson(JSONObject("""{"byDate":{"2026-10-02":{"pickups":2}}}"""))
        assertEquals(CalendarDayCount(2, 0), partial.byDate["2026-10-02"])
    }

    /** #496: the dates of the row's two lines, optional */
    @Test
    fun dayRowDates() {
        val orders = CalendarLogic.dayOrdersFromJson(
            JSONObject(
                """{"orders":[{"id":5,"orderNumber":"ORD-001-0005","createdAt":"2026-10-02T03:00:00.000Z",
                   "pickupPlanAt":"2026-10-04T17:00:00.000Z","returnPlanAt":"2026-10-06T17:00:00.000Z"},
                  {"id":6,"createdAt":"bad","pickupPlanAt":null}]}""",
            ),
        )
        assertEquals(java.time.Instant.parse("2026-10-02T03:00:00Z"), orders[0].createdAt)
        assertEquals(java.time.Instant.parse("2026-10-04T17:00:00Z"), orders[0].pickupPlanAt)
        assertEquals(java.time.Instant.parse("2026-10-06T17:00:00Z"), orders[0].returnPlanAt)
        assertNull(orders[1].createdAt)
        assertNull(orders[1].pickupPlanAt)
        assertNull(orders[1].returnPlanAt)
    }

    @Test
    fun dayRowsParsingAndLateDays() {
        val orders = CalendarLogic.dayOrdersFromJson(
            JSONObject(
                """{"date":"2026-10-01","orders":[
                  {"id":5,"orderNumber":"ORD-001-0005","customerName":"James Miller","status":"PICKUPED","orderType":"RENT",
                   "totalAmount":323,"orderItems":[{"productName":"Áo dài","quantity":2},{"productName":"Cà vạt","quantity":1},{"quantity":1}]},
                  {"id":6,"customerName":null,"totalAmount":null},
                  {"orderNumber":"no id"}
                ]}""",
            ),
        )
        assertEquals(2, orders.size)
        assertEquals("Áo dài ×2, Cà vạt", orders[0].itemsSummary)
        assertNull(orders[1].customerName)
        assertEquals(0.0, orders[1].totalAmount, 0.0)
        assertEquals("", orders[1].itemsSummary)
        assertNull(orders[0].createdAt)
        assertNull(orders[1].pickupPlanAt)
        assertTrue(CalendarLogic.dayOrdersFromJson(JSONObject("{}")).isEmpty())

        val rows = CalendarLogic.rows("2026-10-01", "2026-10-03", listOf(orders[1]), listOf(orders[0]))
        assertEquals(listOf(CalendarRowKind.HAND_OVER, CalendarRowKind.TAKE_BACK), rows.map { it.kind })
        assertEquals(listOf(2, 2), rows.map { it.lateDays })
        assertEquals(0, CalendarLogic.lateDays("2026-10-05", "2026-10-03"))
        assertEquals(1, CalendarLogic.lateDays("2026-09-30", "2026-10-01"))
    }

    /** #893 (owner, calendar lean rows): the day task's date chip; hand-overs add "Sẵn sàng giao" or "Chưa soạn đồ" (iOS) */
    @Test
    fun `calendar row chips`() {
        val orders = CalendarLogic.dayOrdersFromJson(
            JSONObject(
                """{"orders":[
                {"id":1,"orderNumber":"1","totalAmount":1,"pickupPlanAt":"2026-10-13T17:30:00Z","returnPlanAt":"2026-10-16T02:00:00Z","isReadyToDeliver":true},
                {"id":2,"orderNumber":"2","totalAmount":1,"pickupPlanAt":"2026-10-13T17:30:00Z","returnPlanAt":"2026-10-16T02:00:00Z","isReadyToDeliver":false},
                {"id":3,"orderNumber":"3","totalAmount":1,"pickupPlanAt":"2026-10-13T17:30:00Z","returnPlanAt":"2026-10-16T02:00:00Z"}]}""",
            ),
        )
        assertEquals(true, orders[0].isReadyToDeliver)
        assertEquals(false, orders[1].isReadyToDeliver)
        assertNull(orders[2].isReadyToDeliver)
        val ready = CalendarLogic.rowChips(CalendarDayRow(CalendarRowKind.HAND_OVER, orders[0], 0))
        assertEquals(listOf(CalendarLogic.RowChipKind.PICKUP, CalendarLogic.RowChipKind.READY), ready.map { it.kind })
        assertEquals("14/10/26", ready[0].date)
        assertEquals(listOf(CalendarLogic.RowChipKind.PICKUP, CalendarLogic.RowChipKind.NOT_PREPARED),
            CalendarLogic.rowChips(CalendarDayRow(CalendarRowKind.HAND_OVER, orders[1], 0)).map { it.kind })
        assertEquals("older API without the flag: not prepared", listOf(CalendarLogic.RowChipKind.PICKUP, CalendarLogic.RowChipKind.NOT_PREPARED),
            CalendarLogic.rowChips(CalendarDayRow(CalendarRowKind.HAND_OVER, orders[2], 0)).map { it.kind })
        val back = CalendarLogic.rowChips(CalendarDayRow(CalendarRowKind.TAKE_BACK, orders[1], 0))
        assertEquals("a return row: only its date", listOf(CalendarLogic.RowChipKind.RETURN), back.map { it.kind })
        assertEquals("16/10/26", back[0].date)
    }

    /** #938: today's list adds the rentals still out past their return day (outlet-operations `overdueReturns`), each once */
    @Test
    fun `today lists late returns after today's rows`() {
        for (zone in listOf(java.time.ZoneId.of("Asia/Ho_Chi_Minh"), java.time.ZoneId.of("UTC"))) {
            val late = CalendarLogic.lateReturnsFromJson(
                JSONObject(
                    """{"overdueReturns":{"count":3,"orders":[
                      {"id":11,"orderNumber":"100011","customerName":"Lan","totalAmount":300,"returnPlanAt":"2026-10-09T03:00:00.000Z",
                       "lateDays":4,"items":[{"name":"Áo dài","quantity":2}]},
                      {"id":12,"orderNumber":"100012","customerName":null,"totalAmount":100,"returnPlanAt":"2026-10-12T16:30:00.000Z"},
                      {"id":5,"orderNumber":"100005","totalAmount":1,"returnPlanAt":"2026-10-12T03:00:00.000Z","lateDays":1}
                    ]}}""",
                ),
            )
            assertEquals(listOf(11, 12, 5), late.map { it.id })
            assertEquals("Áo dài ×2", late[0].itemsSummary)
            val today = "2026-10-13"
            val pickup = CalendarDayOrder(1, "100001", null, "RESERVED", "RENT", 1.0, "")
            val back = CalendarDayOrder(5, "100005", null, "PICKUPED", "RENT", 1.0, "")
            val rows = CalendarLogic.rows(today, today, listOf(pickup), listOf(back), late, zone)
            assertEquals(listOf(1, 5, 11, 12), rows.map { it.order.id })
            assertEquals(listOf(CalendarRowKind.HAND_OVER, CalendarRowKind.TAKE_BACK, CalendarRowKind.TAKE_BACK, CalendarRowKind.TAKE_BACK), rows.map { it.kind })
            // API lateDays wins; without it the Vietnam day of returnPlanAt (12/10 23:30 VN = 1 day late), whatever the zone given
            assertEquals(listOf(0, 0, 4, 1), rows.map { it.lateDays })
            assertEquals(CalendarNote.Late(4, null), CalendarLogic.note(rows[2]))
            assertEquals(listOf(1), CalendarLogic.rows("2026-10-14", today, listOf(pickup), emptyList(), late, zone).map { it.order.id })
        }
        assertTrue(CalendarLogic.lateReturnsFromJson(JSONObject("{}")).isEmpty())
    }
}
