package com.anyrent.pos.domain.attendance

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.Locale

/** #927 the big clock card at the top of Cài đặt (mockup "phương án L") */
class AttendanceCardTest {
    private val vi = Locale("vi")
    private val today = LocalDate.parse("2026-10-13")
    private val morning = AttendanceShift("Ca sáng", "08:00", "12:00")
    private val afternoon = AttendanceShift("Ca chiều", "13:00", "17:00")

    @Test
    fun required_is_read_and_missing_means_required() {
        assertTrue(AttendanceLogic.me(JSONObject("""{"enabled":true,"today":{"status":"NOT_STARTED"}}""")).required)
        assertTrue(AttendanceLogic.me(JSONObject("""{"required":true}""")).required)
        assertFalse(AttendanceLogic.me(JSONObject("""{"required":false}""")).required)
        // A wrong type is not a "no"
        assertTrue(AttendanceLogic.me(JSONObject("""{"required":"false"}""")).required)
        assertTrue(AttendanceLogic.me(null).required)
    }

    @Test
    fun card_shows_only_with_the_module_and_required() {
        val on = setOf(ATTENDANCE_MODULE)
        val required = AttendanceLogic.me(JSONObject("""{"required":true}"""))
        val notRequired = AttendanceLogic.me(JSONObject("""{"required":false}"""))
        val oldApi = AttendanceLogic.me(JSONObject("""{"enabled":true}"""))
        assertTrue(AttendanceCard.visible(on, required))
        assertTrue(AttendanceCard.visible(on, oldApi))
        assertFalse(AttendanceCard.visible(on, notRequired))
        assertFalse(AttendanceCard.visible(emptySet(), required))
        // `me` not loaded yet or failed: no card (Cài đặt as before)
        assertFalse(AttendanceCard.visible(on, null))
    }

    @Test
    fun not_in_shows_the_shop_clock_and_every_shift_of_the_day() {
        val now = Instant.parse("2026-10-13T00:57:00Z") // 07:57 VN
        val me = AttendanceMe(null, listOf(morning, afternoon), null, null, apiStatus = "NOT_STARTED")
        val card = AttendanceCard.state(me, emptyList(), now, vi)
        assertEquals(ClockCardKind.IDLE, card.kind)
        assertEquals("07:57", card.big)
        assertEquals(AttendanceStatus.NOT_IN, card.status)
        assertEquals(
            "T3 13/10 · Ca sáng 08:00–12:00, Ca chiều 13:00–17:00 · Chi nhánh chính · chưa vào ca",
            AttendanceCard.idleLine("T3 13/10", card.shifts, "Chi nhánh chính", "chưa vào ca"),
        )
        // No shift today, no branch name: the parts that exist
        assertEquals("T3 13/10 · chưa vào ca", AttendanceCard.idleLine("T3 13/10", emptyList(), null, "chưa vào ca"))
        assertEquals("T3 13/10 · Chi nhánh chính · chưa vào ca", AttendanceCard.idleLine("T3 13/10", emptyList(), " Chi nhánh chính ", "chưa vào ca"))
    }

    @Test
    fun in_shift_counts_the_time_worked_and_names_the_linked_shift() {
        val inAt = Instant.parse("2026-10-13T00:58:00Z") // 07:58 VN
        val me = AttendanceMe(
            AttendanceRecord(4, inAt, null, "OPEN", null, null), listOf(morning, afternoon), "IN", inAt, apiStatus = "IN_SHIFT",
        )
        val card = AttendanceCard.state(me, emptyList(), Instant.parse("2026-10-13T03:42:30Z"), vi) // 10:42:30 VN
        assertEquals(ClockCardKind.IN_SHIFT, card.kind)
        assertEquals("2:44", card.big)
        assertEquals("07:58", card.checkIn)
        assertEquals(morning, card.shift)
        // Ticking: one minute later the big number moves
        assertEquals("2:45", AttendanceCard.state(me, emptyList(), Instant.parse("2026-10-13T03:43:00Z"), vi).big)
        // An afternoon check-in links the afternoon shift
        val pm = Instant.parse("2026-10-13T05:55:00Z") // 12:55 VN
        val meAfternoon = me.copy(openRecord = AttendanceRecord(5, pm, null, "OPEN", null, null))
        assertEquals(afternoon, AttendanceCard.state(meAfternoon, emptyList(), pm, vi).shift)
        // No shift today: none named
        assertNull(AttendanceCard.state(me.copy(todayShifts = emptyList()), emptyList(), pm, vi).shift)
    }

    @Test
    fun elapsed_is_hours_and_two_digit_minutes_never_negative() {
        val from = Instant.parse("2026-10-13T00:00:00Z")
        assertEquals("0:00", AttendanceCard.elapsed(from, from.minusSeconds(30)))
        assertEquals("0:59", AttendanceCard.elapsed(from, from.plusSeconds(59 * 60 + 59)))
        assertEquals("10:05", AttendanceCard.elapsed(from, from.plusSeconds(10 * 3600 + 5 * 60)))
    }

    @Test
    fun done_shows_the_day_total_and_today_pairs() {
        val now = Instant.parse("2026-10-13T10:10:00Z") // 17:10 VN
        val me = AttendanceMe(null, listOf(morning, afternoon), "OUT", Instant.parse("2026-10-13T10:05:00Z"), apiStatus = "DONE")
        val pairs = listOf(
            WorkedPair(Instant.parse("2026-10-13T00:58:00Z"), Instant.parse("2026-10-13T05:01:00Z"), false, null, 0),
            WorkedPair(Instant.parse("2026-10-13T06:00:00Z"), Instant.parse("2026-10-13T10:05:00Z"), false, null, 0),
        )
        val card = AttendanceCard.state(me, pairs, now, vi)
        assertEquals(ClockCardKind.DONE, card.kind)
        assertEquals("8,1", card.big)
        assertEquals("07:58–12:01, 13:00–17:05", card.pairs)
        // DONE but the day's records could not be read: the clock, as "not in", with status "đã xong"
        val fallback = AttendanceCard.state(me, emptyList(), now, vi)
        assertEquals(ClockCardKind.IDLE, fallback.kind)
        assertEquals("17:10", fallback.big)
        assertEquals(AttendanceStatus.DONE, fallback.status)
    }

    @Test
    fun today_pairs_are_the_vn_day_of_the_month_rows() {
        val rows = JSONArray(
            """[
            {"recordId":1,"kind":"IN","result":"ACCEPTED","at":"2026-10-12T01:00:00Z"},
            {"recordId":1,"kind":"OUT","result":"ACCEPTED","at":"2026-10-12T05:00:00Z"},
            {"recordId":2,"kind":"IN","result":"ACCEPTED","at":"2026-10-13T00:58:00Z"},
            {"recordId":2,"kind":"OUT","result":"ACCEPTED","at":"2026-10-13T05:01:00Z"}
            ]""",
        )
        val pairs = AttendanceCard.todayPairs(AttendanceLogic.pairs(rows), today)
        assertEquals(1, pairs.size)
        assertEquals("07:58–12:01", AttendanceLogic.pairTimes(pairs))
    }

    @Test
    fun not_required_refusal_is_its_own_kind() {
        assertEquals(PunchRejectionKind.NOT_REQUIRED, AttendanceLogic.rejection("ATTENDANCE_NOT_REQUIRED", null, "x").kind)
    }
}
