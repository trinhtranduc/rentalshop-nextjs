package com.anyrent.pos.data

import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.attendance.AttendanceCard
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.AttendanceMe
import com.anyrent.pos.domain.attendance.AttendanceShift
import com.anyrent.pos.domain.attendance.MonthSummary
import com.anyrent.pos.domain.attendance.MyShiftDay
import com.anyrent.pos.domain.attendance.PunchRejection
import com.anyrent.pos.domain.attendance.PunchResult
import com.anyrent.pos.domain.attendance.WorkedPair
import com.anyrent.pos.domain.error.AppError
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth

/** Location sent with a punch (#907 rule 13) */
data class PunchLocation(val latitude: Double, val longitude: Double, val accuracy: Double, val isMock: Boolean)

/** "Ca và công của tôi": this week's rows and the month totals */
data class MyShifts(val week: List<MyShiftDay>, val month: YearMonth, val summary: MonthSummary)

sealed interface PunchOutcome {
    data class Done(val result: PunchResult) : PunchOutcome
    data class Rejected(val rejection: PunchRejection) : PunchOutcome
}

/** Staff calls of the attendance module (#907); blocking, call from IO */
object AttendanceApi {
    private val json = "application/json; charset=utf-8".toMediaType()

    fun me(): Result<AttendanceMe> = runCatching {
        AttendanceLogic.me(ApiClient.get().authedGet("/api/attendance/me").optJSONObject("data"))
    }

    fun punch(code: String, location: PunchLocation): PunchOutcome {
        val body = JSONObject()
            .put("code", code)
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("accuracy", location.accuracy)
            .put("isMock", location.isMock)
            .toString().toRequestBody(json)
        return runCatching { ApiClient.get().authedPost("/api/attendance/punch", body) }.fold(
            onSuccess = { PunchOutcome.Done(AttendanceLogic.punch(it.optJSONObject("data"))) },
            onFailure = { failure ->
                val error = AppError.from(failure)
                val data = (error as? AppError.Http)?.data
                PunchOutcome.Rejected(AttendanceLogic.rejection(error.code, data, error.message))
            },
        )
    }

    /** #927: the signed-in user's records of the VN day [today] (Cài đặt card, "Đã xong" face) */
    fun todayPairs(today: LocalDate = ShopTime.today()): Result<List<WorkedPair>> = runCatching {
        val userId = SessionStore.userId ?: return@runCatching emptyList()
        val outletId = SessionStore.outletId ?: CurrentOutlet.id
        val outletParam = outletId?.let { "outletId=$it&" }.orEmpty()
        val month = AttendanceLogic.monthKey(YearMonth.from(today))
        val res = ApiClient.get().authedGet("/api/attendance/people/$userId/month?${outletParam}month=$month")
        AttendanceCard.todayPairs(AttendanceLogic.pairs(res.optJSONObject("data")?.optJSONArray("rows")), today)
    }

    /** This VN week (shifts + worked pairs) and the current month's totals of the signed-in user */
    fun myShifts(today: LocalDate = ShopTime.today()): Result<MyShifts> = runCatching {
        val client = ApiClient.get()
        val userId = SessionStore.userId
        val outletId = SessionStore.outletId ?: CurrentOutlet.id
        val outletParam = outletId?.let { "outletId=$it&" }.orEmpty()
        val week = AttendanceLogic.week(today)
        val schedule: Map<LocalDate, List<AttendanceShift>> = runCatching {
            val res = client.authedGet("/api/attendance/shifts?${outletParam}from=${week.first()}&to=${week.last()}")
            AttendanceLogic.scheduleFor(res.opt("data"), userId)
        }.getOrDefault(emptyMap())
        val thisMonth = YearMonth.from(today)
        val pairs = mutableMapOf<LocalDate, List<WorkedPair>>()
        var summary = MonthSummary(null, null)
        if (userId != null) {
            (AttendanceLogic.months(week) + thisMonth).distinct().forEach { month ->
                val res = client.authedGet("/api/attendance/people/$userId/month?${outletParam}month=${AttendanceLogic.monthKey(month)}")
                val data = res.optJSONObject("data")
                pairs.putAll(AttendanceLogic.pairs(data?.optJSONArray("rows")))
                if (month == thisMonth) summary = AttendanceLogic.monthSummary(data)
            }
        }
        MyShifts(AttendanceLogic.weekRows(week, schedule, pairs), thisMonth, summary)
    }
}
