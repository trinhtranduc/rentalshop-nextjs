package com.anyrent.pos.domain.widget

import com.anyrent.pos.data.repository.todayWorkFromJson
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRow
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #1381: from the answer of outlet-operations to the widget's file */
class TodayWidgetDataTest {
    private val now = Instant.parse("2026-10-31T02:00:00Z")

    private fun make(work: TodayWork, hideNames: Boolean = false) =
        TodayWidgetData.snapshot(work, userId = 7, outletId = 5, hideNames = hideNames, now = now)

    private val full = TodayWork(
        date = "2026-10-31",
        doneToday = 4,
        pickupsToday = listOf(
            TodayWorkRow(
                id = 11, orderNumber = "100011", customerName = "Chị Diệu", customerPhone = "0912345678",
                pickupPlanAt = Instant.parse("2026-10-31T07:00:00Z"), returnPlanAt = Instant.parse("2026-11-02T07:00:00Z"),
                firstItemName = "Áo dài gấm đỏ", itemCount = 2, totalAmount = 550000.0, amountDue = 575000.0,
            ),
        ),
        pickupsCount = 60,
        returnsToday = listOf(
            TodayWorkRow(
                id = 12, orderNumber = "100012", customerName = "Cô Hạnh", isReadyToDeliver = true,
                pickupPlanAt = Instant.parse("2026-10-29T17:00:00Z"), returnPlanAt = Instant.parse("2026-10-30T17:00:00Z"),
                firstItemName = "Vest xanh than", itemCount = 1,
            ),
        ),
        returnsCount = 1,
        noShows = listOf(
            TodayWorkRow(
                id = 13, orderNumber = "100013", customerName = "Anh Tâm", isReadyToDeliver = true, lateDays = 1,
                pickupPlanAt = Instant.parse("2026-10-29T17:00:00Z"), firstItemName = "Áo cưới ren", itemCount = 1,
            ),
        ),
        noShowsCount = 1,
        overdueReturns = listOf(
            TodayWorkRow(
                id = 14, orderNumber = "100014", customerName = "Anh Long", isReadyToDeliver = true, lateDays = 3,
                returnPlanAt = Instant.parse("2026-10-27T17:00:00Z"), firstItemName = "Khăn đóng", itemCount = 1,
            ),
        ),
        overdueCount = 1,
        tomorrowPickups = emptyList(),
        tomorrowPickupsCount = 2,
        tomorrowReturns = emptyList(),
        tomorrowReturnsCount = 1,
        installmentsDue = listOf(TodayWorkRow(id = 15, orderNumber = "100015", stageLabel = "Cọc 2", stageKey = "i2")),
        installmentsOverdue = listOf(TodayWorkRow(id = 16, orderNumber = "100016", stageLabel = "Cọc 1", stageKey = "i1", lateDays = 9)),
    )

    @Test
    fun lateFirstMostLateFirst_thenHandOvers_thenReturns_noDepositStages() {
        assertEquals(listOf(14, 13, 11, 12), make(full).rows.map { it.orderId })
    }

    @Test
    fun countsAreTheApisNotTheRows() {
        val counts = make(full).counts
        assertEquals(2, counts.late)
        assertEquals(60, counts.pickup)
        assertEquals(1, counts.returns)
        assertEquals(2, counts.tomorrowPickup)
        assertEquals(1, counts.tomorrowReturn)
        assertEquals(63, counts.total)
    }

    @Test
    fun anOlderApiWithoutTomorrowHasNoTomorrow() {
        val counts = make(TodayWork(date = "2026-10-31")).counts
        assertNull(counts.tomorrowPickup)
        assertNull(counts.tomorrowReturn)
    }

    @Test
    fun atMostEightRows() {
        val many = (1..50).map { TodayWorkRow(id = it, orderNumber = "$it") }
        assertEquals(8, make(TodayWork(date = "2026-10-31", pickupsToday = many, pickupsCount = 50)).rows.size)
    }

    @Test
    fun theDayIsTheApisAndFallsBackToTheVietnamDay() {
        assertEquals("2026-10-31", make(full).date)
        assertEquals("2026-11-01", TodayWidgetData.snapshot(TodayWork(), 7, 5, false, Instant.parse("2026-10-31T17:00:00Z")).date)
    }

    @Test
    fun doneIsDoneToday() {
        assertEquals(4, make(full).done)
    }

    @Test
    fun rowFields() {
        val rows = make(full).rows
        val handOver = rows.first { it.orderId == 11 }
        assertEquals(TodayWidgetRow.Kind.PICKUP, handOver.kind)
        assertFalse(handOver.isLate)
        assertEquals("Chị Diệu", handOver.name)
        assertEquals("Áo dài gấm đỏ", handOver.product)
        assertEquals(1, handOver.moreCount)
        assertTrue(handOver.notPrepared)
        assertEquals("14:00", handOver.planTime)
        assertEquals("31/10/26", handOver.planDay)
        val back = rows.first { it.orderId == 12 }
        assertEquals(TodayWidgetRow.Kind.RETURN, back.kind)
        assertFalse(back.notPrepared)
        assertEquals("", back.planTime)
        val late = rows.first { it.orderId == 14 }
        assertTrue(late.isLate)
        assertEquals(3, late.lateDays)
        assertEquals("28/10/26", late.planDay)
    }

    @Test
    fun hideNamesRemovesTheNameFromTheFile() {
        val s = make(full, hideNames = true)
        assertTrue(s.hideNames)
        assertTrue(s.rows.all { it.name.isEmpty() })
        assertFalse(s.toJson().contains("Diệu"))
        assertEquals("Áo dài gấm đỏ", s.rows.first { it.orderId == 11 }.product)
    }

    @Test
    fun withoutNamesStripsAnExistingFile() {
        val s = make(full).withoutNames()
        assertTrue(s.hideNames)
        assertTrue(s.rows.all { it.name.isEmpty() })
    }

    @Test
    fun theFileHasNoMoneyPhoneOrToken() {
        val json = make(full).toJson()
        assertFalse(json.contains("0912345678"))
        assertFalse(json.contains("575000"))
        assertFalse(json.contains("550000"))
        val keys = mutableSetOf<String>()
        fun walk(o: JSONObject) {
            o.keys().forEach { key ->
                keys += key
                o.optJSONObject(key)?.let(::walk)
                o.optJSONArray(key)?.let { a -> (0 until a.length()).forEach { i -> a.optJSONObject(i)?.let(::walk) } }
            }
        }
        walk(JSONObject(json))
        val banned = listOf("token", "phone", "amount", "price", "total", "due", "deposit", "image", "photo", "password")
        // `counts.total` is not stored; nothing about money or credentials is
        keys.forEach { key -> banned.forEach { word -> assertFalse("$key has $word", key.lowercase().contains(word)) } }
    }

    @Test
    fun jsonRoundTrip() {
        val s = make(full)
        assertEquals(s, TodayWidgetSnapshot.fromJson(s.toJson()))
    }

    @Test
    fun aFileThatCannotBeReadIsNoFile() {
        assertNull(TodayWidgetSnapshot.fromJson("not json"))
        assertNull(TodayWidgetSnapshot.fromJson("{}"))
        assertNull(TodayWidgetSnapshot.fromJson(make(full).toJson().replace("\"v\":1", "\"v\":999")))
    }

    // --- The API answer ---

    private val answer = """
        {"date":"2026-10-31",
         "doneToday":{"pickups":3,"returns":1},
         "pickupsToday":{"count":60,"orders":[{"id":11,"orderNumber":"100011","customerName":"Chị Diệu","customerPhone":"0912345678",
            "pickupPlanAt":"2026-10-31T07:00:00.000Z","returnPlanAt":"2026-11-02T07:00:00.000Z","isReadyToDeliver":false,
            "items":[{"name":"Áo dài gấm đỏ","quantity":2},{"name":"Khăn","quantity":1}],"totalAmount":550000,"amountDue":575000,"lateDays":0}]},
         "returnsToday":{"count":1,"orders":[{"id":12,"orderNumber":"100012","productNames":"Vest xanh than, Cà vạt","lateDays":0}]},
         "overdueReturns":{"count":2,"orders":[]},
         "noShows":{"count":3,"orders":[]},
         "tomorrowPickups":{"count":5,"orders":[]},
         "tomorrowReturns":{"count":6,"orders":[]}}
    """.trimIndent()

    @Test
    fun theApiAnswerGivesTheWidgetFields() {
        val work = todayWorkFromJson(JSONObject(answer))
        assertEquals("2026-10-31", work.date)
        assertEquals(4, work.doneToday)
        assertEquals(60, work.pickupsCount)
        assertEquals(1, work.returnsCount)
        assertEquals(2, work.overdueCount)
        assertEquals(3, work.noShowsCount)
        assertEquals(5, work.tomorrowPickupsCount)
        assertEquals(6, work.tomorrowReturnsCount)
        val first = work.pickupsToday.single()
        assertEquals("Áo dài gấm đỏ", first.firstItemName)
        assertEquals(2, first.itemCount)
        // The tab's own text keeps the quantity
        assertEquals("Áo dài gấm đỏ ×2, Khăn", first.productNames)
        val back = work.returnsToday.single()
        assertEquals("Vest xanh than", back.firstItemName)
        assertEquals(2, back.itemCount)
    }

    @Test
    fun anOlderApiAnswerStillReads() {
        val work = todayWorkFromJson(JSONObject("""{"pickupsToday":{"orders":[{"id":1}]}}"""))
        assertNull(work.date)
        assertEquals(0, work.doneToday)
        assertEquals(1, work.pickupsCount)
        assertNull(work.tomorrowPickupsCount)
        assertNotNull(work.pickupsToday.single())
    }
}
