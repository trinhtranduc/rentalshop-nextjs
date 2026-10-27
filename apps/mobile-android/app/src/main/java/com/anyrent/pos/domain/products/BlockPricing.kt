package com.anyrent.pos.domain.products

import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode

/*
 * Day-block rental pricing (#1189): a price table by number of days (1 day 80.000, 2 days 100.000, 3 days 120.000,
 * then "+20.000 per extra day"). Port of `calculateBlockRent` in packages/utils/src/core/block-pricing.ts and of
 * iOS `Model/BlockPricing.swift`; the unit tests run it against tests/fixtures/block-pricing-golden.json.
 * No Android UI here, so it runs in plain JVM tests.
 */

/** A price table as the API stores it on a BLOCK option and on an order line (`pricingSnapshot`) */
data class BlockTable(
    /** `tiers[i]` = the all-in price of renting exactly `startDay + i` days (not per day, not cumulative) */
    val tiers: List<Double>,
    val startDay: Int = 1,
    val extraMode: String = EXTRA_PER_DAY,
    val extraPrice: Double? = null,
) {
    val lastTierDay: Int get() = startDay + tiers.size - 1

    companion object {
        const val EXTRA_PER_DAY = "EXTRA_PER_DAY"
        const val HOLD_LAST = "HOLD_LAST"
    }
}

/** Price of one unit and how it was reached */
data class BlockRentDetail(
    val total: Double,
    val days: Int,
    val lastTierDay: Int,
    /** The day number of the tier that applies (the last one when past the table, the first one before it) */
    val tierDay: Int,
    val extraDays: Int,
    val basePrice: Double,
    val extraAmount: Double,
    val extraPrice: Double,
)

object BlockPricing {
    const val MAX_TIERS = 31
    const val MAX_START_DAY = 31

    /** VND, JPY, KRW have no cents; every other code has (as the API's `currencyMinorUnit`) */
    fun minorUnit(currency: String?): Double =
        if ((currency ?: "").uppercase() in setOf("VND", "JPY", "KRW", "CLP", "ISK")) 1.0 else 0.01

    /** Rounds half up to the minor unit; 12 significant digits remove float noise such as 1.005 * 100 = 100.49999999999999 */
    fun round(value: Double, minorUnit: Double = 1.0): Double {
        val per = Math.round(1 / minorUnit).toDouble()
        val scaled = BigDecimal(value * per).round(MathContext(12, RoundingMode.HALF_EVEN)).toDouble()
        return Math.floor(scaled + 0.5) / per
    }

    private fun isMoney(value: Double) = value.isFinite() && value >= 0

    /** 1..31 tiers of 0 or more, start day 1..31, a known mode, an extra of 0 or more */
    fun isValid(table: BlockTable): Boolean {
        if (table.tiers.isEmpty() || table.tiers.size > MAX_TIERS || !table.tiers.all(::isMoney)) return false
        if (table.startDay < 1 || table.startDay > MAX_START_DAY) return false
        if (table.extraMode != BlockTable.EXTRA_PER_DAY && table.extraMode != BlockTable.HOLD_LAST) return false
        if (table.extraPrice != null && !isMoney(table.extraPrice)) return false
        return true
    }

    /** Price of one unit rented for [days] days; null for a table that is not valid */
    fun detail(table: BlockTable, days: Int, minorUnit: Double = 1.0): BlockRentDetail? {
        if (!isValid(table)) return null
        val d = maxOf(1, days)
        val start = table.startDay
        val lastTierDay = table.lastTierDay
        val base: Double
        val tierDay: Int
        var extraDays = 0
        var extraAmount = 0.0
        when {
            d <= start -> { base = table.tiers[0]; tierDay = start }
            d <= lastTierDay -> { base = table.tiers[d - start]; tierDay = d }
            else -> {
                base = table.tiers.last()
                tierDay = lastTierDay
                if (table.extraMode == BlockTable.EXTRA_PER_DAY) {
                    extraDays = d - lastTierDay
                    extraAmount = extraDays * (table.extraPrice ?: 0.0)
                }
            }
        }
        // Exact sum first, one rounding at the end (never per day)
        return BlockRentDetail(
            total = round(base + extraAmount, minorUnit), days = d, lastTierDay = lastTierDay, tierDay = tierDay,
            extraDays = extraDays, basePrice = base, extraAmount = round(extraAmount, minorUnit), extraPrice = table.extraPrice ?: 0.0,
        )
    }

    fun rent(table: BlockTable, days: Int, minorUnit: Double = 1.0): Double? = detail(table, days, minorUnit)?.total

    /** The same function with the arguments of the TypeScript one */
    fun calculateBlockRent(
        tiers: List<Double>, startDay: Int?, extraMode: String?, extraPrice: Double?, days: Int, minorUnit: Double = 1.0,
    ): Double? = rent(BlockTable(tiers, startDay ?: 1, extraMode ?: BlockTable.EXTRA_PER_DAY, extraPrice), days, minorUnit)

    // --- Reading the API -------------------------------------------------------------------------

    private fun JSONObject.number(key: String): Double? {
        if (!has(key) || isNull(key)) return null
        return when (val v = opt(key)) {
            is Number -> v.toDouble()
            is String -> v.toDoubleOrNull()
            else -> null
        }?.takeIf { it.isFinite() }
    }

    /** Numbers from the API are JSON numbers; a Decimal column may arrive as a string. null when any is unreadable. */
    private fun JSONArray.numbers(): List<Double>? {
        val out = (0 until length()).map { i ->
            when (val v = opt(i)) {
                is Number -> v.toDouble()
                is String -> v.toDoubleOrNull()
                else -> null
            } ?: return null
        }
        return out
    }

    /** The table of a BLOCK option / snapshot JSON (`blockTiers` or `tiers`); null when absent or not usable */
    fun tableFrom(json: JSONObject, tiersKey: String = "blockTiers", startKey: String = "blockStartDay",
                  modeKey: String = "blockExtraMode", extraKey: String = "blockExtraPrice"): BlockTable? {
        val tiers = json.optJSONArray(tiersKey)?.numbers()?.takeIf { it.isNotEmpty() } ?: return null
        val start = json.number(startKey)?.toInt() ?: 1
        val mode = json.optString(modeKey).takeIf { it.isNotBlank() && it != "null" } ?: BlockTable.EXTRA_PER_DAY
        val table = BlockTable(tiers, start, mode, json.number(extraKey))
        return table.takeIf { isValid(it) }
    }

    /** JSON of a BLOCK option for the product routes (`price` of the option is the day-1 price) */
    fun optionJson(table: BlockTable, isDefault: Boolean): JSONObject = JSONObject()
        .put("type", "BLOCK")
        .put("price", table.tiers.first())
        .put("isDefault", isDefault)
        .put("blockTiers", JSONArray(table.tiers))
        .put("blockStartDay", table.startDay)
        .put("blockExtraMode", table.extraMode)
        .apply { table.extraPrice?.let { put("blockExtraPrice", it) } }

    // --- Form input ------------------------------------------------------------------------------

    sealed class Input {
        /** every box empty: no table */
        object Empty : Input()
        /** some box empty or not a number */
        object Invalid : Input()
        data class Table(val table: BlockTable) : Input()
    }

    /**
     * #1249: a product priced per day without a table opens with its day price on row 1 and the same price for each
     * extra day. That table charges exactly day price x days, so it is the old price shown as a table.
     */
    fun seed(perDay: Double?): BlockTable? =
        perDay?.takeIf { it >= 0 }?.let { BlockTable(listOf(it), 1, BlockTable.EXTRA_PER_DAY, it) }

    /**
     * The table to send, or null when the form sends none: nothing typed, or the table is still the one shown from
     * the old day price (the product then stays the DAILY price it was)
     */
    fun tableToSave(table: BlockTable?, perDay: Double?): BlockTable? {
        if (table == null) return null
        return if (seed(perDay) == table) null else table
    }

    /** The boxes of the price screen to a table. `tierTexts[i]` is the price of day `startDay + i` as typed ("120.000"). */
    fun parse(tierTexts: List<String>, startDay: Int = 1, extraMode: String, extraText: String): Input {
        val tiers = tierTexts.map { MoneyInput.parse(it) }
        val extra = MoneyInput.parse(extraText)
        if (tiers.all { it == null } && extra == null) return Input.Empty
        if (tiers.any { it == null }) return Input.Invalid
        if (extraMode == BlockTable.EXTRA_PER_DAY && extra == null) return Input.Invalid
        val table = BlockTable(tiers.filterNotNull(), startDay, extraMode, if (extraMode == BlockTable.EXTRA_PER_DAY) extra else null)
        return if (isValid(table)) Input.Table(table) else Input.Invalid
    }
}

/**
 * `orderItems[].pricingSnapshot` of a BLOCK line: the table as it was when the order was made, and how the unit price
 * was reached (the API never changes it after the shop edits the product)
 */
data class BlockSnapshot(
    val table: BlockTable,
    val currency: String? = null,
    val days: Int? = null,
    val overridden: Boolean = false,
) {
    /** The saved breakdown for the days stored on the line; null when the stored table is not usable */
    fun detail(overrideDays: Int? = null): BlockRentDetail? =
        BlockPricing.detail(table, overrideDays ?: days ?: 1, BlockPricing.minorUnit(currency))

    companion object {
        /** A snapshot this app cannot read is no snapshot; it never fails the order */
        fun from(json: JSONObject?): BlockSnapshot? {
            json ?: return null
            val table = BlockPricing.tableFrom(json, tiersKey = "tiers", startKey = "startDay", modeKey = "extraMode", extraKey = "extraPrice")
                ?: return null
            return BlockSnapshot(
                table = table,
                currency = json.optString("currency").takeIf { it.isNotBlank() && it != "null" },
                days = if (json.has("days") && !json.isNull("days")) json.optInt("days").takeIf { it > 0 } else null,
                overridden = json.optBoolean("overridden", false),
            )
        }
    }
}

/** 400 codes of the order and product routes a BLOCK change can meet */
object BlockPricingError {
    const val PRICE_MISMATCH = "BLOCK_PRICE_MISMATCH"
    const val TABLE_INVALID = "BLOCK_TABLE_INVALID"
    const val REQUIRES_UPDATE = "PRICING_TYPE_REQUIRES_UPDATE"
}
