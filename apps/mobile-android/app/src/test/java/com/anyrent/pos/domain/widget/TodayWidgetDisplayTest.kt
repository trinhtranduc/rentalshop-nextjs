package com.anyrent.pos.domain.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.util.TimeZone

/** #1381: what the Android widget draws; the same cases as iOS `TodayWidgetDisplayTests` */
class TodayWidgetDisplayTest {
    private val morning = Instant.parse("2026-10-31T02:00:00Z")

    private fun make(s: TodayWidgetSnapshot?, now: Instant = morning, rowLimit: Int = 3, userId: Int? = 7) =
        TodayWidgetDisplay.make(s, userId, now, rowLimit, viLabels)

    // --- Vietnam day ---

    @Test
    fun theVietnamDayTurnsAt1700Utc_whateverZoneThePhoneIsIn() {
        val saved = TimeZone.getDefault()
        try {
            for (zone in listOf("UTC", "Asia/Ho_Chi_Minh", "Asia/Tokyo", "America/Los_Angeles")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone))
                assertEquals(zone, "2026-10-31", TodayWidgetClock.dayKey(Instant.parse("2026-10-31T16:59:59Z")))
                assertEquals(zone, "2026-11-01", TodayWidgetClock.dayKey(Instant.parse("2026-10-31T17:00:00Z")))
                val s = snapshot(counts = TodayWidgetCounts(1, 0, 0), rows = listOf(row()))
                assertEquals(zone, TodayWidgetDisplay.Kind.WORK, make(s, Instant.parse("2026-10-31T16:59:59Z")).kind)
                assertEquals(zone, TodayWidgetDisplay.Kind.STALE, make(s, Instant.parse("2026-10-31T17:00:00Z")).kind)
            }
        } finally {
            TimeZone.setDefault(saved)
        }
    }

    @Test
    fun nextMidnightIs1700Utc() {
        assertEquals(Instant.parse("2026-10-31T17:00:00Z"), TodayWidgetClock.nextMidnight(Instant.parse("2026-10-31T16:59:59Z")))
        assertEquals(Instant.parse("2026-11-01T17:00:00Z"), TodayWidgetClock.nextMidnight(Instant.parse("2026-10-31T17:00:00Z")))
    }

    @Test
    fun clockTextsAreVietnamTime() {
        assertEquals("08:12", TodayWidgetClock.timeText(Instant.parse("2026-10-31T01:12:00Z")))
        assertEquals("31/10", TodayWidgetClock.dayMonthText(Instant.parse("2026-10-31T16:59:59Z")))
        assertEquals("01/11", TodayWidgetClock.dayMonthText(Instant.parse("2026-10-31T17:00:00Z")))
    }

    @Test
    fun aDayOnlyOrderHasNoTime() {
        assertEquals("", TodayWidgetClock.timeOfDayText(Instant.parse("2026-10-30T17:00:00Z")))
        assertEquals("14:00", TodayWidgetClock.timeOfDayText(Instant.parse("2026-10-31T07:00:00Z")))
    }

    // --- States ---

    @Test
    fun signedOutIsLoggedOutEvenWhenAFileIsLeft() {
        assertEquals(TodayWidgetDisplay.Kind.LOGGED_OUT, make(null, userId = null).kind)
        val left = make(snapshot(counts = TodayWidgetCounts(1, 0, 0), rows = listOf(row())), userId = null)
        assertEquals(TodayWidgetDisplay.Kind.LOGGED_OUT, left.kind)
        assertTrue(left.lines.isEmpty())
        assertEquals("AnyRent", left.title)
    }

    @Test
    fun signedInWithNoFileYetSaysUpdateNotSignIn() {
        val display = make(null)
        assertEquals(TodayWidgetDisplay.Kind.STALE, display.kind)
        assertNull(display.staleDetail)
    }

    @Test
    fun anotherAccountsFileIsNeverShown() {
        val display = make(snapshot(userId = 99, counts = TodayWidgetCounts(1, 0, 0), rows = listOf(row())), userId = 7)
        assertEquals(TodayWidgetDisplay.Kind.STALE, display.kind)
        assertTrue(display.lines.isEmpty())
    }

    @Test
    fun noAccess() {
        assertEquals(TodayWidgetDisplay.Kind.NO_ACCESS, make(snapshot(state = TodayWidgetSnapshot.State.NO_ACCESS)).kind)
    }

    @Test
    fun staleKeepsNoLinesAndSaysWhen() {
        val s = snapshot(
            date = "2026-10-30", savedAt = Instant.parse("2026-10-30T10:40:00Z"),
            counts = TodayWidgetCounts(1, 2, 3), rows = listOf(row()),
        )
        val display = make(s)
        assertEquals(TodayWidgetDisplay.Kind.STALE, display.kind)
        assertTrue(display.lines.isEmpty())
        assertEquals("Danh sách lần cuối: hôm qua 17:40", display.staleDetail)
    }

    @Test
    fun staleOlderThanYesterdaySaysTheDay() {
        val s = snapshot(date = "2026-10-29", savedAt = Instant.parse("2026-10-29T10:40:00Z"))
        assertEquals("Danh sách lần cuối: 29/10 17:40", make(s).staleDetail)
    }

    @Test
    fun emptyWithAndWithoutTomorrow() {
        val plain = make(snapshot())
        assertEquals(TodayWidgetDisplay.Kind.EMPTY, plain.kind)
        assertNull(plain.tomorrowText)
        val tomorrow = make(snapshot(counts = TodayWidgetCounts(0, 0, 0, tomorrowPickup = 2, tomorrowReturn = 1)))
        assertEquals("Mai có 2 giao, 1 trả", tomorrow.tomorrowText)
        assertNull(make(snapshot(counts = TodayWidgetCounts(0, 0, 0, tomorrowPickup = 0, tomorrowReturn = 0))).tomorrowText)
    }

    @Test
    fun allDoneOnlyWhenSomethingWasDone() {
        val display = make(snapshot(done = 10))
        assertEquals(TodayWidgetDisplay.Kind.ALL_DONE, display.kind)
        assertEquals("Xong hết 10/10", display.allDoneText)
        assertEquals(TodayWidgetDisplay.Kind.EMPTY, make(snapshot(done = 0)).kind)
    }

    // --- Rows ---

    @Test
    fun countsAreTheApisAndMoreIsTotalMinusShown() {
        val rows = (1..8).map { row(orderId = it) }
        val display = make(snapshot(done = 4, counts = TodayWidgetCounts(1, 60, 2), rows = rows))
        assertEquals(3, display.lines.size)
        assertEquals("+60 việc khác", display.moreText)
        assertEquals(67, display.total)
        assertEquals("4/67", display.progressText)
    }

    @Test
    fun noMoreWhenEveryJobShows() {
        assertNull(make(snapshot(counts = TodayWidgetCounts(0, 1, 0), rows = listOf(row()))).moreText)
    }

    @Test
    fun smallWidgetHasNoLinesAndNoMore() {
        val display = make(snapshot(counts = TodayWidgetCounts(1, 2, 3), rows = listOf(row())), rowLimit = 0)
        assertTrue(display.lines.isEmpty())
        assertNull(display.moreText)
    }

    @Test
    fun footerReadsLikeIos() {
        val rows = (1..2).map { row(orderId = it) }
        val display = make(snapshot(done = 4, counts = TodayWidgetCounts(1, 3, 2), rows = rows), rowLimit = 2)
        assertEquals("xong 4/10 · +4 việc khác · cập nhật 08:12", display.footerText)
    }

    @Test
    fun aLateRowIsTheLateChipWithItsDays() {
        val line = TodayWidgetDisplay.line(row(isLate = true, lateDays = 3, planDay = "28/10/26"), viLabels, hideNames = false)
        assertEquals(TodayWidgetDisplay.Chip.LATE, line.chip)
        assertEquals("TRỄ", line.chipText)
        assertEquals("Trễ 3 ngày", line.rightText)
        assertTrue(line.rightIsLate)
        assertEquals("Lấy 28/10/26", line.dayText)
    }

    @Test
    fun aLateReturnSaysItsReturnDay() {
        val line = TodayWidgetDisplay.line(
            row(kind = TodayWidgetRow.Kind.RETURN, isLate = true, lateDays = 1, planDay = "30/10/26"), viLabels, hideNames = false,
        )
        assertEquals("Trả 30/10/26", line.dayText)
    }

    @Test
    fun todayRowsSayTodayWithTheTimeOnlyWhenThereIsOne() {
        val withTime = TodayWidgetDisplay.line(row(planTime = "14:00"), viLabels, hideNames = false)
        assertEquals("GIAO", withTime.chipText)
        assertEquals(TodayWidgetDisplay.Chip.PICKUP, withTime.chip)
        assertEquals("Hôm nay · 14:00", withTime.rightText)
        assertFalse(withTime.rightIsLate)
        val back = TodayWidgetDisplay.line(row(kind = TodayWidgetRow.Kind.RETURN), viLabels, hideNames = false)
        assertEquals("TRẢ", back.chipText)
        assertEquals(TodayWidgetDisplay.Chip.RETURN, back.chip)
        assertEquals("Hôm nay", back.rightText)
    }

    @Test
    fun notPreparedOnlyOnAHandOverAndItBeatsTheDay() {
        val out = TodayWidgetDisplay.line(row(notPrepared = true, isLate = true, lateDays = 1, planDay = "30/10/26"), viLabels, false)
        assertEquals("Chưa soạn đồ", out.warningText)
        assertNull(out.dayText)
        assertNull(TodayWidgetDisplay.line(row(kind = TodayWidgetRow.Kind.RETURN, notPrepared = true), viLabels, false).warningText)
    }

    @Test
    fun productWithTheCountOfTheOthers() {
        assertEquals("Áo dài gấm đỏ +1", TodayWidgetDisplay.line(row(moreCount = 1), viLabels, false).productText)
        assertEquals("Áo dài gấm đỏ", TodayWidgetDisplay.line(row(), viLabels, false).productText)
        assertEquals("", TodayWidgetDisplay.line(row(product = "", moreCount = 2), viLabels, false).productText)
    }

    @Test
    fun hiddenNamesDoNotReachTheLine() {
        val line = TodayWidgetDisplay.line(row(name = "Chị Diệu"), viLabels, hideNames = true)
        assertEquals("", line.name)
        assertEquals("Áo dài gấm đỏ", line.productText)
    }

    @Test
    fun theLinkOfARowIsItsNumericOrder() {
        assertEquals("anyrent://order/490268", TodayWidgetDisplay.line(row(), viLabels, false).url)
        assertEquals("anyrent://todo", TodayWidgetLink.TODO_URL)
    }

    @Test
    fun progressIsClamped() {
        assertEquals(0.4, make(snapshot(done = 4, counts = TodayWidgetCounts(1, 3, 2), rows = listOf(row()))).progress, 0.001)
        assertEquals(0.0, make(snapshot()).progress, 0.001)
    }
}
