package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.deviceTimeZoneId
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URLEncoder
import java.time.Instant

/** Today's work of the outlet team for the device day (#371) */
class DefaultTodayWorkRepository(
    private val fetch: () -> JSONObject = {
        val zone = URLEncoder.encode(deviceTimeZoneId(), "UTF-8")
        ApiClient.get().authedGet("/api/analytics/outlet-operations?timeZone=$zone")
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
    return TodayWork(
        pickupsToday = rows("pickupsToday").orEmpty(),
        returnsToday = rows("returnsToday").orEmpty(),
        overdueReturns = rows("overdueReturns").orEmpty(),
        noShows = rows("noShows").orEmpty(),
        tomorrowPickups = rows("tomorrowPickups"),
        tomorrowReturns = rows("tomorrowReturns"),
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
    )
}
