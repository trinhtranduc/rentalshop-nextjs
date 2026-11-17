package com.anyrent.pos.domain.overview

import com.anyrent.pos.domain.ShopTime
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/** #1612 a figure of last week with the week before (`growth` in percent) */
data class WeeklyChange(val current: Double, val previous: Double, val growth: Double)

/** One open branch of the owner's shop */
data class WeeklyBranch(val name: String, val orderValue: WeeklyChange?, val newOrders: Int)

data class WeeklyDayCount(val date: LocalDate, val count: Int)

data class WeeklyHotProduct(val name: String, val rentals: Int, val sales: Int, val revenue: Double)

/** Figures of the week, computed by the API (never AI). Every part may be missing in an older or newer answer. */
data class WeeklyNumbers(
    val orderValue: WeeklyChange? = null,
    val collected: WeeklyChange? = null,
    val outstanding: Double? = null,
    val fees: Double? = null,
    val branches: List<WeeklyBranch> = emptyList(),
    val newOrders: WeeklyChange? = null,
    val rent: Int? = null,
    val sale: Int? = null,
    val cancelled: Int? = null,
    val byDay: List<WeeklyDayCount> = emptyList(),
    val pickedUp: Int? = null,
    val returned: Int? = null,
    val late: WeeklyChange? = null,
    val notPickedUp: Int? = null,
    val hot: List<WeeklyHotProduct> = emptyList(),
    val customers: Int? = null,
    val newCustomers: Int? = null,
    val returningCustomers: Int? = null,
)

/** The AI text ("✦" lines) */
data class WeeklyContent(
    val summary: String,
    val actions: List<String>,
    val revenueNote: String?,
    val ordersNote: String?,
    val productsNote: String?,
)

enum class WeeklySummaryStatus { NONE, READY, NO_ORDERS }

/** `data` of GET / POST `/api/analytics/weekly-summary` */
data class WeeklySummary(
    /** The API has an AI key; false hides the button */
    val available: Boolean,
    val weekStart: LocalDate?,
    val weekEnd: LocalDate?,
    val nextWeekStart: LocalDate?,
    /** NONE: nobody opened this week's summary yet (red dot) */
    val status: WeeklySummaryStatus,
    /** A branch manager's branch; null for the whole shop */
    val branchName: String?,
    val generatedAt: Instant? = null,
    val numbers: WeeklyNumbers? = null,
    val content: WeeklyContent? = null,
)

enum class WeeklyTone { GOOD, BAD }

/** "▲12%" / "▼3" with its colour */
data class WeeklyBadge(val text: String, val tone: WeeklyTone)

/** One day of the new-orders bars: [ratio] of the tallest day, [top] = the tallest (solid) */
data class WeeklyDayBar(val label: String, val count: Int, val ratio: Double, val top: Boolean)

/** #1612 AI summary of last week on Tổng quan: what the button and the sheet show (iOS and web read the same API) */
object WeeklySummaryLogic {
    /** Same `timeZone` as the Overview routes */
    fun path(): String = "/api/analytics/weekly-summary?timeZone=${ShopTime.timeZoneParam()}"

    fun showsButton(summary: WeeklySummary?): Boolean = summary?.available == true

    /** Red dot until this week's summary is opened (on any device of the shop / branch) */
    fun showsDot(summary: WeeklySummary?): Boolean = showsButton(summary) && summary?.status == WeeklySummaryStatus.NONE

    /** A stored summary the sheet can show at once (READY with text, or NO_ORDERS) */
    fun isShowable(summary: WeeklySummary?): Boolean = when (summary?.status) {
        WeeklySummaryStatus.READY -> summary.content != null
        WeeklySummaryStatus.NO_ORDERS -> true
        else -> false
    }

    /** ▲ / ▼ rounded percent vs the week before; null when it rounds to 0. [upIsBad] flips the colour (late returns). */
    fun percentBadge(change: WeeklyChange?, upIsBad: Boolean = false): WeeklyBadge? {
        val value = change?.growth?.takeIf { it.isFinite() }?.roundToInt() ?: return null
        if (value == 0) return null
        return badge(value, "%", upIsBad)
    }

    /** ▲ / ▼ count difference vs the week before (new orders, late returns); null when equal */
    fun countBadge(change: WeeklyChange?, upIsBad: Boolean = false): WeeklyBadge? {
        val diff = change?.let { (it.current - it.previous).roundToInt() } ?: return null
        if (diff == 0) return null
        return badge(diff, "", upIsBad)
    }

    private fun badge(value: Int, suffix: String, upIsBad: Boolean): WeeklyBadge {
        val up = value > 0
        return WeeklyBadge((if (up) "▲" else "▼") + abs(value) + suffix, if (up != upIsBad) WeeklyTone.GOOD else WeeklyTone.BAD)
    }

    /** "T2" … "CN" from the Monday-first list of the app ([weekdays], `order_row_weekdays`) */
    fun weekday(date: LocalDate, weekdays: List<String>): String = weekdays.getOrNull(date.dayOfWeek.value - 1).orEmpty()

    /** "T2 09/11" */
    fun dayLabel(date: LocalDate, weekdays: List<String>): String =
        "${weekday(date, weekdays)} %02d/%02d".format(date.dayOfMonth, date.monthValue).trim()

    /** "T2 09/11 – CN 15/11"; empty when the week is unknown */
    fun weekLabel(start: LocalDate?, end: LocalDate?, weekdays: List<String>): String = when {
        start == null || end == null -> ""
        else -> "${dayLabel(start, weekdays)} – ${dayLabel(end, weekdays)}"
    }

    /** "T2 16/11 08:12": when the summary was written, in the shop zone */
    fun writtenAt(instant: Instant, weekdays: List<String>, zone: ZoneId = ShopTime.zone): String {
        val local = instant.atZone(zone)
        return dayLabel(local.toLocalDate(), weekdays) + " %02d:%02d".format(local.hour, local.minute)
    }

    /** New orders per day, Monday first; a zero day keeps a small stub so it still shows */
    fun dayBars(byDay: List<WeeklyDayCount>, weekdays: List<String>): List<WeeklyDayBar> {
        val most = byDay.maxOfOrNull { it.count } ?: 0
        return byDay.map { day ->
            val ratio = if (most > 0) max(MIN_BAR, day.count.toDouble() / most) else MIN_BAR
            WeeklyDayBar(weekday(day.date, weekdays), day.count, ratio, most > 0 && day.count == most)
        }
    }

    /** Times a hot item went out last week: rentals and sales ("9 lượt"; a sold-only item is not "0") */
    fun times(product: WeeklyHotProduct): Int = product.rentals + product.sales

    /** "38 · 4 · 2"; "—" for a missing figure */
    fun joined(vararg values: Int?): String = values.joinToString(" · ") { it?.toString() ?: "—" }

    private const val MIN_BAR = 0.06

    // ---- parsing (tolerant: optional fields, unknown keys ignored; org.json `optDouble` of null is NaN) ----

    fun fromJson(data: JSONObject): WeeklySummary {
        val week = data.optJSONObject("week")
        val summary = data.optJSONObject("summary")
        return WeeklySummary(
            available = data.optBoolean("available", false),
            weekStart = day(week, "start"),
            weekEnd = day(week, "end"),
            nextWeekStart = day(data, "nextWeekStart"),
            status = when (text(data, "status")) {
                "READY" -> WeeklySummaryStatus.READY
                "NO_ORDERS" -> WeeklySummaryStatus.NO_ORDERS
                else -> WeeklySummaryStatus.NONE
            },
            branchName = text(data, "branchName"),
            generatedAt = text(summary, "generatedAt")?.let { runCatching { Instant.parse(it) }.getOrNull() },
            numbers = summary?.optJSONObject("numbers")?.let(::numbersFromJson),
            content = summary?.optJSONObject("content")?.let(::contentFromJson),
        )
    }

    private fun numbersFromJson(o: JSONObject): WeeklyNumbers {
        val revenue = o.optJSONObject("revenue")
        val orders = o.optJSONObject("orders")
        val rentals = o.optJSONObject("rentals")
        val products = o.optJSONObject("products")
        val customers = o.optJSONObject("customers")
        return WeeklyNumbers(
            orderValue = change(revenue?.optJSONObject("orderValue")),
            collected = change(revenue?.optJSONObject("collected")),
            outstanding = num(revenue, "outstanding"),
            fees = num(revenue, "fees"),
            branches = objects(o.optJSONArray("branches")).map { b ->
                WeeklyBranch(text(b, "name").orEmpty(), change(b.optJSONObject("orderValue")), int(b, "newOrders") ?: 0)
            },
            newOrders = change(orders?.optJSONObject("new")),
            rent = int(orders, "rent"),
            sale = int(orders, "sale"),
            cancelled = int(orders, "cancelled"),
            byDay = objects(orders?.optJSONArray("byDay")).mapNotNull { d ->
                day(d, "date")?.let { WeeklyDayCount(it, int(d, "count") ?: 0) }
            },
            pickedUp = int(rentals, "pickedUp"),
            returned = int(rentals, "returned"),
            late = change(rentals?.optJSONObject("late")),
            notPickedUp = int(rentals, "notPickedUp"),
            hot = objects(products?.optJSONArray("hot")).map { p ->
                WeeklyHotProduct(text(p, "name").orEmpty(), int(p, "rentals") ?: 0, int(p, "sales") ?: 0, num(p, "revenue") ?: 0.0)
            },
            customers = int(customers, "total"),
            newCustomers = int(customers, "new"),
            returningCustomers = int(customers, "returning"),
        )
    }

    private fun contentFromJson(o: JSONObject): WeeklyContent? {
        val summary = text(o, "summary") ?: return null
        val actions = o.optJSONArray("actions")?.let { arr ->
            (0 until arr.length()).mapNotNull { i -> if (arr.isNull(i)) null else arr.optString(i).trim().takeIf { it.isNotEmpty() } }
        }.orEmpty()
        return WeeklyContent(summary, actions, text(o, "revenueNote"), text(o, "ordersNote"), text(o, "productsNote"))
    }

    private fun change(o: JSONObject?): WeeklyChange? {
        val current = num(o, "current") ?: return null
        return WeeklyChange(current, num(o, "previous") ?: 0.0, num(o, "growth") ?: 0.0)
    }

    private fun objects(arr: JSONArray?): List<JSONObject> =
        if (arr == null) emptyList() else (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }

    private fun num(o: JSONObject?, key: String): Double? =
        if (o == null || !o.has(key) || o.isNull(key)) null else o.optDouble(key).takeIf { it.isFinite() }

    private fun int(o: JSONObject?, key: String): Int? = num(o, key)?.roundToInt()

    /** A trimmed non-blank string; null for a missing key or JSON null (Android's `optString` gives "null") */
    private fun text(o: JSONObject?, key: String): String? =
        if (o == null || !o.has(key) || o.isNull(key)) null else o.optString(key).trim().takeIf { it.isNotEmpty() }

    private fun day(o: JSONObject?, key: String): LocalDate? = text(o, key)?.let { runCatching { LocalDate.parse(it.take(10)) }.getOrNull() }
}
