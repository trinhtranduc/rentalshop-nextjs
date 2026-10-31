package com.anyrent.pos.domain.widget

import java.time.Instant
import java.util.Locale

/** The widget's words, from the app's strings. `lateDays` is the app's own "Trễ N ngày" plural. */
data class TodayWidgetLabels(
    val today: String,
    val late: String,
    val pickup: String,
    val returnTask: String,
    val notPrepared: String,
    val moreFormat: String,
    val updatedFormat: String,
    val doneFormat: String,
    val doneCaption: String,
    val allDoneFormat: String,
    val todayAtFormat: String,
    val empty: String,
    val tomorrowFormat: String,
    val loggedOut: String,
    val loggedOutHint: String,
    val noAccess: String,
    val stale: String,
    val staleFormat: String,
    val yesterday: String,
    val hiddenName: String,
    val appName: String,
    val pickupDayWord: String,
    val returnDayWord: String,
    val lateDays: (Int) -> String,
)

/**
 * What the widget draws at a given instant, iOS `TodayWidgetDisplay`. Pure: the same file gives "Cũ" after the Vietnam
 * midnight with no network, and yesterday's list is never shown as today's. The Glance views only draw what is here.
 */
data class TodayWidgetDisplay(
    val kind: Kind,
    val labels: TodayWidgetLabels,
    /** Left of the header: "Hôm nay", or "AnyRent" while signed out */
    val title: String,
    /** Today's Vietnam day: "31/10" */
    val dayText: String,
    val counts: TodayWidgetCounts,
    val done: Int,
    /** Done today plus what is left */
    val total: Int,
    val lines: List<Line> = emptyList(),
    val moreText: String? = null,
    val updatedText: String? = null,
    val tomorrowText: String? = null,
    val staleDetail: String? = null,
    val hidesNames: Boolean = false,
) {
    enum class Kind { LOGGED_OUT, NO_ACCESS, STALE, EMPTY, ALL_DONE, WORK }

    /** A late job is TRỄ whether it is a hand-over or a return */
    enum class Chip { LATE, PICKUP, RETURN }

    data class Line(
        val orderId: Int,
        val chip: Chip,
        /** "TRỄ", "GIAO", "TRẢ" */
        val chipText: String,
        /** Empty when names are off: the widget draws `labels.hiddenName` */
        val name: String,
        /** Line 1, right: "Trễ 3 ngày" or "Hôm nay · 14:00" / "Hôm nay" */
        val rightText: String,
        val rightIsLate: Boolean,
        /** Line 2, left: "Áo dài gấm đỏ +1" */
        val productText: String,
        /** Line 2, right: "Chưa soạn đồ", orange text with a warning icon, no background */
        val warningText: String?,
        /** Line 2, right, a late row without the warning: "Lấy 28/10/26" */
        val dayText: String?,
        /** `anyrent://order/<id>` */
        val url: String,
    )

    val progressText: String get() = "$done/$total"

    /** 0..1 for the ring */
    val progress: Double get() = if (total > 0) (done.toDouble() / total).coerceAtMost(1.0) else 0.0

    /** "Xong hết 10/10" */
    val allDoneText: String? get() = if (kind == Kind.ALL_DONE) labels.allDoneFormat.format(done, total) else null

    /** "xong 4/10 · +4 việc khác · cập nhật 08:12" */
    val footerText: String
        get() = listOfNotNull(labels.doneFormat.format(done, total), moreText, updatedText).joinToString(" · ")

    companion object {
        /**
         * @param userId who is signed in now, null when nobody is. A file of another account is never drawn.
         * @param rowLimit 0 for the small widget (ring and counters only)
         */
        fun make(snapshot: TodayWidgetSnapshot?, userId: Int?, now: Instant, rowLimit: Int, labels: TodayWidgetLabels): TodayWidgetDisplay {
            val none = TodayWidgetCounts(0, 0, 0)
            if (userId == null) {
                return TodayWidgetDisplay(Kind.LOGGED_OUT, labels, labels.appName, "", none, 0, 0)
            }
            val today = TodayWidgetClock.dayMonthText(now)
            // Signed in with no list of this account yet (first run, no network): nothing to show, and not "sign in"
            if (snapshot == null || snapshot.userId != userId) {
                return TodayWidgetDisplay(Kind.STALE, labels, labels.today, today, none, 0, 0)
            }
            val done = snapshot.done.coerceAtLeast(0)
            val counts = snapshot.counts
            val total = done + counts.total
            val base = TodayWidgetDisplay(
                Kind.WORK, labels, labels.today, today, counts, done, total, hidesNames = snapshot.hideNames,
            )
            if (snapshot.state == TodayWidgetSnapshot.State.NO_ACCESS) return base.copy(kind = Kind.NO_ACCESS)
            if (!snapshot.isFresh(now)) {
                return base.copy(
                    kind = Kind.STALE,
                    staleDetail = labels.staleFormat.format(lastUpdatedText(snapshot.savedAt, now, labels)),
                )
            }
            val updated = labels.updatedFormat.format(TodayWidgetClock.timeText(snapshot.savedAt))
            if (counts.total == 0) {
                return base.copy(
                    kind = if (done > 0) Kind.ALL_DONE else Kind.EMPTY,
                    updatedText = updated,
                    tomorrowText = tomorrowText(counts, labels),
                )
            }
            val shown = snapshot.rows.take(rowLimit.coerceAtLeast(0)).map { line(it, labels, snapshot.hideNames) }
            val more = (counts.total - shown.size).coerceAtLeast(0)
            return base.copy(
                lines = shown,
                moreText = if (more > 0 && rowLimit > 0) labels.moreFormat.format(more) else null,
                updatedText = updated,
            )
        }

        fun line(row: TodayWidgetRow, labels: TodayWidgetLabels, hideNames: Boolean): Line {
            val late = row.isLate || row.lateDays > 0
            val pickup = row.kind == TodayWidgetRow.Kind.PICKUP
            val chip = when {
                late -> Chip.LATE
                pickup -> Chip.PICKUP
                else -> Chip.RETURN
            }
            val word = when (chip) {
                Chip.LATE -> labels.late
                Chip.PICKUP -> labels.pickup
                Chip.RETURN -> labels.returnTask
            }
            val hasLateText = late && row.lateDays > 0
            val right = when {
                hasLateText -> labels.lateDays(row.lateDays)
                row.planTime.isEmpty() -> labels.today
                else -> labels.todayAtFormat.format(row.planTime)
            }
            val warning = if (pickup && row.notPrepared) labels.notPrepared else null
            val day = if (late && warning == null && row.planDay.isNotEmpty()) {
                "${if (pickup) labels.pickupDayWord else labels.returnDayWord} ${row.planDay}"
            } else {
                null
            }
            return Line(
                orderId = row.orderId,
                chip = chip,
                chipText = word.uppercase(Locale.ROOT),
                name = if (hideNames) "" else row.name,
                rightText = right,
                rightIsLate = hasLateText,
                productText = productText(row),
                warningText = warning,
                dayText = day,
                url = TodayWidgetLink.orderUrl(row.orderId),
            )
        }

        private fun productText(row: TodayWidgetRow): String = when {
            row.product.isEmpty() -> ""
            row.moreCount > 0 -> "${row.product} +${row.moreCount}"
            else -> row.product
        }

        private fun tomorrowText(counts: TodayWidgetCounts, labels: TodayWidgetLabels): String? {
            if (counts.tomorrowPickup == null && counts.tomorrowReturn == null) return null
            val pickups = counts.tomorrowPickup ?: 0
            val returns = counts.tomorrowReturn ?: 0
            return if (pickups + returns > 0) labels.tomorrowFormat.format(pickups, returns) else null
        }

        /** "08:12" on the same Vietnam day, "hôm qua 17:40" the day before, "29/10 17:40" earlier */
        private fun lastUpdatedText(savedAt: Instant, now: Instant, labels: TodayWidgetLabels): String {
            val time = TodayWidgetClock.timeText(savedAt)
            val saved = TodayWidgetClock.dayKey(savedAt)
            if (saved == TodayWidgetClock.dayKey(now)) return time
            if (saved == TodayWidgetClock.dayKey(now.minusSeconds(24 * 3600))) return "${labels.yesterday} $time"
            return "${TodayWidgetClock.dayMonthText(savedAt)} $time"
        }
    }
}
