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
        /** Already collected on the order; null hides the row */
        val paid: Double?,
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
    ): Confirm {
        val hasDates = !isSale && pickup != null && returnDate != null
        val paid = original?.paid ?: 0.0
        return Confirm(
            number = number(original),
            isSale = isSale,
            customer = customerName,
            range = if (hasDates) "${CreateOrderSheet.dayMonth(pickup!!)} → ${CreateOrderSheet.dayMonth(returnDate!!)}" else null,
            days = if (hasDates) CartV2Logic.rentalDays(pickup!!, returnDate!!) else null,
            itemCount = lines.sumOf { it.quantity },
            total = total,
            paid = paid.takeIf { it > 0 },
            datesChanged = !isSale && datesChanged(pickup, returnDate, original),
            itemsChanged = itemsChanged(lines(lines, isSale), original),
        )
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
