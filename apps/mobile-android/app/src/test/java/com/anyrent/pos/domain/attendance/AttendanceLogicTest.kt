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
import java.time.YearMonth
import java.util.Locale

/** #910 attendance: parsing of the #907 answers (nullable-safe), rejections, VN week and texts */
class AttendanceLogicTest {
    @Test
    fun modules_missing_or_wrong_type_hide_the_row() {
        assertEquals(emptySet<String>(), AttendanceLogic.modules(null))
        assertEquals(emptySet<String>(), AttendanceLogic.modules(JSONObject("""{"name":"Shop"}""")))
        assertEquals(emptySet<String>(), AttendanceLogic.modules(JSONObject("""{"modules":"attendance"}""")))
        val on = AttendanceLogic.modules(JSONObject("""{"modules":["attendance", 3, null, ""]}"""))
        assertEquals(setOf("attendance"), on)
        assertTrue(AttendanceLogic.hasAttendance(on))
        assertFalse(AttendanceLogic.hasAttendance(setOf("payroll")))
    }

    @Test
    fun me_status_follows_open_record_and_last_out_of_the_vn_day() {
        val now = Instant.parse("2026-10-12T05:00:00Z") // 12:00 VN
        val open = AttendanceLogic.me(JSONObject("""{"enabled":true,"openRecord":{"id":4,"checkInAt":"2026-10-12T00:58:00.000Z"},
            "today":{"shifts":[{"name":"Ca sáng","start":"08:00","end":"12:00"}]}}"""))
        assertEquals(AttendanceStatus.IN_SHIFT, open.status(now))
        assertEquals("Ca sáng 08:00–12:00", AttendanceLogic.shiftLine(open.todayShifts.single()))
        assertEquals("Ca sáng 08:00 – 12:00", AttendanceLogic.shiftLine(open.todayShifts.single(), spaced = true))

        val done = AttendanceLogic.me(JSONObject("""{"openRecord":null,"lastAction":{"action":"OUT","at":"2026-10-12T05:01:00Z"}}"""))
        assertEquals(AttendanceStatus.DONE, done.status(now))
        // An OUT of yesterday (VN) does not count: 16:59Z on the 11th is 23:59 VN on the 11th
        val yesterday = AttendanceLogic.me(JSONObject("""{"lastAction":{"action":"OUT","at":"2026-10-11T16:59:00Z"}}"""))
        assertEquals(AttendanceStatus.NOT_IN, yesterday.status(now))
        assertEquals(AttendanceStatus.NOT_IN, AttendanceLogic.me(null).status(now))
    }

    @Test
    fun punch_answer_and_hours_minus_break() {
        val out = AttendanceLogic.punch(JSONObject("""{"action":"OUT","distanceM":12.4,"accuracyM":5,
            "record":{"id":9,"checkInAt":"2026-10-12T00:58:00Z","checkOutAt":"2026-10-12T05:01:00Z","shiftBreakMinutes":3}}"""))
        assertFalse(out.isIn)
        assertEquals(12, out.distanceM)
        assertEquals(4.0, AttendanceLogic.hours(out.record)!!, 0.001)
        assertEquals("07:58", AttendanceLogic.hhmm(out.record?.checkInAt))
        assertEquals("12:01", AttendanceLogic.hhmm(out.record?.checkOutAt))
        val apiHours = AttendanceLogic.record(JSONObject("""{"hours":3.5,"checkInAt":"2026-10-12T00:00:00Z"}"""))
        assertEquals(3.5, AttendanceLogic.hours(apiHours)!!, 0.0)
        assertNull(AttendanceLogic.hours(AttendanceLogic.record(JSONObject("""{"checkInAt":"2026-10-12T00:00:00Z"}"""))))
        assertTrue(AttendanceLogic.punch(null).isIn)
        assertEquals("4,0", AttendanceLogic.oneDecimal(4.0, Locale.forLanguageTag("vi")))
    }

    @Test
    fun rejections_carry_their_numbers() {
        val far = AttendanceLogic.rejection("OUT_OF_RANGE", JSONObject("""{"distanceM":350,"radiusM":100}"""), "x")
        assertEquals(PunchRejectionKind.OUT_OF_RANGE, far.kind)
        assertEquals(350, far.distanceM)
        assertEquals(100, far.radiusM)
        assertEquals(180, AttendanceLogic.rejection("GPS_INACCURATE", JSONObject("""{"accuracyM":180}"""), null).accuracyM)
        assertEquals(PunchRejectionKind.MOCK_LOCATION, AttendanceLogic.rejection("MOCK_LOCATION", null, null).kind)
        assertEquals(PunchRejectionKind.QR_EXPIRED, AttendanceLogic.rejection("qr_expired", null, null).kind)
        assertEquals(PunchRejectionKind.QR_WRONG_OUTLET, AttendanceLogic.rejection("QR_WRONG_OUTLET", null, null).kind)
        assertEquals(PunchRejectionKind.NOT_CONFIGURED, AttendanceLogic.rejection("ATTENDANCE_NOT_CONFIGURED", null, null).kind)
        assertEquals(PunchRejectionKind.MODULE_OFF, AttendanceLogic.rejection("MODULE_NOT_ENABLED", null, null).kind)
        val other = AttendanceLogic.rejection(null, null, "timeout")
        assertEquals(PunchRejectionKind.OTHER, other.kind)
        assertEquals("timeout", other.message)
    }

    @Test
    fun is_mock_uses_location_is_mock_from_api_31() {
        assertTrue(AttendanceLogic.isMock(31, { true }, { false }))
        assertFalse(AttendanceLogic.isMock(34, { false }, { true }))
        assertTrue(AttendanceLogic.isMock(30, { false }, { true }))
    }

    @Test
    fun week_is_monday_to_sunday_and_labels_are_vietnamese() {
        val week = AttendanceLogic.week(LocalDate.parse("2026-10-15")) // Thursday
        assertEquals(LocalDate.parse("2026-10-12"), week.first())
        assertEquals(LocalDate.parse("2026-10-18"), week.last())
        assertEquals("T2 12/10", AttendanceLogic.dayShort(week.first(), vietnamese = true))
        assertEquals("CN 18/10", AttendanceLogic.dayShort(week.last(), vietnamese = true))
        assertEquals("Mon 12/10", AttendanceLogic.dayShort(week.first(), vietnamese = false))
        assertEquals("T2 12/10/26", AttendanceLogic.dayLong(week.first(), vietnamese = true))
        assertEquals(listOf(YearMonth.of(2026, 9), YearMonth.of(2026, 10)), AttendanceLogic.months(AttendanceLogic.week(LocalDate.parse("2026-10-01"))))
        assertEquals("2026-10", AttendanceLogic.monthKey(YearMonth.of(2026, 10)))
        assertEquals("10/2026", AttendanceLogic.monthText(YearMonth.of(2026, 10)))
        assertEquals("Sáng 08–12", AttendanceLogic.shortShift(AttendanceShift("Ca sáng", "08:00", "12:00")))
        assertEquals("Chiều 13–17:30", AttendanceLogic.shortShift(AttendanceShift("Ca chiều", "13:00", "17:30")))
    }

    @Test
    fun my_week_joins_schedule_and_worked_pairs() {
        val schedule = AttendanceLogic.scheduleFor(
            JSONArray("""[
              {"userId":7,"date":"2026-10-12","shifts":[{"name":"Ca sáng","start":"08:00","end":"12:00"}]},
              {"userId":8,"date":"2026-10-12","shifts":[{"name":"Ca chiều","start":"13:00","end":"17:30"}]},
              {"userId":7,"date":"2026-10-15","shifts":[{"name":"Ca chiều","start":"13:00","end":"17:30"}]},
              {"userId":7,"date":"2026-10-16","shifts":[]}
            ]"""),
            userId = 7,
        )
        assertEquals(setOf(LocalDate.parse("2026-10-12"), LocalDate.parse("2026-10-15")), schedule.keys)
        val pairs = AttendanceLogic.pairs(JSONArray("""[
            {"at":"2026-10-12T00:58:00Z","kind":"IN","result":"ACCEPTED","recordId":1},
            {"at":"2026-10-12T00:59:00Z","kind":"IN","result":"REJECTED","errorCode":"OUT_OF_RANGE"},
            {"at":"2026-10-12T05:01:00Z","kind":"OUT","result":"ACCEPTED","recordId":1},
            {"at":"2026-10-13T01:07:00Z","kind":"IN","result":"ACCEPTED","recordId":2,"lateMinutes":7},
            {"at":"2026-10-13T05:00:00Z","kind":"OUT","result":"ACCEPTED","recordId":2},
            {"at":"2026-10-14T01:00:00Z","kind":"IN","result":"ACCEPTED","recordId":3},
            {"at":"2026-10-14T17:00:00Z","kind":"OUT","result":"AUTO_CLOSED","recordId":3}
        ]"""))
        val rows = AttendanceLogic.weekRows(AttendanceLogic.week(LocalDate.parse("2026-10-12")), schedule, pairs)
        assertEquals(listOf("2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"), rows.map { it.date.toString() })
        assertEquals("07:58–12:01", AttendanceLogic.pairTimes(rows[0].pairs))
        assertEquals(4.05, AttendanceLogic.pairHours(rows[0].pairs), 0.001)
        assertEquals(7, rows[1].lateMinutes)
        assertEquals("08:00–?", AttendanceLogic.pairTimes(rows[2].pairs))
        assertTrue(rows[3].pairs.isEmpty())
        val summary = AttendanceLogic.monthSummary(JSONObject("""{"summary":{"hours":96.5,"days":22}}"""))
        assertEquals(96.5, summary.hours!!, 0.0)
        assertEquals(22, summary.days)
        assertNull(AttendanceLogic.monthSummary(null).hours)
    }
}
