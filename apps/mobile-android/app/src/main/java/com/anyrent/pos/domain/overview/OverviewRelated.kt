package com.anyrent.pos.domain.overview

import androidx.annotation.StringRes
import com.anyrent.pos.R
import com.anyrent.pos.domain.ShopTime
import org.json.JSONObject

/**
 * #722 "Xem các đơn liên quan" of an Overview figure: the rows behind the number, each with the money it adds, and
 * their total equals the figure. Same rules as iOS `OverviewDashLogic.relatedRows` and web `overview-model.ts`.
 * Rows come from `GET /api/analytics/income/orders` ([buckets]), every page.
 */
enum class OverviewRelatedKind(val key: String, val buckets: List<String>) {
    /** Orders created in the period; a cancelled one is listed with 0 (Σ = `totalOrderValue`) */
    ORDER_VALUE("orderValue", listOf("new")),

    /** Every money event of the period, collateral included (Σ = `cashCollected`) */
    COLLECTED("collected", listOf("all")),

    /** Orders created in the period still owing: rent booked owes total − deposit, a sale not done its total */
    OUTSTANDING("outstanding", listOf("new")),

    /** Each event's `collateral` (#721): + at hand-over, − at return or cancel (Σ = received − returned) */
    COLLATERAL("collateral", listOf("all")),
    ;

    companion object {
        fun from(key: String?): OverviewRelatedKind? = entries.firstOrNull { it.key == key }
    }
}

/** #1273: the two parts of Thế chân. [returnedTotal] is a positive number; [net] = received − returned */
data class CollateralSections(
    val held: List<RelatedRow>,
    val heldTotal: Double,
    /** The API `count` when its list is cut, else the rows */
    val heldOrders: Int,
    /** false when the API list is cut: the sum would be wrong, so no total is shown */
    val heldTotalKnown: Boolean,
    val received: List<RelatedRow>,
    val returned: List<RelatedRow>,
    val receivedTotal: Double,
    val returnedTotal: Double,
    val receivedOrders: Int,
    val returnedOrders: Int,
) {
    val net: Double get() = receivedTotal - returnedTotal
}

/** One row of `GET /api/analytics/income/orders` (an order on one day of the period) */
data class IncomeRow(
    val id: Int,
    val orderNumber: String,
    val orderType: String,
    val status: String,
    val revenue: Double,
    val description: String,
    val customerName: String,
    val totalAmount: Double,
    val depositAmount: Double,
    /** #721, `status=all` rows only; null on an older API */
    val collateral: Double?,
    /** `SALE`, `RENT_DEPOSIT` ... `MULTIPLE` (#757); blank on an older API */
    val revenueType: String = "",
    /** #1059: when the order was created; null when missing or unreadable */
    val createdAt: java.time.Instant? = null,
)

/** [HELD] (#938): an order whose collateral is held now; listed on Thế chân, not part of the period total */
enum class RelatedNote { CREATED, CANCELLED, EVENT, OWES, COLLATERAL_IN, COLLATERAL_OUT, HELD }

data class RelatedRow(
    val id: Int,
    val orderNumber: String,
    val customer: String,
    val note: RelatedNote,
    /** The API's event text, the fallback of [RelatedNote.EVENT] */
    val description: String,
    /** #757: the event reasons of [RelatedNote.EVENT], one per joined event, in the app's language */
    val reasons: List<EventPart> = emptyList(),
    val amount: Double,
)

/** One event of a Collected row: its [reason] (a string of the app) or, when unknown, the API [text] */
data class EventPart(val reason: EventReason?, val text: String)

/**
 * #757: why money moved, from `revenueType` (or from the API's own sentence, which also splits a `MULTIPLE` row
 * "a + b"). The API `description` is Vietnamese, so the English app maps it to strings.
 */
enum class EventReason(@StringRes val res: Int) {
    SALE_CREATED(R.string.overview_v2_event_sale_created),
    SALE_CANCELLED(R.string.overview_v2_event_sale_cancelled),
    DEPOSIT(R.string.overview_v2_event_deposit),
    PICKUP(R.string.overview_v2_event_pickup),
    SAME_DAY(R.string.overview_v2_event_same_day),
    DAMAGE_FEE(R.string.overview_v2_event_damage_fee),
    DEPOSIT_REFUND(R.string.overview_v2_event_deposit_refund),
    NOTHING(R.string.overview_v2_event_nothing),
    RENT_CANCELLED(R.string.overview_v2_event_rent_cancelled),
    RETURN_COLLECTED(R.string.overview_v2_event_return_collected),
    FUTURE_PICKUP(R.string.overview_v2_event_future_pickup),
    FUTURE_DAMAGE_FEE(R.string.overview_v2_event_future_damage_fee),
    FUTURE_REFUND(R.string.overview_v2_event_future_refund),
    FUTURE_NOTHING(R.string.overview_v2_event_future_nothing),
    /** #1199 a deposit stage collected on its own day (`RENT_INSTALLMENT`) */
    INSTALLMENT(R.string.overview_v2_event_installment),
    ;

    companion object {
        /** The API's sentences (`revenue-calculator.ts`) */
        private val known = mapOf(
            "Đơn bán được tạo" to SALE_CREATED, "Đơn bán bị hủy (hoàn lại)" to SALE_CANCELLED,
            "Thu tiền cọc" to DEPOSIT, "Thu tiền khi lấy hàng" to PICKUP, "Thuê và trả trong cùng ngày" to SAME_DAY,
            "Thu phí hư hỏng" to DAMAGE_FEE, "Hoàn tiền cọc" to DEPOSIT_REFUND, "Không có phát sinh" to NOTHING,
            "Đơn hủy (hoàn lại)" to RENT_CANCELLED, "Doanh thu dự kiến khi lấy hàng" to FUTURE_PICKUP,
            "Ước tính thu phí hư hỏng khi trả hàng" to FUTURE_DAMAGE_FEE,
            "Ước tính hoàn tiền cọc khi trả hàng" to FUTURE_REFUND,
            "Ước tính không có phát sinh khi trả hàng" to FUTURE_NOTHING,
        )

        fun forType(revenueType: String, revenue: Double): EventReason? = when (revenueType) {
            "SALE" -> SALE_CREATED
            "SALE_CANCELLED" -> SALE_CANCELLED
            "RENT_DEPOSIT" -> DEPOSIT
            "RENT_PICKUP" -> PICKUP
            "RENT_INSTALLMENT" -> INSTALLMENT
            "RENT_CANCELLED" -> RENT_CANCELLED
            "RENT_FUTURE_PICKUP" -> FUTURE_PICKUP
            "RENT_RETURN" -> if (revenue < 0) DEPOSIT_REFUND else if (revenue > 0) RETURN_COLLECTED else NOTHING
            "RENT_FUTURE_RETURN" -> if (revenue < 0) FUTURE_REFUND else if (revenue > 0) FUTURE_DAMAGE_FEE else FUTURE_NOTHING
            else -> null
        }

        fun parts(revenueType: String, description: String, revenue: Double): List<EventPart> {
            val type = revenueType.uppercase()
            if (type == "MULTIPLE" || (type.isEmpty() && description.contains(" + "))) {
                return description.split(" + ").map { EventPart(known[it], it) }
            }
            return listOf(EventPart(known[description] ?: forType(type, revenue), description))
        }
    }
}

object OverviewRelated {
    /**
     * #1062: one page of `GET /api/analytics/income/orders` for a bucket. The shop civil day (`timeZone`) and the
     * merchant's branch chosen on Home (`outletIds`, #828) as the tiles, so the rows add up to the tile.
     */
    fun path(startDate: String, endDate: String, status: String, offset: Int, limit: Int, outletId: Int?): String =
        "/api/analytics/income/orders?startDate=$startDate&endDate=$endDate&status=$status&plan=false" +
            "&limit=$limit&offset=$offset&timeZone=${ShopTime.timeZoneParam()}" + (outletId?.let { "&outletIds=$it" } ?: "")

    /** What each row adds to the figure; rows that add nothing to Còn phải thu or Thế chân are left out */
    fun rows(kind: OverviewRelatedKind, items: List<IncomeRow>): List<RelatedRow> = items.mapNotNull { item ->
        val type = item.orderType.uppercase()
        val status = item.status.uppercase()
        val (amount, note) = when (kind) {
            OverviewRelatedKind.ORDER_VALUE ->
                if (status == "CANCELLED") 0.0 to RelatedNote.CANCELLED else item.totalAmount to RelatedNote.CREATED
            OverviewRelatedKind.COLLECTED -> item.revenue to RelatedNote.EVENT
            OverviewRelatedKind.OUTSTANDING -> {
                val owed = when {
                    type == "RENT" && status == "RESERVED" -> (item.totalAmount - item.depositAmount).coerceAtLeast(0.0)
                    type == "SALE" && status != "COMPLETED" && status != "CANCELLED" -> item.totalAmount
                    else -> 0.0
                }
                if (owed <= 0) return@mapNotNull null
                owed to RelatedNote.OWES
            }
            OverviewRelatedKind.COLLATERAL -> {
                val moved = item.collateral ?: 0.0
                if (moved == 0.0) return@mapNotNull null
                moved to if (moved > 0) RelatedNote.COLLATERAL_IN else RelatedNote.COLLATERAL_OUT
            }
        }
        val reasons = if (note == RelatedNote.EVENT) EventReason.parts(item.revenueType, item.description, amount) else emptyList()
        RelatedRow(item.id, item.orderNumber, item.customerName, note, item.description, reasons, amount)
    }

    /** Σ of the period rows (= the figure); [RelatedNote.HELD] rows are listed only (#938) */
    fun total(rows: List<RelatedRow>): Double = rows.filter { it.note != RelatedNote.HELD }.sumOf { it.amount }

    /** Rows behind the total (#938: held rows left out) */
    fun count(rows: List<RelatedRow>): Int = rows.count { it.note != RelatedNote.HELD }

    /** #938: the orders holding collateral now, `data.collateralHeld.orders` of outlet-operations (`collateralHeld=1`) */
    fun heldRows(data: JSONObject): List<RelatedRow> {
        val orders = data.optJSONObject("collateralHeld")?.optJSONArray("orders") ?: return emptyList()
        return (0 until orders.length()).mapNotNull { i ->
            val o = orders.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optInt("id")
            val amount = if (o.isNull("securityDeposit")) 0.0 else o.optDouble("securityDeposit").takeIf { !it.isNaN() } ?: 0.0
            if (id <= 0 || amount <= 0) return@mapNotNull null
            val number = if (o.isNull("orderNumber")) "" else o.optString("orderNumber")
            val customer = if (o.isNull("customerName")) "" else o.optString("customerName")
            RelatedRow(id, number.ifBlank { "#$id" }, customer, RelatedNote.HELD, "", amount = amount)
        }
    }

    /** #1273: `data.collateralHeld.count`, the orders held (the list is cut at 500); null on an older API or without the money right */
    fun heldCount(data: JSONObject): Int? {
        val group = data.optJSONObject("collateralHeld") ?: return null
        return if (group.has("count") && !group.isNull("count")) group.optInt("count") else null
    }

    /** #1273 Thế chân in two sections: the state now ([held]) and the flow of the period (+ received, − returned); never added to each other */
    fun sections(held: List<RelatedRow>, heldCount: Int?, rows: List<RelatedRow>): CollateralSections {
        val heldOnly = held.filter { it.note == RelatedNote.HELD }
        val flow = rows.filter { it.note != RelatedNote.HELD }
        val received = flow.filter { it.amount > 0 }
        val returned = flow.filter { it.amount < 0 }
        val cut = heldCount != null && heldCount > heldOnly.size
        return CollateralSections(
            held = heldOnly,
            heldTotal = heldOnly.sumOf { it.amount },
            heldOrders = if (cut) heldCount!! else heldOnly.map { it.id }.toSet().size,
            heldTotalKnown = !cut,
            received = received,
            returned = returned,
            receivedTotal = received.sumOf { it.amount },
            returnedTotal = -returned.sumOf { it.amount },
            receivedOrders = received.map { it.id }.toSet().size,
            returnedOrders = returned.map { it.id }.toSet().size,
        )
    }

    /** The flow part is "hôm nay" only for the one-day range of today */
    fun flowIsToday(startDate: String, endDate: String, todayKey: String): Boolean = startDate == endDate && startDate == todayKey

    /** `2026-10-27` → `27/10` */
    fun dayMonth(key: String): String {
        val parts = key.split("-")
        return if (parts.size == 3) "${parts[2]}/${parts[1]}" else key
    }

    /** One page of `data`: every order row of every day (an order may be on several days), and whether more follow */
    fun pageFromJson(data: JSONObject): Pair<List<IncomeRow>, Boolean> {
        fun text(o: JSONObject, key: String) = if (o.isNull(key)) "" else o.optString(key)
        fun number(o: JSONObject, key: String) = if (!o.has(key) || o.isNull(key)) null else o.optDouble(key).takeIf { !it.isNaN() }
        val days = data.optJSONArray("days")
        val rows = buildList {
            for (i in 0 until (days?.length() ?: 0)) {
                val orders = days?.optJSONObject(i)?.optJSONArray("orders") ?: continue
                for (j in 0 until orders.length()) {
                    val o = orders.optJSONObject(j) ?: continue
                    val id = o.optInt("id")
                    if (id <= 0) continue
                    add(
                        IncomeRow(
                            id = id,
                            orderNumber = text(o, "orderNumber").ifBlank { "#$id" },
                            orderType = text(o, "orderType"),
                            status = text(o, "status"),
                            revenue = number(o, "revenue") ?: 0.0,
                            description = text(o, "description"),
                            customerName = text(o, "customerName"),
                            totalAmount = number(o, "totalAmount") ?: 0.0,
                            depositAmount = number(o, "depositAmount") ?: 0.0,
                            collateral = number(o, "collateral"),
                            revenueType = text(o, "revenueType"),
                            createdAt = text(o, "createdAt").takeIf { it.isNotBlank() }
                                ?.let { runCatching { java.time.Instant.parse(it) }.getOrNull() },
                        ),
                    )
                }
            }
        }
        return rows to (data.optJSONObject("pagination")?.optBoolean("hasMore") == true)
    }
}
