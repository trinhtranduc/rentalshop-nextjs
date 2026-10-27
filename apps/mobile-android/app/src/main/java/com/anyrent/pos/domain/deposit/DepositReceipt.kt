package com.anyrent.pos.domain.deposit

import com.anyrent.pos.R
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.orders.ShareText
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId

/** One stage of the bill: its name and amount, then a small line ("30% đơn · 26/10") and its status ("Đã thu") */
data class DepositReceiptStage(val title: ShareText, val amount: Double, val detail: ShareText?, val status: ShareText?)

/** The block "Thu cọc theo giai đoạn" of the printed bill and of the share image (iOS `DepositPlanReceipt`, #1252) */
data class DepositReceiptBlock(
    val title: ShareText,
    val stages: List<DepositReceiptStage>,
    val collected: Double,
    val remaining: Double,
)

object DepositReceipt {
    /**
     * Null for a one-time deposit, a sale, or an order the API sent without stages (an older API), so those bills
     * do not change. A void stage is not listed. [todayKey] is the shop day `YYYY-MM-DD` (late days).
     */
    fun block(
        isRent: Boolean,
        hasPlan: Boolean?,
        stages: List<OrderInstallment>?,
        summary: InstallmentSummary?,
        todayKey: String,
        zone: ZoneId = ShopTime.zone,
    ): DepositReceiptBlock? {
        val shown = stages.orEmpty().filter { it.status != "VOID" }
        if (!isRent || hasPlan != true || shown.isEmpty()) return null
        val rows = shown.mapIndexed { index, stage ->
            if (stage.isRest) {
                DepositReceiptStage(ShareText.Res(R.string.deposit_rest_label), stage.amount, null, null)
            } else {
                val percent = DepositPlanMath.percentText(stage.percent)
                val detail = if (stage.isPaid) {
                    ShareText.Res(R.string.deposit_card_paid_detail, listOf(percent, paidDay(stage.collectedAt, zone)))
                } else {
                    ShareText.Res(R.string.deposit_card_due_detail, listOf(percent, DepositPlanMath.dayText(stage.dueDateKey)))
                }
                DepositReceiptStage(ShareText.Plain("${index + 1}. ${stage.label}"), stage.amount, detail, status(stage, todayKey))
            }
        }
        return DepositReceiptBlock(
            title = ShareText.Res(R.string.deposit_card_title),
            stages = rows,
            collected = summary?.collected ?: shown.sumOf { it.paidAmount },
            remaining = summary?.remaining ?: shown.sumOf { it.remaining },
        )
    }

    fun status(stage: OrderInstallment, todayKey: String): ShareText = when (stage.status) {
        "PAID" -> ShareText.Res(R.string.deposit_status_paid)
        "PARTIAL" -> ShareText.Res(R.string.deposit_status_partial)
        "DUE_TODAY" -> ShareText.Res(R.string.deposit_status_today)
        "OVERDUE" -> {
            val late = DepositPlanMath.lateDays(stage.dueDateKey, todayKey)
            if (late > 0) ShareText.Res(R.string.deposit_status_late, listOf(late)) else ShareText.Res(R.string.deposit_status_due)
        }
        else -> ShareText.Res(R.string.deposit_status_pending)
    }

    /** `dd/MM` of the shop day (Vietnam civil day) a stage was collected; never the UTC day (timezone-dates) */
    fun paidDay(iso: String?, zone: ZoneId = ShopTime.zone): String {
        val instant = iso?.let {
            runCatching { Instant.parse(it) }.getOrNull() ?: runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull()
        } ?: return DepositPlanMath.dayText(iso?.take(10))
        return DepositPlanMath.dayText(instant.atZone(zone).toLocalDate().toString())
    }
}
