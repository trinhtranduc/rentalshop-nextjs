package com.anyrent.pos.domain.widget

import com.anyrent.pos.domain.ShopTime
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

// "Việc cần làm" home-screen widget (#1381, epic #1372), iOS `TodayWidgetSnapshot.swift`.
//
// The app and its worker write ONE small JSON; the widget only reads it. It never holds a token, a phone number, an
// amount of money or a photo. It has no texts either: unlike the iOS extension, the widget here reads the app's strings.

data class TodayWidgetCounts(
    val late: Int,
    val pickup: Int,
    val returns: Int,
    /** null when the API did not send tomorrow's groups (older API) */
    val tomorrowPickup: Int? = null,
    val tomorrowReturn: Int? = null,
) {
    val total: Int get() = late + pickup + returns
}

/** One job of the day. `name` is empty when the owner turned customer names off. */
data class TodayWidgetRow(
    /** Public numeric order id (never the database id): `anyrent://order/<orderId>` */
    val orderId: Int,
    val kind: Kind,
    val isLate: Boolean,
    val name: String,
    /** First item name (no quantity) */
    val product: String,
    /** How many other items the order has ("Áo dài gấm đỏ +1") */
    val moreCount: Int,
    val lateDays: Int,
    /** Hand-over rows only */
    val notPrepared: Boolean,
    /** "14:00" in Vietnam time, only when the order really has a time; else empty */
    val planTime: String,
    /** The planned day of the job, "28/10/26"; the word ("Lấy" / "Trả") comes from the app's strings */
    val planDay: String,
) {
    enum class Kind(val raw: String) { PICKUP("pickup"), RETURN("return") }
}

data class TodayWidgetSnapshot(
    val userId: Int,
    val outletId: Int,
    /** Vietnam civil day (`YYYY-MM-DD`) the list belongs to */
    val date: String,
    val savedAt: Instant,
    val state: State,
    val hideNames: Boolean,
    /** Hand-overs and returns already done today (`doneToday.pickups + doneToday.returns` of the API) */
    val done: Int,
    val counts: TodayWidgetCounts,
    val rows: List<TodayWidgetRow>,
) {
    /** Signed out is not a state: the file is removed */
    enum class State(val raw: String) { OK("ok"), NO_ACCESS("noAccess") }

    /** The list is only today's while its Vietnam day is the Vietnam day of [now] (never the UTC day) */
    fun isFresh(now: Instant): Boolean = date == TodayWidgetClock.dayKey(now)

    fun withoutNames(): TodayWidgetSnapshot = copy(hideNames = true, rows = rows.map { it.copy(name = "") })

    fun toJson(): String = JSONObject()
        .put("v", CURRENT_VERSION)
        .put("userId", userId)
        .put("outletId", outletId)
        .put("date", date)
        .put("savedAt", savedAt.toString())
        .put("state", state.raw)
        .put("hideNames", hideNames)
        .put("done", done)
        .put(
            "counts",
            JSONObject().put("late", counts.late).put("pickup", counts.pickup).put("return", counts.returns)
                .apply {
                    counts.tomorrowPickup?.let { put("tomorrowPickup", it) }
                    counts.tomorrowReturn?.let { put("tomorrowReturn", it) }
                },
        )
        .put(
            "rows",
            JSONArray().apply {
                rows.forEach { row ->
                    put(
                        JSONObject().put("orderId", row.orderId).put("kind", row.kind.raw).put("isLate", row.isLate)
                            .put("name", row.name).put("product", row.product).put("moreCount", row.moreCount)
                            .put("lateDays", row.lateDays).put("notPrepared", row.notPrepared)
                            .put("planTime", row.planTime).put("planDay", row.planDay),
                    )
                }
            },
        )
        .toString()

    companion object {
        const val CURRENT_VERSION = 1

        /** The most rows the file keeps (the widget shows at most 3) */
        const val MAX_ROWS = 8

        /** 403: the account has no "Việc cần làm" */
        fun noAccess(userId: Int, outletId: Int, now: Instant) = TodayWidgetSnapshot(
            userId, outletId, TodayWidgetClock.dayKey(now), now, State.NO_ACCESS, hideNames = false, done = 0,
            counts = TodayWidgetCounts(0, 0, 0), rows = emptyList(),
        )

        /** null for anything that cannot be read: an unreadable file is no file, never a wrong list */
        fun fromJson(raw: String?): TodayWidgetSnapshot? = runCatching {
            val o = JSONObject(raw ?: return null)
            if (o.getInt("v") != CURRENT_VERSION) return null
            val counts = o.getJSONObject("counts")
            fun optionalCount(key: String) = if (counts.has(key)) counts.getInt(key) else null
            val rows = o.getJSONArray("rows")
            TodayWidgetSnapshot(
                userId = o.getInt("userId"),
                outletId = o.getInt("outletId"),
                date = o.getString("date"),
                savedAt = Instant.parse(o.getString("savedAt")),
                state = State.entries.first { it.raw == o.getString("state") },
                hideNames = o.getBoolean("hideNames"),
                done = o.getInt("done"),
                counts = TodayWidgetCounts(
                    counts.getInt("late"), counts.getInt("pickup"), counts.getInt("return"),
                    optionalCount("tomorrowPickup"), optionalCount("tomorrowReturn"),
                ),
                rows = (0 until rows.length()).map { index ->
                    val row = rows.getJSONObject(index)
                    TodayWidgetRow(
                        orderId = row.getInt("orderId"),
                        kind = TodayWidgetRow.Kind.entries.first { it.raw == row.getString("kind") },
                        isLate = row.getBoolean("isLate"),
                        name = row.getString("name"),
                        product = row.getString("product"),
                        moreCount = row.getInt("moreCount"),
                        lateDays = row.getInt("lateDays"),
                        notPrepared = row.getBoolean("notPrepared"),
                        planTime = row.getString("planTime"),
                        planDay = row.getString("planDay"),
                    )
                },
            )
        }.getOrNull()
    }
}

/** Vietnam civil days and clock texts, whatever zone the phone is set to (`ShopTime`, skill timezone-dates) */
object TodayWidgetClock {
    /** `YYYY-MM-DD` of the Vietnam day containing [instant] */
    fun dayKey(instant: Instant): String = instant.atZone(ShopTime.zone).toLocalDate().toString()

    /** The first instant of the next Vietnam day (17:00:00Z) */
    fun nextMidnight(after: Instant): Instant =
        after.atZone(ShopTime.zone).toLocalDate().plusDays(1).atStartOfDay(ShopTime.zone).toInstant()

    /** "08:12" in Vietnam time */
    fun timeText(instant: Instant): String = instant.atZone(ShopTime.zone).let { "%02d:%02d".format(it.hour, it.minute) }

    /** "14:00" in Vietnam time; empty at the Vietnam midnight exactly, which is how an order that has only a day is stored */
    fun timeOfDayText(instant: Instant): String {
        val local = instant.atZone(ShopTime.zone)
        return if (local.hour == 0 && local.minute == 0 && local.second == 0) "" else "%02d:%02d".format(local.hour, local.minute)
    }

    /** "31/10" in Vietnam time */
    fun dayMonthText(instant: Instant): String = instant.atZone(ShopTime.zone).let { "%02d/%02d".format(it.dayOfMonth, it.monthValue) }
}
