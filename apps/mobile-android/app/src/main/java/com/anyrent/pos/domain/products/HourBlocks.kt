package com.anyrent.pos.domain.products

import android.content.res.Resources
import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.money.ShopMoney
import org.json.JSONObject

/** #1621 one hour block of a product ("4 giờ 250.000"): the price of the whole block */
data class HourBlock(val hours: Int, val price: Double)

/**
 * #1621 "Theo khối giờ" (iOS `HourBlocks`, web `packages/utils/src/core/hour-blocks.ts`). A product may have up to 10
 * hour blocks; each is one pricing option (`type HOURLY`, `unit HOUR`, `blockSize` = hours) and is never the default
 * price. A cart line on a block is priced flat like "Theo lần": price × quantity, never × days. The API stores
 * `pricingSnapshot {type: 'HOURLY', hours, price}` on the order line, so "Khối 4 giờ" stays after the product changes.
 */
object HourBlocks {
    const val TYPE = "HOURLY"
    const val UNIT = "HOUR"
    const val MIN_HOURS = 1
    const val MAX_HOURS = 24
    const val MAX_COUNT = 10
    private const val KEY_PREFIX = "$TYPE:"

    fun isHours(hours: Int?): Boolean = hours != null && hours in MIN_HOURS..MAX_HOURS

    /** The block of an HOURLY option with 1–24 hours and a price of 0 or more; null for any other option (an HOURLY option without hours is an old "per hour" price) */
    fun block(option: PricingOption): HourBlock? {
        if (!option.type.equals(TYPE, ignoreCase = true) || !isHours(option.blockSize)) return null
        if (!option.price.isFinite() || option.price < 0) return null
        return HourBlock(option.blockSize!!, option.price)
    }

    /** The block options of a product, shortest first (the cart's rows keep their option ids) */
    fun options(options: List<PricingOption>): List<PricingOption> =
        options.filter { block(it) != null }.sortedBy { it.blockSize }

    /** The blocks of a product, shortest first */
    fun of(options: List<PricingOption>): List<HourBlock> = options(options).mapNotNull(::block)

    /** The cart sheet's row of a block: "HOURLY:<option id>" (a block without an id: "HOURLY:H<hours>") */
    fun key(optionId: Int?, hours: Int): String = KEY_PREFIX + (optionId?.toString() ?: "H$hours")

    fun isKey(key: String?): Boolean = key?.uppercase()?.startsWith(KEY_PREFIX) == true

    /** `pricingSnapshot` of an hour-block order line; null for any other snapshot */
    fun snapshotFrom(json: JSONObject?): HourBlock? {
        if (json == null || !json.optString("type").equals(TYPE, ignoreCase = true)) return null
        val hours = json.optDouble("hours", Double.NaN).takeIf { it.isFinite() && it == Math.floor(it) }?.toInt()
        val price = json.optDouble("price", Double.NaN)
        if (!isHours(hours) || !price.isFinite() || price < 0) return null
        return HourBlock(hours!!, price)
    }

    // --- The setup screen ---

    enum class Issue { HOURS, REPEATED, PRICE, TOO_MANY }

    sealed class Input {
        /** every row empty: no blocks ("Chưa cài") */
        object Empty : Input()
        data class Invalid(val issue: Issue) : Input()
        /** shortest first */
        data class Blocks(val blocks: List<HourBlock>) : Input()
    }

    /** The rows as typed ("4", "250.000"); a row with both boxes empty is skipped */
    fun parse(rows: List<Pair<String, String>>): Input {
        val filled = rows.filter { (hours, price) -> hours.isNotBlank() || MoneyInput.parse(price) != null }
        if (filled.isEmpty()) return Input.Empty
        if (filled.size > MAX_COUNT) return Input.Invalid(Issue.TOO_MANY)
        val blocks = mutableListOf<HourBlock>()
        for ((hoursText, priceText) in filled) {
            val text = hoursText.trim()
            val hours = text.takeIf { it.isNotEmpty() && it.all(Char::isDigit) }?.toIntOrNull()
            if (!isHours(hours)) return Input.Invalid(Issue.HOURS)
            val price = MoneyInput.parse(priceText) ?: return Input.Invalid(Issue.PRICE)
            if (blocks.any { it.hours == hours }) return Input.Invalid(Issue.REPEATED)
            blocks += HourBlock(hours!!, price)
        }
        return Input.Blocks(blocks.sortedBy { it.hours })
    }
}

/** #1621 the words of hour blocks (iOS `HourBlocks.label / rowSummary / rangeSummary / detailSummary`) */
object HourBlockText {
    /** "Khối 4 giờ" */
    fun label(res: Resources, hours: Int): String = res.getString(R.string.hour_block_label, hours)

    /** Form row: "3 khối: 2 · 4 · 8 giờ" */
    fun rowSummary(res: Resources, blocks: List<HourBlock>): String =
        res.getQuantityString(R.plurals.hour_block_summary, blocks.size, blocks.size, blocks.joinToString(" · ") { it.hours.toString() })

    /** Form row, second line: "150.000 – 400.000" (one block: its price) */
    fun rangeSummary(blocks: List<HourBlock>, currency: ShopCurrency = ShopMoney.current): String {
        val low = blocks.minOfOrNull { it.price } ?: return ""
        val high = blocks.maxOf { it.price }
        return if (low == high) ShopMoney.format(low, currency) else ShopMoney.format(low, currency) + " – " + ShopMoney.format(high, currency)
    }

    /** Product detail: "2 giờ 150.000đ · 4 giờ 250.000đ" */
    fun detailSummary(res: Resources, blocks: List<HourBlock>, currency: ShopCurrency = ShopMoney.current): String =
        blocks.joinToString(" · ") { res.getString(R.string.hour_block_detail, it.hours, ShopMoney.withUnit(it.price, currency)) }

    fun issue(res: Resources, issue: HourBlocks.Issue): String = when (issue) {
        HourBlocks.Issue.HOURS -> res.getString(R.string.hour_block_error_hours)
        HourBlocks.Issue.REPEATED -> res.getString(R.string.hour_block_error_repeated)
        HourBlocks.Issue.PRICE -> res.getString(R.string.hour_block_error_price)
        HourBlocks.Issue.TOO_MANY -> res.getString(R.string.hour_block_max, HourBlocks.MAX_COUNT)
    }
}

/** #1621 "Khối 4 giờ" of an hour-block order line; null on any other line */
fun OrderItem.hourBlockLabel(res: Resources): String? =
    hourBlock?.takeIf { pricingType.equals(HourBlocks.TYPE, ignoreCase = true) }?.let { HourBlockText.label(res, it.hours) }

/** Print and share image: the day-block summary and sum (#1189), or "Khối 4 giờ" (#1621); null on any other line */
fun OrderItem.pricingLines(res: Resources): Pair<String, String?>? =
    blockLines(res) ?: hourBlockLabel(res)?.let { it to null }
