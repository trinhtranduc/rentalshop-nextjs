package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError

/** The one primary action of the order detail (#372) */
enum class DetailPrimary { HAND_OVER, TAKE_RETURN, NONE }

data class DetailActions(
    val primary: DetailPrimary,
    val canEdit: Boolean,
    val canCancel: Boolean,
    val canDelete: Boolean,
    val canPrint: Boolean = true,
)

/** A payment row as the money rule needs it */
data class BalancePayment(val amount: Double, val status: String?, val notes: String?)

data class OrderBalance(val amountDue: Double, val refundDue: Double)

/** Hand-over money: total − deposit + collateral money − paid at pickup */
data class HandOverMoney(
    val total: Double,
    val deposit: Double,
    val collateralMoney: Double,
    val paidBefore: Double,
    val collectNow: Double,
)

/** Return money: late + damage − collateral money − already settled; [net] < 0 is a refund */
data class ReturnMoney(
    val lateFee: Double,
    val damageFee: Double,
    val collateralMoney: Double,
    val settledBefore: Double,
    val net: Double,
) {
    val fees: Double get() = lateFee + damageFee
    val collect: Double get() = net.coerceAtLeast(0.0)
    val refund: Double get() = (-net).coerceAtLeast(0.0)
}

/** One request of a notes save (docs/API_ORDER_NOTES_IMAGES.md) */
sealed interface NotesStep {
    /** JSON PUT; [imageUrls] = the kept list when photos were removed, null to leave photos alone */
    data class Json(val notes: String?, val imageUrls: List<String>?) : NotesStep

    /** Multipart PUT: `data` (with [notes] when not sent yet) + [fileCount] files under `notesImages` */
    data class Upload(val notes: String?, val fileCount: Int) : NotesStep
}

/**
 * Papers and security deposit sent with the hand-over (#427). Null = leave the order's value alone.
 * Papers go as the old screens send them: `collateralType = ID_CARD` + `collateralDetails`.
 */
data class HandOverFields(
    val collateralType: String? = null,
    val collateralDetails: String? = null,
    val securityDeposit: Double? = null,
)

/** What the screen does with a failed status change */
data class StatusErrorOutcome(val code: String?, val message: String, val reload: Boolean)

object OrderDetailLogic {
    /** Note photos per order on the new detail (`MAX_ORDER_NOTE_IMAGES`) */
    const val MAX_NOTE_PHOTOS = 5

    fun actions(
        orderType: String,
        status: String,
        canManageOrders: Boolean,
        canDeleteCancelled: Boolean,
    ): DetailActions {
        val type = orderType.uppercase()
        val st = status.uppercase().let { if (it == "PICKED_UP") "PICKUPED" else it }
        val isRent = type == "RENT"
        val isSale = type == "SALE"
        val primary = when {
            isRent && st == "RESERVED" -> DetailPrimary.HAND_OVER
            isRent && st == "PICKUPED" -> DetailPrimary.TAKE_RETURN
            else -> DetailPrimary.NONE
        }
        val canEdit = canManageOrders && ((isRent && st == "RESERVED") || (isSale && st == "COMPLETED"))
        val canCancel = canManageOrders && (
            (isRent && (st == "RESERVED" || st == "PICKUPED")) ||
                (isSale && (st == "RESERVED" || st == "COMPLETED"))
            )
        val canDelete = canDeleteCancelled && st == "CANCELLED"
        return DetailActions(primary, canEdit, canCancel, canDelete)
    }

    private fun paid(payments: List<BalancePayment>, notes: String): Double =
        payments.filter { it.status == "COMPLETED" && it.notes == notes }.sumOf { it.amount }

    /** Same rule as `computeOrderBalance` in apps/api/lib/order-balance.ts */
    fun balance(
        orderType: String,
        status: String,
        totalAmount: Double,
        depositAmount: Double,
        securityDeposit: Double,
        lateFee: Double,
        damageFee: Double,
        payments: List<BalancePayment>,
    ): OrderBalance {
        val type = orderType.uppercase()
        val st = status.uppercase()
        if (type == "SALE") {
            return OrderBalance((totalAmount - paid(payments, "SALE")).coerceAtLeast(0.0), 0.0)
        }
        if (type == "RENT" && st == "RESERVED") {
            return OrderBalance(handOver(totalAmount, depositAmount, securityDeposit, payments).collectNow, 0.0)
        }
        if (type == "RENT" && st == "PICKUPED") {
            val r = returnMoney(lateFee, damageFee, securityDeposit, payments)
            return OrderBalance(r.collect, r.refund)
        }
        return OrderBalance(0.0, 0.0)
    }

    fun handOver(
        totalAmount: Double,
        depositAmount: Double,
        securityDeposit: Double,
        payments: List<BalancePayment>,
    ): HandOverMoney {
        val paidBefore = paid(payments, "PICKUP")
        val due = totalAmount - depositAmount + securityDeposit - paidBefore
        return HandOverMoney(totalAmount, depositAmount, securityDeposit, paidBefore, due.coerceAtLeast(0.0))
    }

    /**
     * What the hand-over sheet sends besides `status` (#427). Both fields are optional: given papers
     * or deposit are sent, a cleared prefilled value is sent empty / 0, and nothing else is sent.
     */
    fun handOverFields(
        papers: String,
        securityDeposit: Double,
        currentPapers: String?,
        currentDeposit: Double,
    ): HandOverFields {
        val text = papers.trim()
        val hadPapers = !currentPapers.isNullOrBlank()
        return HandOverFields(
            collateralType = if (text.isNotEmpty()) "ID_CARD" else null,
            collateralDetails = when {
                text.isNotEmpty() -> text
                hadPapers -> ""
                else -> null
            },
            securityDeposit = securityDeposit.takeIf { it > 0.0 || currentDeposit > 0.0 }?.coerceAtLeast(0.0),
        )
    }

    fun returnMoney(
        lateFee: Double,
        damageFee: Double,
        securityDeposit: Double,
        payments: List<BalancePayment>,
    ): ReturnMoney {
        val settled = paid(payments, "RETURN_ADJUSTMENT")
        val net = damageFee + lateFee - securityDeposit - settled
        return ReturnMoney(lateFee, damageFee, securityDeposit, settled, net)
    }

    /**
     * Requests for saving notes: removed photos → JSON with the kept URLs first, then new files as multipart
     * (the API appends uploads to what is stored). Text goes with the first request.
     * Null when [kept] + [newFileCount] is over [max] or [kept] holds a URL that was not on the order.
     */
    fun notesPlan(
        notes: String?,
        original: List<String>,
        kept: List<String>,
        newFileCount: Int,
        max: Int = MAX_NOTE_PHOTOS,
    ): List<NotesStep>? {
        if (kept.size + newFileCount > max || !original.containsAll(kept)) return null
        val photosRemoved = kept != original
        return when {
            photosRemoved && newFileCount > 0 -> listOf(NotesStep.Json(notes, kept), NotesStep.Upload(null, newFileCount))
            photosRemoved -> listOf(NotesStep.Json(notes, kept))
            newFileCount > 0 -> listOf(NotesStep.Upload(notes, newFileCount))
            else -> listOf(NotesStep.Json(notes, null))
        }
    }

    /** A 4xx (e.g. `INVALID_ORDER_STATUS`, the order moved on elsewhere) shows the message and reloads */
    fun statusError(error: Throwable): StatusErrorOutcome {
        val app = AppError.from(error)
        val reload = app.code.equals("INVALID_ORDER_STATUS", ignoreCase = true) ||
            (app is AppError.Http && app.statusCode in 400..499)
        return StatusErrorOutcome(app.code, app.message, reload)
    }

    /** Instants (ISO strings) under the three steps of the rent step bar: the actual day once it happened (#434, iOS) */
    fun progressDays(summary: OrderSummary): ProgressDays = ProgressDays(
        booked = summary.createdAt,
        handOver = summary.pickedUpAt ?: summary.pickupPlanAt,
        returned = summary.returnedAt ?: summary.returnPlanAt,
    )
}

/** Days shown under "Booked", "Hand over" and "Return" of the order detail step bar */
data class ProgressDays(val booked: String?, val handOver: String?, val returned: String?)
