package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import java.time.LocalDate

/**
 * #676 — editing an order in the new cart (board sua-don): "Lưu thay đổi" on the cart, then a sheet "Lưu thay đổi
 * đơn #482913?" whose rows carry a yellow "Đã đổi" tag when they differ from the order as it was loaded.
 * iOS `EditOrderSheetLogic` / `CartEditOriginal`.
 */
object EditOrderSheet {
    /** The cart button */
    enum class CtaLabel { SAVE_CHANGES, CREATE, SELL_AND_COLLECT }

    fun ctaLabel(editing: Boolean, isSale: Boolean): CtaLabel = when {
        editing -> CtaLabel.SAVE_CHANGES
        isSale -> CtaLabel.SELL_AND_COLLECT
        else -> CtaLabel.CREATE
    }

    data class Line(
        val productId: Int,
        val quantity: Int,
        /** The price the update request sends */
        val unitPrice: Double,
        /** FIXED / DAILY / …, upper-case; empty on a sale */
        val pricingType: String,
    )

    /** The order as it was when loaded into the cart for edit */
    data class Original(
        val orderNumber: String,
        val pickup: LocalDate?,
        val returnDate: LocalDate?,
        val lines: List<Line>,
        /** Payments already on the order (0 = none / unknown) */
        val paid: Double,
        /** #677: the order's status when loaded ("Thu khi giao" only while RESERVED); "" = unknown (older draft) */
        val status: String = "",
        /** #677: the order's payments when loaded ("Đã thu", "Thu khi giao"); null = unknown (older draft) */
        val payments: List<BalancePayment>? = null,
    )

    data class Confirm(
        /** Short order number; null for a draft saved before #676 */
        val number: String?,
        val isSale: Boolean,
        val customer: String,
        /** `10/10 → 12/10`; null for a sale */
        val range: String?,
        val days: Int?,
        /** Units in the cart ("2 món") */
        val itemCount: Int,
        val total: Double,
        /** "Đã thu" (#677): booking deposit + payments made toward the order, never thế chân; null hides the row */
        val paid: Double?,
        /**
         * "Thu khi giao" (#677): what Giao đồ will ask after saving (hand-over formula with the new total); rentals
         * still booked only, else null
         */
        val collectAtHandOver: Double? = null,
        val datesChanged: Boolean,
        val itemsChanged: Boolean,
    )

    fun lines(cartLines: List<CartLine>, isSale: Boolean): List<Line> = cartLines.map {
        Line(
            productId = it.product.id,
            quantity = it.quantity,
            unitPrice = it.unitPrice,
            pricingType = if (isSale) "" else it.pricingType.ifBlank { "FIXED" }.uppercase(),
        )
    }

    /** #677: the action on the Home cart bar: "Tạo đơn", or "Sửa đơn #482913" / "Sửa đơn" while editing (iOS `cartBarAction`) */
    sealed class CartBarAction {
        object Create : CartBarAction()
        data class Edit(val number: String?) : CartBarAction()
    }

    fun cartBarAction(editing: Boolean, original: Original?): CartBarAction =
        if (editing) CartBarAction.Edit(number(original)) else CartBarAction.Create

    fun number(original: Original?): String? =
        original?.orderNumber?.takeIf { it.isNotBlank() }?.let(OrdersBoardLogic::shortNumber)

    fun confirm(
        isSale: Boolean,
        customerName: String,
        pickup: LocalDate?,
        returnDate: LocalDate?,
        lines: List<CartLine>,
        total: Double,
        original: Original?,
        /** The cart's deposit (the order's booking deposit after the save) */
        deposit: Double = 0.0,
        /** The cart's thế chân money */
        securityDeposit: Double = 0.0,
    ): Confirm {
        val hasDates = !isSale && pickup != null && returnDate != null
        val paid = collected(isSale, deposit, original)
        return Confirm(
            number = number(original),
            isSale = isSale,
            customer = customerName,
            range = if (hasDates) "${CreateOrderSheet.dayMonth(pickup!!)} → ${CreateOrderSheet.dayMonth(returnDate!!)}" else null,
            days = if (hasDates) CartV2Logic.rentalDays(pickup!!, returnDate!!) else null,
            itemCount = lines.sumOf { it.quantity },
            total = total,
            paid = paid.takeIf { it > 0 },
            collectAtHandOver = collectAtHandOver(isSale, total, deposit, securityDeposit, original),
            datesChanged = !isSale && datesChanged(pickup, returnDate, original),
            itemsChanged = itemsChanged(lines(lines, isSale), original),
        )
    }

    /**
     * #677 "Đã thu": a rental's booking deposit plus the payments the hand-over counts as paid before (PICKUP); a sale's
     * SALE payments. Never thế chân. A draft saved before #677 has no payment notes: all its payments count, as before.
     * iOS `EditOrderSheetLogic.collected`.
     */
    fun collected(isSale: Boolean, deposit: Double, original: Original?): Double {
        val booking = if (isSale) 0.0 else deposit
        if (original == null) return booking
        val payments = original.payments ?: return booking + original.paid
        val purpose = if (isSale) "SALE" else "PICKUP"
        return booking + payments.filter { it.status == "COMPLETED" && it.notes == purpose }.sumOf { it.amount }
    }

    /**
     * #677 "Thu khi giao": [OrderDetailLogic.handOver] with the cart's new total, deposit and thế chân, so it matches
     * Giao đồ after the save. Only for a rental still booked (RESERVED). iOS `EditOrderSheetLogic.collectAtHandOver`.
     */
    fun collectAtHandOver(isSale: Boolean, total: Double, deposit: Double, securityDeposit: Double, original: Original?): Double? {
        if (isSale || original == null || !original.status.equals("RESERVED", ignoreCase = true)) return null
        return OrderDetailLogic.handOver(total, deposit, securityDeposit, original.payments.orEmpty()).collectNow
    }

    /** "Đã đổi" on Ngày thuê: the pickup or return shop day differs from the loaded order. Unknown original = no tag. */
    fun datesChanged(pickup: LocalDate?, returnDate: LocalDate?, original: Original?): Boolean {
        if (original == null) return false
        return pickup != original.pickup || returnDate != original.returnDate
    }

    /**
     * "Đã đổi" on Đồ thuê / Đồ bán: a line added or removed, or a line's quantity, price or pricing type changed.
     * Line order does not count. Unknown original = no tag.
     */
    fun itemsChanged(current: List<Line>, original: Original?): Boolean {
        if (original == null) return false
        return sorted(current) != sorted(original.lines)
    }

    private fun sorted(lines: List<Line>): List<Line> =
        lines.sortedWith(compareBy<Line>({ it.productId }, { it.quantity }, { it.unitPrice }, { it.pricingType }))
}
