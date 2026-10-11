package com.anyrent.pos.domain.orders

import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import java.time.LocalDate
import java.util.UUID

/**
 * #476 — "Tạo đơn" in the new cart: a confirm sheet on the cart, then a "Đã tạo đơn" sheet (boards
 * Gio-hang-xac-nhan, Gio-hang-da-tao). iOS `CreateOrderSheetLogic`.
 */
object CreateOrderSheet {
    enum class CtaRoute { CONFIRM_SHEET, EDIT_SHEET }

    /** A new order is confirmed in a sheet; an edited order in the "Lưu thay đổi" sheet (#676), not the review screen */
    fun ctaRoute(editing: Boolean): CtaRoute = if (editing) CtaRoute.EDIT_SHEET else CtaRoute.CONFIRM_SHEET

    data class Confirm(
        val isSale: Boolean,
        val customer: String,
        /** `03/10 → 05/10`; null for a sale */
        val range: String?,
        /** Inclusive civil days; null for a sale */
        val days: Int?,
        /** `Vest đen slim fit, Áo dài lụa đỏ ×2` */
        val items: String,
        val total: Double,
        /** Prepaid deposit (rent) or the total (sale) */
        val collect: Double,
    )

    data class Created(
        val shortNumber: String,
        /** `Trần Văn Minh · 03/10 → 05/10` (sale: the customer) */
        val subtitle: String,
        val paid: Double,
        val isSale: Boolean,
    )

    /** [lines]: product name and quantity of each cart line */
    fun confirm(
        isSale: Boolean,
        customerName: String,
        pickup: LocalDate?,
        returnDate: LocalDate?,
        lines: List<Pair<String, Int>>,
        total: Double,
        deposit: Double,
    ): Confirm {
        val hasDates = !isSale && pickup != null && returnDate != null
        return Confirm(
            isSale = isSale,
            customer = customerName,
            range = if (hasDates) "${dayMonth(pickup!!)} → ${dayMonth(returnDate!!)}" else null,
            days = if (hasDates) CartV2Logic.rentalDays(pickup!!, returnDate!!) else null,
            items = lines.joinToString(", ") { (name, quantity) -> if (quantity > 1) "$name ×$quantity" else name },
            total = total,
            collect = CartV2Logic.collectNow(isSale, total, deposit),
        )
    }

    fun created(orderNumber: String, confirm: Confirm): Created = Created(
        shortNumber = OrdersBoardLogic.shortNumber(orderNumber),
        subtitle = listOfNotNull(confirm.customer, confirm.range).joinToString(" · "),
        paid = confirm.collect,
        isSale = confirm.isSale,
    )

    fun dayMonth(day: LocalDate): String = "%02d/%02d".format(day.dayOfMonth, day.monthValue)
}

/** One create at a time, one Idempotency-Key per checkout, reused when staff retry after an error (#341) */
class CreateOrderSubmission {
    var idempotencyKey: String = UUID.randomUUID().toString()
        private set
    var inFlight: Boolean = false
        private set

    /** False while a create is already on its way (a double tap) */
    fun begin(): Boolean {
        if (inFlight) return false
        inFlight = true
        return true
    }

    fun failed() {
        inFlight = false
    }

    /** The next cart is a new checkout */
    fun succeeded() {
        inFlight = false
        idempotencyKey = UUID.randomUUID().toString()
    }
}
