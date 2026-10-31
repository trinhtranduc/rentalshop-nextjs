package com.anyrent.pos.data.repository

import com.anyrent.pos.data.CurrentOutlet
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.deposit.InstallmentReminderRow
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.domain.overview.OverviewLogic
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant

/** Today's work of the outlet team for the shop day (#371, #602) */
class DefaultTodayWorkRepository(
    private val fetch: () -> JSONObject = {
        ApiClient.get().authedGet(OverviewLogic.outletOperationsPath(CurrentOutlet.merchantFilterId))
    },
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : TodayWorkRepository {
    override suspend fun load(): Result<TodayWork> = withContext(ioDispatcher) {
        runCatching { todayWorkFromJson(fetch().optJSONObject("data") ?: JSONObject()) }
    }
}

/** The `data` object of `GET /api/analytics/outlet-operations` */
internal fun todayWorkFromJson(data: JSONObject): TodayWork {
    fun rows(key: String): List<TodayWorkRow>? {
        val group = data.optJSONObject(key) ?: return null
        val orders = group.optJSONArray("orders") ?: return emptyList()
        return (0 until orders.length()).mapNotNull { orders.optJSONObject(it)?.let(::todayWorkRowFromJson) }
    }
    // #1231: a deposit stage is a To do row of its order (`id` = the order, so a tap opens its detail)
    fun stages(key: String): List<TodayWorkRow> =
        InstallmentReminderRow.listFrom(data.optJSONObject(key)).map {
            TodayWorkRow(
                id = it.orderId, orderNumber = it.orderNumber, customerName = it.customerName,
                totalAmount = it.remaining, amountDue = it.remaining, lateDays = it.lateDays,
                stageLabel = it.label, stageKey = it.key,
            )
        }
    // #1381 the API's `count` (the rows stop at 50); the rows' number on an answer without it
    fun count(key: String, rows: List<TodayWorkRow>?): Int? =
        data.optJSONObject(key)?.let { if (it.has("count") && !it.isNull("count")) it.optInt("count") else rows?.size }
    val pickups = rows("pickupsToday").orEmpty()
    val returns = rows("returnsToday").orEmpty()
    val overdue = rows("overdueReturns").orEmpty()
    val noShows = rows("noShows").orEmpty()
    val tomorrowPickups = rows("tomorrowPickups")
    val tomorrowReturns = rows("tomorrowReturns")
    val done = data.optJSONObject("doneToday")
    return TodayWork(
        pickupsToday = pickups,
        returnsToday = returns,
        overdueReturns = overdue,
        noShows = noShows,
        tomorrowPickups = tomorrowPickups,
        tomorrowReturns = tomorrowReturns,
        installmentsDue = stages("installmentsDue"),
        installmentsOverdue = stages("installmentsOverdue"),
        date = if (data.isNull("date")) null else data.optString("date").takeIf { it.isNotBlank() },
        doneToday = (done?.optInt("pickups", 0) ?: 0) + (done?.optInt("returns", 0) ?: 0),
        pickupsCount = count("pickupsToday", pickups) ?: pickups.size,
        returnsCount = count("returnsToday", returns) ?: returns.size,
        overdueCount = count("overdueReturns", overdue) ?: overdue.size,
        noShowsCount = count("noShows", noShows) ?: noShows.size,
        tomorrowPickupsCount = count("tomorrowPickups", tomorrowPickups),
        tomorrowReturnsCount = count("tomorrowReturns", tomorrowReturns),
    )
}

private fun todayWorkRowFromJson(o: JSONObject): TodayWorkRow {
    fun text(key: String): String? =
        if (o.isNull(key)) null else o.optString(key).takeIf { it.isNotBlank() }
    fun instant(key: String): Instant? = text(key)?.let { runCatching { Instant.parse(it) }.getOrNull() }
    fun number(key: String): Double = o.optDouble(key).let { if (it.isNaN()) 0.0 else it }

    // Item names with quantity ("Áo dài ×2", board Main) when the API sends them; otherwise the joined names
    val items = o.optJSONArray("items")
    val fromItems = (0 until (items?.length() ?: 0)).mapNotNull { index ->
        val item = items?.optJSONObject(index) ?: return@mapNotNull null
        val name = if (item.isNull("name")) "" else item.optString("name")
        if (name.isBlank()) return@mapNotNull null
        val quantity = item.optInt("quantity", 1)
        if (quantity > 1) "$name ×$quantity" else name
    }
    // #1381 the widget's "Áo dài gấm đỏ +1": from the items when the API sent them, else from the joined names
    val itemNames = (0 until (items?.length() ?: 0)).mapNotNull { index ->
        items?.optJSONObject(index)?.takeUnless { it.isNull("name") }?.optString("name")?.takeIf { it.isNotBlank() }
    }.ifEmpty { text("productNames").orEmpty().split(", ").map { it.trim() }.filter { it.isNotEmpty() } }
    return TodayWorkRow(
        id = o.optInt("id"),
        orderNumber = o.optString("orderNumber"),
        customerName = text("customerName"),
        customerPhone = text("customerPhone"),
        pickupPlanAt = instant("pickupPlanAt"),
        returnPlanAt = instant("returnPlanAt"),
        isReadyToDeliver = o.optBoolean("isReadyToDeliver", false),
        productNames = if (fromItems.isNotEmpty()) fromItems.joinToString(", ") else text("productNames").orEmpty(),
        totalAmount = number("totalAmount"),
        amountDue = number("amountDue"),
        refundDue = number("refundDue"),
        lateDays = o.optInt("lateDays", 0),
        firstItemName = itemNames.firstOrNull().orEmpty(),
        itemCount = itemNames.size,
    )
}
