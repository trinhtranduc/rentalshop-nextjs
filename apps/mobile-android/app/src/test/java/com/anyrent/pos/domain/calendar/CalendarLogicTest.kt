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
}
