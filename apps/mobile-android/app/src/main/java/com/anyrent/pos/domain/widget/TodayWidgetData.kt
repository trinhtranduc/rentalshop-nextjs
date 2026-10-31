package com.anyrent.pos.domain.widget

import com.anyrent.pos.domain.DayText
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import com.anyrent.pos.ui.orders.v2.OrdersRow
import com.anyrent.pos.ui.orders.v2.SectionKind
import com.anyrent.pos.ui.orders.v2.WorkKind
import com.anyrent.pos.domain.ShopTime
import java.time.Instant

/**
 * From the answer of `GET /api/analytics/outlet-operations` to the widget's file, iOS `TodayWidgetData`. The order is
 * the tab's (`OrdersHomeLogic.todaySections`): late first, most late first, then hand-overs, then returns. A deposit
 * stage ("Thu cọc") and tomorrow's jobs are not part of the widget. No phone, no money, no photo.
 */
object TodayWidgetData {
    fun counts(work: TodayWork) = TodayWidgetCounts(
        late = work.noShowsCount + work.overdueCount,
        pickup = work.pickupsCount,
        returns = work.returnsCount,
        tomorrowPickup = work.tomorrowPickupsCount,
        tomorrowReturn = work.tomorrowReturnsCount,
    )

    fun snapshot(work: TodayWork, userId: Int, outletId: Int, hideNames: Boolean, now: Instant): TodayWidgetSnapshot {
        val sections = OrdersHomeLogic.todaySections(work)
        fun rows(kind: SectionKind, isLate: Boolean) = sections.filter { it.kind == kind }.flatMap { it.rows }
            .filterIsInstance<OrdersRow.Work>()
            .filter { it.kind != WorkKind.COLLECT }
            .map { row(it.row, it.kind, isLate, hideNames) }
        return TodayWidgetSnapshot(
            userId = userId,
            outletId = outletId,
            date = work.date?.takeIf { it.isNotBlank() } ?: TodayWidgetClock.dayKey(now),
            savedAt = now,
            state = TodayWidgetSnapshot.State.OK,
            hideNames = hideNames,
            done = work.doneToday,
            counts = counts(work),
            rows = (rows(SectionKind.LATE, isLate = true) + rows(SectionKind.TODAY, isLate = false)).take(TodayWidgetSnapshot.MAX_ROWS),
        )
    }

    private fun row(job: TodayWorkRow, kind: WorkKind, isLate: Boolean, hideNames: Boolean): TodayWidgetRow {
        // The job's own planned instant: the pickup of a hand-over, the return of a take-back
        val planned = if (kind == WorkKind.HAND_OVER) job.pickupPlanAt else job.returnPlanAt
        return TodayWidgetRow(
            orderId = job.id,
            kind = if (kind == WorkKind.HAND_OVER) TodayWidgetRow.Kind.PICKUP else TodayWidgetRow.Kind.RETURN,
            isLate = isLate,
            name = if (hideNames) "" else job.customerName.orEmpty(),
            product = job.firstItemName,
            moreCount = (job.itemCount - 1).coerceAtLeast(0),
            lateDays = job.lateDays,
            notPrepared = OrdersBoardLogic.notPreparedApplies(kind, job.isReadyToDeliver),
            planTime = planned?.let(TodayWidgetClock::timeOfDayText).orEmpty(),
            planDay = planned?.let { DayText.dmy(it, ShopTime.zone) }.orEmpty(),
        )
    }
}
