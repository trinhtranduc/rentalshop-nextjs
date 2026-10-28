package com.anyrent.pos.domain.products

import android.content.res.Resources
import com.anyrent.pos.R
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.money.ShopMoney

/**
 * #1189 the words of a day-block price (iOS `BlockPricing.summary / formula / rowSummary / rangeSummary`). Takes
 * [Resources] so the cart, the order detail, the share image and the printer say the same thing.
 */
object BlockText {
    private fun days(res: Resources, count: Int): String = res.getQuantityString(R.plurals.v2_cart_days, count, count)

    /** "Khối 3 ngày + 2 ngày thêm" (cart line) / "Khối 3 ngày" inside the table */
    fun summary(res: Resources, detail: BlockRentDetail): String {
        val block = res.getString(R.string.block_summary_block, detail.tierDay)
        return if (detail.extraDays > 0) block + " " + res.getString(R.string.block_summary_extra, detail.extraDays) else block
    }

    /** "120.000 (3 ngày) + 2 × 20.000 = 160.000" past the table, "120.000 (3 ngày)" inside it (one unit) */
    fun formula(res: Resources, detail: BlockRentDetail, currency: ShopCurrency = ShopMoney.current, showTotal: Boolean = true): String {
        val base = ShopMoney.format(detail.basePrice, currency) + " (" + days(res, detail.tierDay) + ")"
        if (detail.extraDays <= 0) return base
        val sum = base + " + ${detail.extraDays} × " + ShopMoney.format(detail.extraPrice, currency)
        return if (showTotal) sum + " = " + ShopMoney.format(detail.total, currency) else sum
    }

    /** The sum only when there are extra days, else null (the summary already says it) */
    fun formulaOrNull(res: Resources, detail: BlockRentDetail): String? = if (detail.extraDays > 0) formula(res, detail) else null

    /** "3 mốc · +20.000đ mỗi ngày" / "3 mốc · giữ giá khối cuối" */
    fun rowSummary(res: Resources, table: BlockTable, currency: ShopCurrency = ShopMoney.current): String {
        val count = res.getString(R.string.block_row_tiers, table.tiers.size)
        val extra = table.extraPrice
        return if (table.extraMode == BlockTable.EXTRA_PER_DAY && extra != null && extra > 0) {
            count + " · " + res.getString(R.string.block_row_extra, ShopMoney.withUnit(extra, currency))
        } else {
            count + " · " + res.getString(R.string.block_row_hold)
        }
    }

    /** "1 ngày 80.000 · 3 ngày 120.000": first and last tier */
    fun rangeSummary(res: Resources, table: BlockTable, currency: ShopCurrency = ShopMoney.current): String {
        val first = table.tiers.firstOrNull() ?: return ""
        fun part(day: Int, price: Double) = days(res, day) + " " + ShopMoney.format(price, currency)
        if (table.tiers.size == 1) return part(table.startDay, first)
        return part(table.startDay, first) + " · " + part(table.lastTierDay, table.tiers.last())
    }
}

/**
 * #1285 (iOS `OrderItem.detailLines`, mockup 1b item style B): the "SL × Khối 3 ngày + 2 ngày thêm" line of a BLOCK order line and its
 * formula without the total ("120.000 (3 ngày) + 2 × 20.000"); null on any other line or one without a saved table
 */
fun com.anyrent.pos.data.model.OrderItem.blockDetailLines(res: Resources): Pair<String, String?>? {
    if (!pricingType.equals("BLOCK", ignoreCase = true)) return null
    val detail = pricingSnapshot?.detail() ?: return null
    return "$quantity × " + BlockText.summary(res, detail) to
        if (detail.extraDays > 0) BlockText.formula(res, detail, showTotal = false) else null
}

/** #1189 (iOS `OrderItem.blockLines`): the summary and, past the table, the sum of a BLOCK order line; null on any other line */
fun com.anyrent.pos.data.model.OrderItem.blockLines(res: Resources): Pair<String, String?>? {
    if (!pricingType.equals("BLOCK", ignoreCase = true)) return null
    val detail = pricingSnapshot?.detail() ?: return null
    return BlockText.summary(res, detail) to BlockText.formulaOrNull(res, detail)
}
