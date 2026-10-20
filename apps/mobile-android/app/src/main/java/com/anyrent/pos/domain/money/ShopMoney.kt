package com.anyrent.pos.domain.money

import androidx.compose.runtime.mutableStateOf
import kotlin.math.abs
import kotlin.math.roundToLong

/** #1145 the shop's currency (`merchant.currency`). Amounts are never converted, only shown differently. */
enum class ShopCurrency(val code: String) {
    VND("VND"),
    USD("USD"),
    ;

    companion object {
        /** "USD" (any case, trimmed) is USD; anything else, empty or missing is VND (the behaviour before #1145) */
        fun from(raw: String?): ShopCurrency = if (raw?.trim().equals("USD", ignoreCase = true)) USD else VND
    }
}

/**
 * #1145 the one money formatter of the v2 screens (iOS `MoneyFormatter`). Every v2 money helper delegates here.
 * - VND: "1.150.000", "−50.000", "0"; with the unit "150.000đ" (byte-identical to the helpers before #1145)
 * - USD: "$220,000", "$1,234.50" (two decimals only when there are cents), "−$50", "$0"; the unit form is the same
 *
 * Pure: every function takes the currency, defaulting to [current] (the shop's, set by `SessionStore`). [current] is
 * Compose snapshot state, so a composition that formatted money redraws when the owner changes the currency.
 */
object ShopMoney {
    private const val MINUS = "−"
    private val live = mutableStateOf(ShopCurrency.VND)

    val current: ShopCurrency get() = live.value

    /** Called by `SessionStore` only */
    fun publish(currency: ShopCurrency) {
        if (live.value != currency) live.value = currency
    }

    /** "1.150.000" / "$1,150,000" */
    fun format(amount: Double, currency: ShopCurrency = current): String = when (currency) {
        ShopCurrency.VND -> {
            val rounded = Math.round(amount)
            (if (rounded < 0) MINUS else "") + group(abs(rounded), '.')
        }
        ShopCurrency.USD -> {
            val cents = (abs(amount) * 100).roundToLong()
            val text = "$" + group(cents / 100, ',') + if (cents % 100 == 0L) "" else ".%02d".format(cents % 100)
            (if (amount < 0 && cents > 0) MINUS else "") + text
        }
    }

    /** Where the app appended "đ": "150.000đ" / "$150,000" */
    fun withUnit(amount: Double, currency: ShopCurrency = current): String = when (currency) {
        ShopCurrency.VND -> format(amount, currency) + "đ"
        ShopCurrency.USD -> format(amount, currency)
    }

    /** Dot-grouped digits for money input fields (they stay plain numbers in every currency) */
    fun plain(amount: Double): String = format(amount, ShopCurrency.VND)

    /** "đ" / "$" */
    fun symbol(currency: ShopCurrency = current): String = if (currency == ShopCurrency.USD) "$" else "đ"

    /** Settings value and choice: "VND (đ)" / "USD ($)" */
    fun label(currency: ShopCurrency): String = "${currency.code} (${symbol(currency)})"

    /**
     * Full below a million ("450.000" / "$450,000"); else VND "18,65 tr" / "1,2 tỷ" (en "18.65M" / "1.2B"),
     * USD "$18.65M" / "$1.2B" in every language; two decimals at most
     */
    fun compact(amount: Double, vietnamese: Boolean, currency: ShopCurrency = current): String {
        val magnitude = abs(amount)
        if (magnitude < 1_000_000) return format(amount, currency)
        val usd = currency == ShopCurrency.USD
        val vi = vietnamese && !usd
        val billion = magnitude >= 1_000_000_000
        val scaled = (magnitude / (if (billion) 1_000_000_000.0 else 1_000_000.0) * 100).roundToLong() / 100.0
        var text = "%.2f".format(java.util.Locale.US, scaled).trimEnd('0').trimEnd('.')
        if (vi) text = text.replace('.', ',')
        val unit = if (vi) (if (billion) " tỷ" else " tr") else (if (billion) "B" else "M")
        return (if (amount < 0) MINUS else "") + (if (usd) "$" else "") + text + unit
    }

    /** The confirm example: 220000 in [from] → in [to], e.g. "220.000 → $220,000" */
    fun example(from: ShopCurrency, to: ShopCurrency, amount: Double = 220_000.0): String =
        format(amount, from) + " → " + format(amount, to)

    private fun group(value: Long, separator: Char): String =
        value.toString().reversed().chunked(3).joinToString(separator.toString()).reversed()
}
