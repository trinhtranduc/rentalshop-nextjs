package com.anyrent.pos.domain.orders

import java.time.Instant

/** One order of "Việc cần làm" (#371), a row of `GET /api/analytics/outlet-operations` */
data class TodayWorkRow(
    val id: Int,
    val orderNumber: String,
    val customerName: String? = null,
    val customerPhone: String? = null,
    val pickupPlanAt: Instant? = null,
    val returnPlanAt: Instant? = null,
    val isReadyToDeliver: Boolean = false,
    val productNames: String = "",
    val totalAmount: Double = 0.0,
    val amountDue: Double = 0.0,
    val refundDue: Double = 0.0,
    val lateDays: Int = 0,
)

data class TodayWork(
    val pickupsToday: List<TodayWorkRow> = emptyList(),
    val returnsToday: List<TodayWorkRow> = emptyList(),
    val overdueReturns: List<TodayWorkRow> = emptyList(),
    val noShows: List<TodayWorkRow> = emptyList(),
    /** Null on an older API: the "Ngày mai" group is hidden */
    val tomorrowPickups: List<TodayWorkRow>? = null,
    val tomorrowReturns: List<TodayWorkRow>? = null,
)

interface TodayWorkRepository {
    /** Fails with `AppError.Http(403)` when the user lacks the dashboard permission */
    suspend fun load(): Result<TodayWork>
}
