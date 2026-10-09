package com.anyrent.pos.domain.overview

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
)

enum class RelatedNote { CREATED, CANCELLED, EVENT, OWES, COLLATERAL_IN, COLLATERAL_OUT }

data class RelatedRow(
    val id: Int,
    val orderNumber: String,
    val customer: String,
    val note: RelatedNote,
    /** The API's event text, shown for [RelatedNote.EVENT] */
    val description: String,
    val amount: Double,
)

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
        RelatedRow(item.id, item.orderNumber, item.customerName, note, item.description, amount)
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
                        ),
                    )
                }
            }
        }
        return rows to (data.optJSONObject("pagination")?.optBoolean("hasMore") == true)
    }
}
