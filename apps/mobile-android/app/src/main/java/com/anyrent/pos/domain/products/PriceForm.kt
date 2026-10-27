package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.Product

/**
 * #1249 (mockup v170): the rent prices of the product form. "Thuê theo lần" is always there and is the default for
 * new orders. Below it ONE of two radios: "Thuê theo ngày" (one price per day) or "Giá theo khối ngày" (the table, set
 * up on its own screen). The price of the other radio stays in memory so switching back and forth loses nothing, but
 * only the chosen one is sent. Pure, so it runs in plain JVM tests (iOS `ProductPriceForm`).
 */
enum class DayKind { DAY, BLOCK }

data class PriceFormState(
    val perRental: Double?,
    val perDay: Double?,
    val dayKind: DayKind,
    val block: BlockTable?,
)

/** [openSetup]: the radio asked for a table that does not exist yet; the setup screen opens and [state] is unchanged */
data class BlockChoice(val state: PriceFormState, val openSetup: Boolean)

object PriceForm {
    /** New product: Thuê theo ngày with empty boxes. Saved product: a table -> Giá theo khối ngày, else Thuê theo ngày with its day price. */
    fun open(product: Product?): PriceFormState {
        if (product == null) return PriceFormState(null, null, DayKind.DAY, null)
        val table = ProductPricing.block(product)
        return PriceFormState(
            perRental = ProductPricing.perRental(product),
            perDay = ProductPricing.perDay(product),
            dayKind = if (table != null) DayKind.BLOCK else DayKind.DAY,
            block = table,
        )
    }

    fun chooseDay(s: PriceFormState): PriceFormState = s.copy(dayKind = DayKind.DAY)

    fun chooseBlock(s: PriceFormState): BlockChoice =
        if (s.block == null) BlockChoice(s, openSetup = true) else BlockChoice(s.copy(dayKind = DayKind.BLOCK), openSetup = false)

    /** "Lưu bảng giá" */
    fun saveBlock(s: PriceFormState, table: BlockTable): PriceFormState = s.copy(dayKind = DayKind.BLOCK, block = table)

    /** "Tắt giá theo khối ngày": back to Thuê theo ngày; the day price stays, the table goes */
    fun turnOffBlock(s: PriceFormState): PriceFormState = s.copy(dayKind = DayKind.DAY, block = null)

    /** What is sent: FIXED + DAILY, or FIXED + BLOCK. FIXED is the default; without it the other option is. */
    fun options(s: PriceFormState): List<PricingOptionInput> = when (s.dayKind) {
        DayKind.DAY -> ProductPricing.options(s.perRental, s.perDay, PricingMode.PER_RENTAL, null)
        DayKind.BLOCK -> ProductPricing.options(s.perRental, null, PricingMode.PER_RENTAL, s.block)
    }

    /** "Sao chép từ sản phẩm khác": its table and its rule past the last day (never its sale price or deposit) */
    fun copyTable(other: Product): BlockTable? = ProductPricing.block(other)
}
