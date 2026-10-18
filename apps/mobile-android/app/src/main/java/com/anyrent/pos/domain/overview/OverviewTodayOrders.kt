package com.anyrent.pos.domain.overview

import com.anyrent.pos.domain.ShopTime
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** #1059: the card's summary, the "Giá trị đơn mới" tile's count and value */
data class OverviewTodayOrdersSummary(val count: Int, val total: Double)

/** #1059: one order created today */
data class OverviewTodayOrderRow(
    val id: Int,
    val orderNumber: String,
    val customer: String,
    val createdAt: Instant?,
    val isRent: Boolean,
    val amount: Double,
)

/**
 * #1059 "Đơn tạo hôm nay" (iOS `OverviewDashLogic` #1059): on a range of exactly today the Overview lists today's new
 * orders instead of Top sản phẩm / Top khách hàng. Rows come from `GET /api/analytics/income/orders?status=new`.
 */
object OverviewTodayOrders {
    const val LIMIT = 5
    const val PAGE_SIZE = 200
    const val MAX_PAGES = 10

    /** A range of exactly today (Hôm nay, or Tuỳ chọn picking today); keyed off the range as `showsTodayCard` */
    fun showsTodayOrders(range: DayRange, today: LocalDate): Boolean = OverviewDashLogic.showsTodayCard(range, today)

    /** Top sản phẩm / Top khách hàng: every range but a range of exactly today */
    fun showsTopCards(range: DayRange, today: LocalDate): Boolean = !showsTodayOrders(range, today)

    /** One page of today's new orders: shop civil day, the merchant's chosen branch (#828) */
    fun path(range: DayRange, offset: Int, limit: Int = PAGE_SIZE, outletId: Int? = null): String =
        "/api/analytics/income/orders?startDate=${range.start}&endDate=${range.end}&status=new&plan=false" +
            "&limit=$limit&offset=$offset&timeZone=${ShopTime.timeZoneParam()}" + (outletId?.let { "&outletIds=$it" } ?: "")

    /**
     * N and the total are the tile itself (`tiles`: `totalOrderValue` and the "N đơn mới" chip, cancelled left out), so
     * the card and the tile never disagree. An API without `orderValueByType` falls back to [rowsCount].
     */
    fun summary(report: OverviewReport?, rowsCount: Int? = null): OverviewTodayOrdersSummary? {
        val tile = OverviewDashLogic.tiles(report, null).first { it.kind == OverviewTileKind.ORDER_VALUE }
        val total = tile.value ?: return null
        val count = tile.count?.count ?: rowsCount ?: return null
        return OverviewTodayOrdersSummary(count, total)
    }

    /** Cancelled orders left out (as the tile), one row per order, newest first, [limit] at most */
    fun rows(items: List<IncomeRow>, limit: Int = LIMIT): List<OverviewTodayOrderRow> =
        items.asSequence()
            .filter { !it.status.equals("CANCELLED", ignoreCase = true) }
            .distinctBy { it.id }
            .map {
                OverviewTodayOrderRow(it.id, it.orderNumber, it.customerName, it.createdAt,
                    isRent = !it.orderType.equals("SALE", ignoreCase = true), amount = it.totalAmount)
            }
            .sortedWith(compareByDescending<OverviewTodayOrderRow, Instant?>(nullsFirst()) { it.createdAt }.thenByDescending { it.id })
            .take(limit.coerceAtLeast(0))
            .toList()

    /** Non-cancelled orders in the rows (the summary's fallback count on an older API) */
    fun count(items: List<IncomeRow>): Int =
        items.filter { !it.status.equals("CANCELLED", ignoreCase = true) }.map { it.id }.toSet().size

    /** "#901052 · 18:50": created time in the shop zone */
    fun numberAndTime(row: OverviewTodayOrderRow, zone: ZoneId = ShopTime.zone): String {
        val number = if (row.orderNumber.startsWith("#")) row.orderNumber else "#${row.orderNumber}"
        val created = row.createdAt ?: return number
        return "$number · ${DateTimeFormatter.ofPattern("HH:mm").withZone(zone).format(created)}"
    }

    /** "#901052 · 18:50 · Thuê" / "… · Bán" with the app's [rent] / [sale] words */
    fun subtitle(row: OverviewTodayOrderRow, rent: String, sale: String, zone: ZoneId = ShopTime.zone): String =
        "${numberAndTime(row, zone)} · ${if (row.isRent) rent else sale}"
}
