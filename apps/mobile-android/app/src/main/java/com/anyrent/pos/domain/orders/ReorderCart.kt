package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.OrderDetail

/**
 * #1515 "Đặt lại" on the order detail: what an old order gives the new cart, and the detail's 3-button row.
 * From the order: type, customer, notes, each line's product, quantity and note. The price is the product's price today
 * (it comes from the product the cart loads, not from the order); dates, discount, deposit, collateral, payments,
 * photos, status and the order number are not copied. Pure and unit tested. iOS `ReorderCartBuilder`, web `reorder-model`.
 */
object ReorderCart {
    data class Item(val productId: Int, val quantity: Int, val note: String?)

    /**
     * [unreadable]: order lines that no longer name a product (deleted); they are not carried over.
     * The branch is not here: a phone user chose the branch at login and only sees its orders, so the new cart is in it.
     */
    data class Plan(val orderType: String, val customer: Customer?, val notes: String, val items: List<Item>, val unreadable: Int)

    enum class Status { OPENED, EMPTY, LIMIT }

    /** [skipped]: lines left out (deleted or not loadable); the screen says "N món không còn bán, đã bỏ khỏi giỏ" */
    data class Result(val status: Status, val skipped: Int)

    fun plan(detail: OrderDetail): Plan {
        val summary = detail.summary
        val readable = detail.items.filter { it.productId > 0 }
        return Plan(
            orderType = if (summary.orderType.equals("SALE", ignoreCase = true)) "SALE" else "RENT",
            customer = detail.customer?.takeIf { it.id > 0 },
            notes = summary.notes.orEmpty(),
            items = readable.map { Item(it.productId, it.quantity.coerceAtLeast(1), it.note?.trim()?.takeIf { n -> n.isNotEmpty() }) },
            unreadable = detail.items.size - readable.size,
        )
    }

    private const val CREATE_PERMISSION = "orders.create"

    /** The login's permission list; a session signed in before it existed (null) lets every shop role create orders */
    fun canReorder(permissions: Set<String>?, role: String?): Boolean =
        permissions?.contains(CREATE_PERMISSION) ?: !role.isNullOrBlank()

    /** The row under the status block: Đặt lại (only with orders.create), Chia sẻ, Ghi chú */
    enum class Quick { REORDER, SHARE, NOTES }

    fun quickButtons(canReorder: Boolean): List<Quick> =
        if (canReorder) listOf(Quick.REORDER, Quick.SHARE, Quick.NOTES) else listOf(Quick.SHARE, Quick.NOTES)

    /** "Ghi chú · N": the note text counts one, each photo one; 0 = plain "Ghi chú" */
    fun notesCount(notes: String?, photos: Int): Int = (if (notes.isNullOrBlank()) 0 else 1) + photos.coerceAtLeast(0)
}
