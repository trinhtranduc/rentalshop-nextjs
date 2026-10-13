package com.anyrent.pos.domain.attendance

import com.anyrent.pos.domain.ShopTime
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

/** Which face the Cài đặt clock card shows (#927, mockup "phương án L") */
enum class ClockCardKind { IDLE, IN_SHIFT, DONE }

/**
 * What the card shows. [big]: shop clock "07:57" (IDLE), time worked "2:44" (IN_SHIFT) or the day's hours "8,1"
 * (DONE, the view adds "giờ"). [checkIn] and [shift]: IN_SHIFT only; [pairs]: DONE only ("07:58–12:01, 13:00–17:05").
 */
data class ClockCard(
    val kind: ClockCardKind,
    val status: AttendanceStatus,
    val big: String,
    val shifts: List<AttendanceShift>,
    val checkIn: String? = null,
    val shift: AttendanceShift? = null,
    val pairs: String? = null,
)

object AttendanceCard {
    /** Only when the shop has the module and picked this person; `me` not loaded = no card (Cài đặt as before) */
    fun visible(modules: Set<String>, me: AttendanceMe?): Boolean =
        AttendanceLogic.hasAttendance(modules) && me?.required == true

    fun state(me: AttendanceMe, todayPairs: List<WorkedPair>, now: Instant, locale: Locale = Locale.getDefault(), zone: ZoneId = ShopTime.zone): ClockCard {
        val status = me.status(now, zone)
        val inAt = me.openRecord?.checkInAt
        if (status == AttendanceStatus.IN_SHIFT && inAt != null) {
            val day = inAt.atZone(zone).toLocalDate()
            val shift = AttendanceLogic.linkedShift(inAt, day, me.todayShifts, zone) ?: me.todayShifts.firstOrNull()
            return ClockCard(
                ClockCardKind.IN_SHIFT, status, elapsed(inAt, now), me.todayShifts,
                checkIn = AttendanceLogic.hhmm(inAt, zone), shift = shift,
            )
        }
        val closed = todayPairs.filter { it.outAt != null }
        if (status == AttendanceStatus.DONE && closed.isNotEmpty()) {
            return ClockCard(
                ClockCardKind.DONE, status, AttendanceLogic.oneDecimal(AttendanceLogic.pairHours(closed), locale), me.todayShifts,
                pairs = AttendanceLogic.pairTimes(todayPairs, zone),
            )
        }
        return ClockCard(ClockCardKind.IDLE, status, AttendanceLogic.hhmm(now, zone), me.todayShifts)
    }

    /** "2:44": whole hours and minutes since [from], never below 0:00 */
    fun elapsed(from: Instant, now: Instant): String {
        val minutes = Duration.between(from, now).toMinutes().coerceAtLeast(0)
        return "%d:%02d".format(minutes / 60, minutes % 60)
    }

    /** "T3 13/10 · Ca sáng 08:00–12:00, Ca chiều 13:00–17:00 · Chi nhánh chính · chưa vào ca" (parts that exist) */
    fun idleLine(day: String, shifts: List<AttendanceShift>, branch: String?, status: String): String =
        listOfNotNull(
            day,
            shifts.joinToString(", ") { AttendanceLogic.shiftLine(it) }.takeIf { it.isNotEmpty() },
            branch?.trim()?.takeIf { it.isNotEmpty() },
            status,
        ).joinToString(" · ")

    /** Records of the VN day [today] from `people/{id}/month` pairs */
    fun todayPairs(pairs: Map<LocalDate, List<WorkedPair>>, today: LocalDate): List<WorkedPair> = pairs[today].orEmpty()
}
