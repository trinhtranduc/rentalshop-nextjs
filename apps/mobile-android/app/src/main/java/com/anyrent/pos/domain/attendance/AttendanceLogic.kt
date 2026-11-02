package com.anyrent.pos.domain.attendance

import com.anyrent.pos.domain.ShopTime
import org.json.JSONArray
import org.json.JSONObject
import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** Key of the attendance module in `merchant.modules` (#907) */
const val ATTENDANCE_MODULE = "attendance"

/** One shift of a day: "Ca sáng" 08:00–12:00 (times are the shop's HH:mm), break in minutes when the API sends it */
data class AttendanceShift(val name: String?, val start: String?, val end: String?, val breakMinutes: Int? = null)

/** A clock-in record (#907 `AttendanceRecord`); every field may be missing */
data class AttendanceRecord(
    val id: Int?,
    val checkInAt: Instant?,
    val checkOutAt: Instant?,
    val status: String?,
    val hours: Double?,
    val breakMinutes: Int?,
    /** The record's shift snapshot (`record.shift`), #927 */
    val shift: AttendanceShift? = null,
)

enum class AttendanceStatus { NOT_IN, IN_SHIFT, DONE }

/** `GET /api/attendance/me` */
data class AttendanceMe(
    val openRecord: AttendanceRecord?,
    val todayShifts: List<AttendanceShift>,
    val lastAction: String?,
    val lastActionAt: Instant?,
    /** `today.status` of the API: IN_SHIFT | DONE | NOT_STARTED */
    val apiStatus: String? = null,
    /** #927: the shop picked this person to clock in; an API without the field = true */
    val required: Boolean = true,
) {
    /** The API's `today.status`; without it: open record = in shift, an OUT today = done, else not in */
    fun status(now: Instant = Instant.now(), zone: ZoneId = ShopTime.zone): AttendanceStatus = when {
        openRecord != null -> AttendanceStatus.IN_SHIFT
        apiStatus.equals("IN_SHIFT", ignoreCase = true) -> AttendanceStatus.IN_SHIFT
        apiStatus.equals("DONE", ignoreCase = true) -> AttendanceStatus.DONE
        apiStatus.equals("NOT_STARTED", ignoreCase = true) -> AttendanceStatus.NOT_IN
        openRecord != null -> AttendanceStatus.IN_SHIFT
        lastAction.equals("OUT", ignoreCase = true) &&
            lastActionAt?.atZone(zone)?.toLocalDate() == now.atZone(zone).toLocalDate() -> AttendanceStatus.DONE
        else -> AttendanceStatus.NOT_IN
    }
}

/** `POST /api/attendance/punch` success */
data class PunchResult(
    val action: String,
    val record: AttendanceRecord?,
    val distanceM: Int?,
    val accuracyM: Int?,
) {
    val isIn: Boolean get() = !action.equals("OUT", ignoreCase = true)
}

/** Why a punch was refused; one shows at a time (mockup screen 6) */
enum class PunchRejectionKind {
    OUT_OF_RANGE, MOCK_LOCATION, QR_EXPIRED, QR_WRONG_OUTLET, GPS_INACCURATE,
    NOT_CONFIGURED, MODULE_OFF, NO_LOCATION,
    /** #1014 the outlet has a QR but no location: setup error, the distance cannot be measured */
    LOCATION_NOT_SET,
    /** #927: the shop did not pick this person to clock in */
    NOT_REQUIRED, OTHER,
}

data class PunchRejection(
    val kind: PunchRejectionKind,
    val distanceM: Int? = null,
    val radiusM: Int? = null,
    val accuracyM: Int? = null,
    /** API text for [PunchRejectionKind.OTHER] */
    val message: String? = null,
    /** #949 QR_WRONG_OUTLET: outlet of the scanned code (null for another shop's code or an older API) */
    val qrOutletName: String? = null,
    /** #949 QR_WRONG_OUTLET: the outlets the person may clock in at */
    val allowedOutletNames: List<String> = emptyList(),
    /** #1014 LOCATION_NOT_SET: the outlet without a location (null on an older API) */
    val outletName: String? = null,
)

/**
 * One record of "Ca và công của tôi". [breakMinutes]: the record's shift snapshot (for a record added by hand, the
 * break of the shift the server linked, #923); [hours]: the API's own hours when a row carries them.
 */
data class WorkedPair(
    val inAt: Instant, val outAt: Instant?, val missingOut: Boolean, val lateMinutes: Int?, val breakMinutes: Int? = null,
    val hours: Double? = null,
)

/** One line of a week row, one per record as on iOS: "08:03–16:58" + hours (closed) or late minutes */
data class WorkedLine(val times: String, val hours: Double?, val lateMinutes: Int)

/** #932 Main text of a record, and its amber late part (null when on time) */
data class WeekLineText(val main: String, val late: String?)

data class MyShiftDay(val date: LocalDate, val shifts: List<AttendanceShift>, val pairs: List<WorkedPair>) {
    val lateMinutes: Int get() = pairs.sumOf { it.lateMinutes ?: 0 }
}

data class MonthSummary(val hours: Double?, val days: Int?)

object AttendanceLogic {
    // ---- parsing (nullable-safe: a missing or wrong-typed field reads as null) ----

    /** `merchant.modules` of login / profile; missing or not an array = none */
    fun modules(merchant: JSONObject?): Set<String> {
        val array = merchant?.optJSONArray("modules") ?: return emptySet()
        return (0 until array.length()).mapNotNull { i -> (array.opt(i) as? String)?.trim()?.takeIf { it.isNotEmpty() } }.toSet()
    }

    fun hasAttendance(modules: Set<String>): Boolean = ATTENDANCE_MODULE in modules

    fun instant(value: Any?): Instant? = (value as? String)?.let {
        runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() ?: runCatching { Instant.parse(it) }.getOrNull()
    }

    private fun JSONObject.str(vararg keys: String): String? =
        keys.firstNotNullOfOrNull { k -> (opt(k) as? String)?.trim()?.takeIf { it.isNotEmpty() } }

    private fun JSONObject.int(vararg keys: String): Int? =
        keys.firstNotNullOfOrNull { k -> (opt(k) as? Number)?.let { Math.round(it.toDouble()).toInt() } }

    private fun JSONObject.dbl(vararg keys: String): Double? =
        keys.firstNotNullOfOrNull { k -> (opt(k) as? Number)?.toDouble() }

    fun shift(o: JSONObject?): AttendanceShift? {
        if (o == null) return null
        val s = AttendanceShift(
            name = o.str("name", "shiftName"),
            start = o.str("start", "startTime", "shiftStart"),
            end = o.str("end", "endTime", "shiftEnd"),
            breakMinutes = o.int("breakMinutes", "shiftBreakMinutes"),
        )
        return s.takeIf { it.name != null || it.start != null }
    }

    fun shifts(array: JSONArray?): List<AttendanceShift> =
        (0 until (array?.length() ?: 0)).mapNotNull { shift(array?.optJSONObject(it)) }

    fun record(o: JSONObject?): AttendanceRecord? {
        if (o == null) return null
        val snapshot = o.optJSONObject("shift")
        return AttendanceRecord(
            id = o.int("id"),
            checkInAt = instant(o.opt("checkInAt")),
            checkOutAt = instant(o.opt("checkOutAt")),
            status = o.str("status"),
            hours = o.dbl("hours"),
            breakMinutes = o.int("shiftBreakMinutes", "breakMinutes") ?: snapshot?.int("breakMinutes"),
            shift = shift(snapshot),
        )
    }

    fun me(data: JSONObject?): AttendanceMe {
        val today = data?.optJSONObject("today")
        val last = data?.optJSONObject("lastAction")
        return AttendanceMe(
            openRecord = record(data?.optJSONObject("openRecord")),
            todayShifts = shifts(today?.optJSONArray("shifts")),
            lastAction = last?.str("action", "kind") ?: (data?.opt("lastAction") as? String),
            lastActionAt = instant(last?.opt("at")) ?: instant(last?.opt("createdAt")),
            apiStatus = today?.str("status"),
            required = (data?.opt("required") as? Boolean) ?: true,
        )
    }

    fun punch(data: JSONObject?): PunchResult = PunchResult(
        action = data?.str("action") ?: "IN",
        record = record(data?.optJSONObject("record")),
        distanceM = data?.int("distanceM"),
        accuracyM = data?.int("accuracyM"),
    )

    /** API error code (+ its `data`) → the one rejection shown */
    fun rejection(code: String?, data: JSONObject?, message: String?): PunchRejection = when (code?.uppercase()) {
        "OUT_OF_RANGE" -> PunchRejection(PunchRejectionKind.OUT_OF_RANGE, distanceM = data?.int("distanceM"), radiusM = data?.int("radiusM"))
        "MOCK_LOCATION" -> PunchRejection(PunchRejectionKind.MOCK_LOCATION)
        "QR_EXPIRED" -> PunchRejection(PunchRejectionKind.QR_EXPIRED)
        "QR_WRONG_OUTLET" -> PunchRejection(
            PunchRejectionKind.QR_WRONG_OUTLET,
            qrOutletName = data?.optJSONObject("qrOutlet")?.str("name")?.takeIf { it.isNotBlank() },
            allowedOutletNames = data?.optJSONArray("allowedOutlets")?.let { list ->
                (0 until list.length()).mapNotNull { list.optJSONObject(it)?.str("name")?.takeIf { name -> name.isNotBlank() } }
            } ?: emptyList(),
        )
        "GPS_INACCURATE" -> PunchRejection(PunchRejectionKind.GPS_INACCURATE, accuracyM = data?.int("accuracyM"))
        "ATTENDANCE_LOCATION_NOT_SET" -> PunchRejection(
            PunchRejectionKind.LOCATION_NOT_SET,
            outletName = data?.optJSONObject("outlet")?.str("name")?.takeIf { it.isNotBlank() },
        )
        "ATTENDANCE_NOT_CONFIGURED" -> PunchRejection(PunchRejectionKind.NOT_CONFIGURED)
        "MODULE_NOT_ENABLED" -> PunchRejection(PunchRejectionKind.MODULE_OFF)
        "ATTENDANCE_NOT_REQUIRED" -> PunchRejection(PunchRejectionKind.NOT_REQUIRED)
        // #1408 the server's trouble, not the scan: no message, so the card says to try again (as iOS)
        "SERVICE_UNAVAILABLE", "DATABASE_ERROR", "INTERNAL_SERVER_ERROR" -> PunchRejection(PunchRejectionKind.OTHER)
        else -> PunchRejection(PunchRejectionKind.OTHER, message = message)
    }

    /** `isMock`: `Location.isMock` on API 31+, `isFromMockProvider` before */
    fun isMock(sdkInt: Int, isMockApi31: () -> Boolean, isFromMockProvider: () -> Boolean): Boolean =
        if (sdkInt >= 31) isMockApi31() else isFromMockProvider()

    // ---- hours and texts ----

    /** Record hours: the API's `hours`, else (OUT − IN) − break, floor 0; no OUT = null */
    fun hours(record: AttendanceRecord?): Double? {
        if (record == null) return null
        record.hours?.let { return it }
        val inAt = record.checkInAt ?: return null
        val outAt = record.checkOutAt ?: return null
        val minutes = Duration.between(inAt, outAt).toMinutes() - (record.breakMinutes ?: 0)
        return minutes.coerceAtLeast(0) / 60.0
    }

    /** "4,0" in Vietnamese, "4.0" in English */
    fun oneDecimal(value: Double, locale: Locale = Locale.getDefault()): String = String.format(locale, "%.1f", value)

    fun hhmm(instant: Instant?, zone: ZoneId = ShopTime.zone): String {
        val t = instant?.atZone(zone) ?: return "--:--"
        return "%02d:%02d".format(t.hour, t.minute)
    }

    /** "08:00–12:00" or "08:00 – 12:00" ([spaced]) */
    fun shiftTimes(shift: AttendanceShift, spaced: Boolean = false): String {
        val dash = if (spaced) " – " else "–"
        return listOfNotNull(shift.start, shift.end).joinToString(dash)
    }

    /** "Ca sáng 08:00–12:00" */
    fun shiftLine(shift: AttendanceShift, spaced: Boolean = false): String =
        listOfNotNull(shift.name, shiftTimes(shift, spaced).takeIf { it.isNotEmpty() }).joinToString(" ")

    /** "Sáng 08–12": "Ca " dropped, ":00" dropped (week rows of "Ca và công của tôi") */
    fun shortShift(shift: AttendanceShift): String {
        val name = shift.name?.removePrefix("Ca ")?.removePrefix("ca ")?.replaceFirstChar { it.titlecase() }
        fun short(t: String?) = t?.removeSuffix(":00")
        val times = listOfNotNull(short(shift.start), short(shift.end)).joinToString("–")
        return listOfNotNull(name, times.takeIf { it.isNotEmpty() }).joinToString(" ")
    }

    private fun vietnamese(): Boolean = Locale.getDefault().language == "vi"

    /** "T2" … "CN" in Vietnamese (as iOS and the web), "Mon" … "Sun" otherwise */
    fun weekdayShort(day: DayOfWeek, vietnamese: Boolean = vietnamese()): String = when {
        !vietnamese -> day.getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH)
        day == DayOfWeek.SUNDAY -> "CN"
        else -> "T${day.value + 1}"
    }

    /** "T2 12/10/26" */
    fun dayLong(date: LocalDate, vietnamese: Boolean = vietnamese()): String =
        "${weekdayShort(date.dayOfWeek, vietnamese)} %02d/%02d/%02d".format(date.dayOfMonth, date.monthValue, date.year % 100)

    /** "T2 12/10" */
    fun dayShort(date: LocalDate, vietnamese: Boolean = vietnamese()): String =
        "${weekdayShort(date.dayOfWeek, vietnamese)} %02d/%02d".format(date.dayOfMonth, date.monthValue)

    /** "10/2026" */
    fun monthText(month: YearMonth): String = "%02d/%d".format(month.monthValue, month.year)

    // ---- my shifts ----

    /** Monday … Sunday of the Vietnam week holding [today] */
    fun week(today: LocalDate): List<LocalDate> {
        val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return (0L until 7L).map { monday.plusDays(it) }
    }

    /** Months the week touches (one or two), for `people/{id}/month` */
    fun months(days: List<LocalDate>): List<YearMonth> = days.map { YearMonth.from(it) }.distinct()

    fun monthKey(month: YearMonth): String = "%04d-%02d".format(month.year, month.monthValue)

    /**
     * `GET /api/attendance/shifts` → shifts per day of [userId]. The answer is a list of
     * `{ userId, date, shifts: [...] }` (in `data` or `data.items` / `data.days`).
     */
    fun scheduleFor(data: Any?, userId: Int?): Map<LocalDate, List<AttendanceShift>> {
        val rows = when (data) {
            is JSONArray -> data
            is JSONObject -> data.optJSONArray("items") ?: data.optJSONArray("days") ?: data.optJSONArray("rows")
            else -> null
        } ?: return emptyMap()
        val out = linkedMapOf<LocalDate, List<AttendanceShift>>()
        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val rowUser = (row.opt("userId") as? Number)?.toInt()
            if (userId != null && rowUser != null && rowUser != userId) continue
            val date = (row.opt("date") as? String)?.let { runCatching { LocalDate.parse(it.take(10)) }.getOrNull() } ?: continue
            val shifts = shifts(row.optJSONArray("shifts"))
            if (shifts.isNotEmpty()) out[date] = (out[date].orEmpty() + shifts)
        }
        return out
    }

    /**
     * Worked pairs from the rows of `people/{id}/month` (`{ at, kind: IN|OUT|EDIT, result, recordId, lateMinutes, dateKey? }`):
     * accepted IN and OUT rows joined by `recordId`; an auto-closed record has no OUT ("missing out"). The last EDIT of a
     * record (`after.checkInAt` / `after.checkOutAt`) sets its times, so a record a manager added by hand on the web
     * (no scans) or edited shows its real times (#916). Day: the rows' `dateKey` (#918), else the EDIT's
     * `after.dateKey`, else the shop day of the check-in.
     */
    fun pairs(rows: JSONArray?, zone: ZoneId = ShopTime.zone): Map<LocalDate, List<WorkedPair>> {
        data class Acc(
            var inAt: Instant? = null, var outAt: Instant? = null, var late: Int? = null, var missing: Boolean = false,
            var brk: Int? = null, var edited: Boolean = false, var editIn: Instant? = null, var editOut: Instant? = null,
            var day: LocalDate? = null, var hours: Double? = null,
        )
        fun day(value: Any?): LocalDate? = (value as? String)?.let { runCatching { LocalDate.parse(it.take(10)) }.getOrNull() }
        val byRecord = linkedMapOf<Int, Acc>()
        for (i in 0 until (rows?.length() ?: 0)) {
            val row = rows?.optJSONObject(i) ?: continue
            val recordId = (row.opt("recordId") as? Number)?.toInt() ?: continue
            val result = (row.opt("result") as? String)?.uppercase()
            val kind = (row.opt("kind") as? String)?.uppercase()
            val at = instant(row.opt("at")) ?: continue
            if (kind == "EDIT") {
                val after = row.optJSONObject("after") ?: continue
                val editIn = instant(after.opt("checkInAt")) ?: continue
                val acc = byRecord.getOrPut(recordId) { Acc() }
                acc.edited = true
                acc.editIn = editIn
                acc.editOut = instant(after.opt("checkOutAt"))
                acc.hours = after.dbl("hours")
                (day(row.opt("dateKey")) ?: day(after.opt("dateKey")))?.let { acc.day = it }
                continue
            }
            val acc = byRecord.getOrPut(recordId) { Acc() }
            day(row.opt("dateKey"))?.let { acc.day = it }
            // Every scan / auto-close row of a record carries its shift snapshot
            row.optJSONObject("shift")?.int("breakMinutes")?.let { acc.brk = it }
            when {
                result == "AUTO_CLOSED" -> acc.missing = true
                result != "ACCEPTED" -> Unit
                kind == "IN" -> {
                    acc.inAt = at
                    acc.late = (row.opt("lateMinutes") as? Number)?.toInt()?.takeIf { it > 0 }
                }
                kind == "OUT" -> acc.outAt = at
            }
        }
        return byRecord.values.mapNotNull { a ->
            val inAt = (if (a.edited) a.editIn else a.inAt) ?: return@mapNotNull null
            val outAt = if (a.edited) a.editOut else a.outAt
            (a.day ?: inAt.atZone(zone).toLocalDate()) to WorkedPair(inAt, outAt, a.missing && outAt == null, a.late, a.brk, a.hours)
        }
            .sortedBy { it.second.inAt }
            .groupBy({ it.first }, { it.second })
    }

    fun monthSummary(data: JSONObject?): MonthSummary {
        val s = data?.optJSONObject("summary") ?: data
        return MonthSummary(hours = s?.dbl("hours", "totalHours"), days = s?.int("days", "dayCredits", "workedDays"))
    }

    /**
     * Rows of "TUẦN NÀY": days with a shift or a worked pair, in order. A record with no shift snapshot in the rows
     * (added by hand) takes the break of the day's shift the server linked it to (#923), so hours match the server.
     */
    fun weekRows(
        week: List<LocalDate>, schedule: Map<LocalDate, List<AttendanceShift>>, pairs: Map<LocalDate, List<WorkedPair>>,
        zone: ZoneId = ShopTime.zone,
    ): List<MyShiftDay> =
        week.mapNotNull { d ->
            val shifts = schedule[d].orEmpty()
            val worked = pairs[d].orEmpty().map { p ->
                if (p.breakMinutes != null || p.hours != null) p
                else p.copy(breakMinutes = linkedShift(p.inAt, d, shifts, zone)?.breakMinutes)
            }
            if (shifts.isEmpty() && worked.isEmpty()) null else MyShiftDay(d, shifts, worked)
        }

    /**
     * The server's `matchShiftForInstant` on one day: a shift whose window [start − 3 h, end] holds the check-in (an end
     * at or before the start is the next day); the closest start wins
     */
    fun linkedShift(inAt: Instant, date: LocalDate, shifts: List<AttendanceShift>, zone: ZoneId = ShopTime.zone): AttendanceShift? {
        fun clock(t: String?): java.time.LocalTime? = t?.let { runCatching { java.time.LocalTime.parse(it.take(5)) }.getOrNull() }
        return shifts.mapNotNull { shift ->
            val startTime = clock(shift.start) ?: return@mapNotNull null
            val endTime = clock(shift.end) ?: return@mapNotNull null
            val start = date.atTime(startTime).atZone(zone).toInstant()
            val end = (if (endTime <= startTime) date.plusDays(1) else date).atTime(endTime).atZone(zone).toInstant()
            if (inAt < start.minus(Duration.ofHours(3)) || inAt > end) null
            else shift to Duration.between(start, inAt).abs()
        }.minByOrNull { it.second }?.first
    }

    /** One line per record, as on iOS */
    fun weekLines(day: MyShiftDay, zone: ZoneId = ShopTime.zone): List<WorkedLine> = day.pairs.map { p ->
        WorkedLine(pairTimes(listOf(p), zone), if (p.outAt != null) pairHours(listOf(p)) else null, p.lateMinutes ?: 0)
    }

    /**
     * #932 Text of one record: "08:07–12:00 · 3,9 g" and, when late, the amber extra "muộn 7′".
     * Late never replaces the hours; an open record keeps "08:07–…".
     */
    fun weekLineText(line: WorkedLine, hoursText: (Double) -> String, lateText: (Int) -> String): WeekLineText =
        WeekLineText(
            main = listOfNotNull(line.times, line.hours?.let(hoursText)).joinToString(" · "),
            late = line.lateMinutes.takeIf { it > 0 }?.let(lateText),
        )

    /** Second line of the Cài đặt row as on iOS: "Ca sáng 08:00–12:00 · chưa vào ca", or "Chưa vào ca" alone */
    fun settingsLine(shift: AttendanceShift?, status: String): String =
        shift?.let { "${shiftLine(it)} · $status" } ?: status.replaceFirstChar { it.titlecase() }

    /** "07:58–12:01" per pair (open = "07:58–…", missing out = "07:58–?") joined by ", " */
    fun pairTimes(pairs: List<WorkedPair>, zone: ZoneId = ShopTime.zone): String = pairs.joinToString(", ") { p ->
        val out = when {
            p.outAt != null -> hhmm(p.outAt, zone)
            p.missingOut -> "?"
            else -> "…"
        }
        "${hhmm(p.inAt, zone)}–$out"
    }

    /** Hours of the closed pairs of a day as the API counts them: its own `hours`, else each minus its break (floor 0) */
    fun pairHours(pairs: List<WorkedPair>): Double =
        pairs.filter { it.outAt != null }.sumOf { p ->
            p.hours ?: ((Duration.between(p.inAt, p.outAt).toMinutes() - (p.breakMinutes ?: 0)).coerceAtLeast(0) / 60.0)
        }
}
