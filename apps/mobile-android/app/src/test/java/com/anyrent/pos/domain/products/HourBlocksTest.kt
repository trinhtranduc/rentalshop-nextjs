package com.anyrent.pos.domain.products

import com.anyrent.pos.data.CartOrderSubmit
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.data.model.Product
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * #1621 "Theo khối giờ" with the owner's examples (iOS `HourBlocksTests`): Váy cưới trắng 2 giờ 150.000 · 4 giờ 250.000 ·
 * 8 giờ 400.000, Vest nam đen 2 giờ 80.000 · 8 giờ 200.000. The product payload, the form rules, the cart sheet rows,
 * the flat price and the edit of a saved line.
 */
class HourBlocksTest {
    private fun product(id: Int, options: List<PricingOption>) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = options.first().price, salePrice = null, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, pricingType = "FIXED", pricingOptions = options,
    )

    private fun hour(id: Int, hours: Int, price: Double) = PricingOption(id, "HOURLY", price, false, blockSize = hours)

    // Blocks arrive in any order; a block is never the default
    private val vay = product(7, listOf(PricingOption(11, "FIXED", 500_000.0, true), hour(12, 4, 250_000.0), hour(13, 2, 150_000.0), hour(14, 8, 400_000.0)))
    private val vest = product(8, listOf(PricingOption(21, "FIXED", 250_000.0, true), hour(22, 2, 80_000.0), hour(23, 8, 200_000.0)))

    private fun line(p: Product, qty: Int = 1, days: Int = 1) = CartLine(product = p, quantity = qty, rentalDays = days, pricingType = p.pricingType)

    @Test
    fun `hour options are blocks, shortest first, never the default`() {
        assertEquals(listOf(HourBlock(2, 150_000.0), HourBlock(4, 250_000.0), HourBlock(8, 400_000.0)), ProductPricing.hourBlocks(vay))
        assertEquals(PricingMode.PER_RENTAL, ProductPricing.defaultMode(vay))
        assertEquals(500_000.0, ProductPricing.perRental(vay)!!, 0.0)
        // an old "per hour" price (HOURLY without hours) and more than 24 hours are not blocks
        assertTrue(HourBlocks.of(listOf(PricingOption(2, "HOURLY", 50_000.0), hour(3, 25, 1.0), hour(4, 0, 1.0))).isEmpty())
    }

    @Test
    fun `the form sends every block after the other prices, never as default`() {
        val opened = PriceForm.open(vay)
        assertEquals(listOf(2, 4, 8), opened.hourBlocks.map { it.hours })
        val sent = PriceForm.options(opened)
        assertEquals(listOf("FIXED", "HOURLY", "HOURLY", "HOURLY"), sent.map { it.type })
        assertEquals(listOf("FIXED"), sent.filter { it.isDefault }.map { it.type })
        assertEquals(listOf(2, 4, 8), sent.mapNotNull { it.blockSize })
        assertEquals(listOf(150_000.0, 250_000.0, 400_000.0), sent.drop(1).map { it.price })
        val saved = PriceForm.saveHourBlocks(opened, listOf(HourBlock(8, 1.0), HourBlock(3, 0.0)))
        assertEquals(listOf(3, 8), PriceForm.options(saved).mapNotNull { it.blockSize })
        assertEquals(listOf("FIXED"), PriceForm.options(PriceForm.turnOffHourBlocks(opened)).map { it.type })
    }

    @Test
    fun `blocks need another price`() {
        fun issues(perRental: Double?, perDay: Double?, block: BlockTable? = null, showsPrices: Boolean = true) =
            ProductFormValidator.validate(
                ProductFormInput(
                    name = "Váy", perRental = perRental, perDay = perDay, defaultMode = PricingMode.PER_RENTAL, salePrice = null,
                    deposit = null, quantity = 1, rented = 0, photoCount = 0, showsPrices = showsPrices, block = block,
                    hourBlocks = listOf(HourBlock(2, 150_000.0)),
                ),
            )
        assertEquals(listOf(ProductFormIssue.HourBlocksNeedPrice), issues(null, null))
        assertTrue(issues(500_000.0, null).isEmpty())
        assertTrue("0đ per day is a price", issues(null, 0.0).isEmpty())
        assertTrue(issues(null, null, BlockTable(listOf(80_000.0))).isEmpty())
        assertTrue("staff never see prices", issues(null, null, showsPrices = false).isEmpty())
    }

    @Test
    fun `the setup screen rows`() {
        assertEquals(
            HourBlocks.Input.Blocks(listOf(HourBlock(2, 150_000.0), HourBlock(4, 250_000.0), HourBlock(8, 400_000.0))),
            HourBlocks.parse(listOf("8" to "400.000", "" to "", "2" to "150.000", "4" to "250.000")),
        )
        assertEquals(HourBlocks.Input.Empty, HourBlocks.parse(listOf("" to "", "" to "")))
        assertEquals(HourBlocks.Input.Blocks(listOf(HourBlock(1, 0.0), HourBlock(24, 1.0))), HourBlocks.parse(listOf("1" to "0", "24" to "1")))
        for (bad in listOf("0", "25", "x", "1.5")) {
            assertEquals(bad, HourBlocks.Input.Invalid(HourBlocks.Issue.HOURS), HourBlocks.parse(listOf(bad to "100")))
        }
        assertEquals(HourBlocks.Input.Invalid(HourBlocks.Issue.HOURS), HourBlocks.parse(listOf("" to "100.000")))
        assertEquals(HourBlocks.Input.Invalid(HourBlocks.Issue.PRICE), HourBlocks.parse(listOf("4" to "")))
        assertEquals(HourBlocks.Input.Invalid(HourBlocks.Issue.REPEATED), HourBlocks.parse(listOf("4" to "1", "4" to "2")))
        assertEquals(HourBlocks.Input.Invalid(HourBlocks.Issue.TOO_MANY), HourBlocks.parse((1..11).map { it.toString() to "1" }))
    }

    @Test
    fun `the sheet lists each block by option id`() {
        val choices = CartV2Logic.pricingChoices(line(vay))
        assertEquals(listOf("FIXED", "DAILY", "HOURLY:13", "HOURLY:12", "HOURLY:14"), choices.map { it.key })
        assertEquals(listOf(500_000.0, null, 150_000.0, 250_000.0, 400_000.0), choices.map { it.catalogPrice })
        assertEquals("FIXED", CartV2Logic.currentKey(line(vay)))
        assertEquals(250_000.0, CartV2Logic.sheetStartPrice(line(vay), "HOURLY:12")!!, 0.0)
        // a product without blocks: the sheet as before
        val plain = product(1, listOf(PricingOption(1, "FIXED", 300_000.0, true)))
        assertEquals(listOf("FIXED", "DAILY"), CartV2Logic.pricingChoices(line(plain)).map { it.key })
    }

    @Test
    fun `a block is charged once whatever the days`() {
        val onBlock = CartV2Logic.applyPricing(line(vay), "HOURLY:12", 250_000.0, rentalDays = 3)
        assertTrue(onBlock.isHourBlock)
        assertEquals("HOURLY", onBlock.pricingType)
        assertEquals(4, onBlock.hourBlockHours)
        assertNull("the block's own price is not an override", onBlock.unitPriceOverride)
        assertEquals(250_000.0, onBlock.unitPrice, 0.0)
        assertEquals("3-day order on Khối 4 giờ = 250.000", 250_000.0, onBlock.lineTotal, 0.0)
        assertEquals("HOURLY:12", CartV2Logic.currentKey(onBlock))
        assertEquals(150_000.0, CartV2Logic.applyPricing(line(vay), "HOURLY:13", 150_000.0, 1).lineTotal, 0.0)
        assertEquals("Vest 2 giờ × 2", 160_000.0, CartV2Logic.applyPricing(line(vest, qty = 2), "HOURLY:22", 80_000.0, 1).lineTotal, 0.0)
        val cart = listOf(CartV2Logic.applyPricing(line(vay), "HOURLY:12", 250_000.0, 3), CartV2Logic.applyPricing(line(vest), "HOURLY:22", 80_000.0, 3))
        assertEquals("Váy 4 giờ + Vest 2 giờ", 330_000.0, cart.sumOf { it.lineTotal }, 0.0)
        // the order payload: HOURLY with the block's option id
        val extras = CartOrderSubmit.lineExtras(cart)
        assertEquals(listOf("HOURLY", "HOURLY"), extras.map { PricingTypes.normalize(it.pricingType) })
        assertEquals(listOf(12, 22), extras.map { it.pricingOptionId })
    }

    @Test
    fun `price for this order and switching back`() {
        var vayLine = CartV2Logic.applyPricing(line(vay), "HOURLY:12", 200_000.0, 1)
        assertEquals("Giá cho đơn này", 200_000.0, vayLine.lineTotal, 0.0)
        assertEquals(200_000.0, CartV2Logic.sheetStartPrice(vayLine, "HOURLY:12")!!, 0.0)
        vayLine = CartV2Logic.applyPricing(vayLine, "HOURLY:12", null, 1)
        assertEquals("an empty box goes back to the block's price", 250_000.0, vayLine.unitPrice, 0.0)
        vayLine = CartV2Logic.applyPricing(vayLine, "HOURLY:14", 400_000.0, 1)
        assertEquals(8, vayLine.hourBlockHours)
        vayLine = CartV2Logic.applyPricing(vayLine, "FIXED", 500_000.0, 1)
        assertFalse(vayLine.isHourBlock)
        assertNull(vayLine.hourBlockHours)
        assertEquals(500_000.0, vayLine.unitPrice, 0.0)
        assertNull(CartOrderSubmit.lineExtras(listOf(vayLine)).single().pricingOptionId)
        assertEquals("no extra row for the way back", 5, CartV2Logic.pricingChoices(vayLine).size)
    }

    @Test
    fun `a saved line keeps its block, even one gone from the product`() {
        assertEquals(HourBlock(4, 250_000.0), HourBlocks.snapshotFrom(JSONObject("""{"type":"HOURLY","hours":4,"price":250000}""")))
        for (odd in listOf("""{"type":"HOURLY","hours":30,"price":1}""", """{"type":"BLOCK","hours":4,"price":1}""", """{"x":1}""")) {
            assertNull(odd, HourBlocks.snapshotFrom(JSONObject(odd)))
        }
        // as CartStore.loadFromOrderDetail builds it: a product without options, the saved price, the snapshot's hours
        val stub = Product(
            id = 7, name = "Váy", barcode = null, rentPrice = 250_000.0, salePrice = 250_000.0, stock = 0, available = 0, renting = 0,
            categoryId = null, categoryName = null, imageUrl = null, pricingType = "HOURLY",
        )
        var saved = CartLine(product = stub, quantity = 1, pricingType = "HOURLY", unitPriceOverride = 250_000.0, hourOptionId = 12, hourBlockHours = 4)
        assertTrue(saved.isHourBlock)
        assertEquals(listOf("FIXED", "DAILY", "HOURLY:12"), CartV2Logic.pricingChoices(saved).map { it.key })
        assertEquals(12, CartOrderSubmit.lineExtras(listOf(saved)).single().pricingOptionId)
        // the product loads: every block becomes a row, the line stays on its own
        saved = CartV2Logic.withFreshPricing(saved, vay)
        assertEquals(listOf("FIXED", "DAILY", "HOURLY:13", "HOURLY:12", "HOURLY:14"), CartV2Logic.pricingChoices(saved).map { it.key })
        assertEquals("HOURLY:12", CartV2Logic.currentKey(saved))

        // the option was deleted (the API set `pricingOptionId` to null): "Khối 4 giờ" stays, and comes back after a switch
        var gone = CartLine(product = stub, quantity = 1, pricingType = "HOURLY", unitPriceOverride = 250_000.0, hourBlockHours = 4)
        assertEquals("HOURLY:H4", CartV2Logic.currentKey(gone))
        assertEquals("HOURLY:H4", CartV2Logic.pricingChoices(gone).last().key)
        gone = CartV2Logic.applyPricing(gone, "FIXED", 300_000.0, 1)
        assertFalse(gone.isHourBlock)
        gone = CartV2Logic.applyPricing(gone, "HOURLY:H4", null, 1)
        assertTrue("and back", gone.isHourBlock)
        assertEquals(250_000.0, gone.unitPrice, 0.0)
        assertNull("the API keeps the stored snapshot", CartOrderSubmit.lineExtras(listOf(gone)).single().pricingOptionId)
    }

    @Test
    fun `this build says hour-blocks`() {
        assertTrue(com.anyrent.pos.domain.deposit.ClientCapabilities.TOKENS.contains("hour-blocks"))
    }
}
