package com.anyrent.pos.domain.overview

import androidx.annotation.StringRes
import com.anyrent.pos.R
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
)

enum class RelatedNote { CREATED, CANCELLED, EVENT, OWES, COLLATERAL_IN, COLLATERAL_OUT }

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

    fun total(rows: List<RelatedRow>): Double = rows.sumOf { it.amount }

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
                        ),
                    )
                }
            }
        }
        return rows to (data.optJSONObject("pagination")?.optBoolean("hasMore") == true)
    }
}
