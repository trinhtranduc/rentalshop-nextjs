package com.anyrent.pos.data

/** #951: per-line cart actions take the line id; tests pick the line of a product (first one, or the n-th) */
internal fun lineIdOf(productId: Int, nth: Int = 0): String =
    CartStore.lines.value.filter { it.product.id == productId }[nth].lineId
