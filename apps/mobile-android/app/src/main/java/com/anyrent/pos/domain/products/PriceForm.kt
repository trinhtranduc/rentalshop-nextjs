package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.Product

/**
 * #1249 (mockup v179): the rent prices of the product form. Three prices exist together, no radio and no default
 * switch: "Theo lần" (the default for new orders), "Theo mỗi ngày" (one price per day) and "Theo block ngày" (the
 * table, set up on its own screen, "Chưa cài" when null). All three are sent when filled. Pure, so it runs in plain
 * JVM tests (iOS `ProductPriceForm`).
 */
data class PriceFormState(
    val perRental: Double?,
    val perDay: Double?,
    val block: BlockTable?,
    /** #1621 "Theo khối giờ", shortest first; empty = "Chưa cài" */
    val hourBlocks: List<HourBlock> = emptyList(),
)

object PriceForm {
    /** New product: three empty prices. Saved product: each saved price fills its own row, no table = "Chưa cài". */
    fun open(product: Product?): PriceFormState {
        if (product == null) return PriceFormState(null, null, null)
        return PriceFormState(
            perRental = ProductPricing.perRental(product),
            perDay = ProductPricing.perDay(product),
            block = ProductPricing.block(product),
            hourBlocks = ProductPricing.hourBlocks(product),
        )
    }

    /** "Lưu bảng giá" */
    fun saveBlock(s: PriceFormState, table: BlockTable): PriceFormState = s.copy(block = table)

    /** "Tắt giá theo khối ngày": the table goes ("Chưa cài"); the other two prices stay */
    fun turnOffBlock(s: PriceFormState): PriceFormState = s.copy(block = null)

    /** #1621 "Lưu bảng giá" of the hour-block screen */
    fun saveHourBlocks(s: PriceFormState, blocks: List<HourBlock>): PriceFormState = s.copy(hourBlocks = blocks.sortedBy { it.hours })

    /** #1621 "Tắt giá theo khối giờ": every block goes ("Chưa cài") */
    fun turnOffHourBlocks(s: PriceFormState): PriceFormState = s.copy(hourBlocks = emptyList())

    /**
     * What is sent: FIXED + DAILY (when its box has a price) + BLOCK (when a table is set) + one HOURLY per hour block.
     * FIXED is the default; without it the next one is; a block never is.
     */
    fun options(s: PriceFormState): List<PricingOptionInput> =
        ProductPricing.options(s.perRental, s.perDay, PricingMode.PER_RENTAL, s.block, s.hourBlocks)

    /** "Sao chép từ sản phẩm khác": its table and its rule past the last day (never its sale price or deposit) */
    fun copyTable(other: Product): BlockTable? = ProductPricing.block(other)
}
