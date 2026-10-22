package com.anyrent.pos.domain.products

/** Quantity from the shared number-pad sheet (#1162). */
object QuantityEntry {
    /** 9.999 is enough stock for a rental SKU. The pad's "000" would otherwise jump to millions. */
    const val maximum = 9_999

    fun fromPad(value: Double, minimum: Int): Int {
        if (!value.isFinite()) return minimum
        val n = value.toLong().coerceIn(minimum.toLong(), maximum.toLong())
        return n.toInt()
    }
}
