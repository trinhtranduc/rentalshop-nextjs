package com.anyrent.pos.data

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.products.BlockPricingError
import com.anyrent.pos.domain.products.BlockSnapshot
import com.anyrent.pos.domain.products.BlockTable
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.domain.products.PricingMode
import com.anyrent.pos.domain.products.PricingTypes
import com.anyrent.pos.domain.products.ProductPricing
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/**
 * #1189 — day-block pricing in the cart and on the wire: the owner's table 80 / 100 / 120 then +20 a day prices
 * 1 / 3 / 5 days at 80.000 / 120.000 / 160.000, a changed date prices the line again, the order payload says BLOCK
 * with the days, every request carries `X-Client-Capabilities: block-pricing`, and old payloads still decode.
 */
class CartBlockPricingTest {
    private val requests = mutableListOf<Request>()

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun api(): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                requests += chain.request()
                Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                    .body("""{"success":true,"data":{"id":1}}""".toResponseBody("application/json".toMediaType())).build()
            }
            .build()
        return ApiClient(baseUrl = "https://example.test", tokenProvider = { "token" }, onUnauthorized = {}, client = client, appVersion = "0.2.0")
    }

    private val blockOption = """{"id":9,"type":"BLOCK","price":80000,"isDefault":true,"isActive":true,
        "blockTiers":[80000,100000,120000],"blockStartDay":1,"blockExtraMode":"EXTRA_PER_DAY","blockExtraPrice":20000}"""

    private fun productJson(options: String = "[$blockOption]", salePrice: String = "null") = JSONObject(
        """{"id":25,"name":"Áo dài","barcode":"A25","totalStock":5,"stock":5,"renting":0,"available":5,
            "rentPrice":80000,"salePrice":$salePrice,"deposit":0,"images":[],"pricingType":"FIXED","pricingOptions":$options,
            "categoryId":1,"merchantId":9,"outletStock":[]}""",
    )

    private fun product() = api().parseProduct(productJson())

    /** The cart starts on today to tomorrow (2 days); these tests read the 1-day price */
    private fun oneDay() {
        val today = LocalDate.of(2026, 10, 25)
        CartStore.setPickup(today)
        CartStore.setReturn(today)
    }

    private fun sentBody(): JSONObject {
        val buffer = Buffer()
        requests.last().body!!.writeTo(buffer)
        return JSONObject(buffer.readUtf8())
    }

    @Test
    fun `a product with a block option reads its table and is block by default`() {
        val product = product()
        assertEquals(BlockTable(listOf(80_000.0, 100_000.0, 120_000.0), 1, "EXTRA_PER_DAY", 20_000.0), ProductPricing.block(product))
        assertEquals(PricingMode.BLOCK, ProductPricing.defaultMode(product))
    }

    @Test
    fun `an old payload without block fields still decodes`() {
        val old = api().parseProduct(productJson("""[{"id":1,"type":"FIXED","price":150000,"isDefault":true},{"id":2,"type":"DAILY","price":50000}]"""))
        assertNull(ProductPricing.block(old))
        assertEquals(PricingMode.PER_RENTAL, ProductPricing.defaultMode(old))
        assertEquals(2, old.pricingOptions.size)
        // a BLOCK option without a table (before #1189) is a plain option, not a block table
        val bare = api().parseProduct(productJson("""[{"id":3,"type":"BLOCK","price":400000,"isDefault":true}]"""))
        assertNull(ProductPricing.block(bare))
        assertEquals(PricingMode.PER_RENTAL, ProductPricing.defaultMode(bare))
    }

    @Test
    fun `a null sale price is none, not NaN`() {
        // #1199 baseline: Android crashed in the cart on a product whose salePrice is null
        val product = product()
        assertNull(product.salePrice)
        CartStore.addProduct(product)
        val line = CartStore.lines.value.single()
        assertFalse(line.unitPrice.isNaN())
        assertFalse(line.lineTotal.isNaN())
        assertFalse(CartStore.totalAmount.isNaN())
        // the control: a FIXED product with a null sale price
        val fixed = api().parseProduct(productJson("""[{"id":1,"type":"FIXED","price":150000,"isDefault":true}]"""))
        assertNull(fixed.salePrice)
        assertEquals(150_000.0, CartLine(product = fixed, quantity = 1).unitPrice, 0.0)
        // a real sale price is kept
        assertEquals(500_000.0, api().parseProduct(productJson(salePrice = "500000")).salePrice!!, 0.0)
        // a sale cart line of the null-price product falls back to the rent price instead of NaN
        assertEquals(80_000.0, CartLine(product = fixed.copy(rentPrice = 80_000.0), quantity = 1, isSale = true).unitPrice, 0.0)
    }

    @Test
    fun `1 3 and 5 days cost 80000 120000 and 160000 and a changed date prices again`() {
        CartStore.addProduct(product())
        val today = LocalDate.of(2026, 10, 25)
        fun total(days: Int): Double {
            CartStore.setPickup(today)
            CartStore.setReturn(today.plusDays(days - 1L))
            return CartStore.subtotal
        }
        assertEquals("BLOCK", CartStore.lines.value.single().pricingType)
        assertEquals(80_000.0, total(1), 0.0)
        assertEquals(120_000.0, total(3), 0.0)
        val five = CartStore.lines.value.single()
        assertEquals(160_000.0, total(5), 0.0)
        assertEquals(160_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        assertEquals(2, CartStore.lines.value.single().blockDetail!!.extraDays)
        // two units: the price is per unit
        CartStore.updateQuantity(five.lineId, 2)
        assertEquals(320_000.0, CartStore.subtotal, 0.0)
        // staff cannot type a price on a block line
        CartStore.updateUnitPrice(five.lineId, 5.0)
        assertNull(CartStore.lines.value.single().unitPriceOverride)
        assertEquals(320_000.0, CartStore.subtotal, 0.0)
    }

    @Test
    fun `a sale cart ignores the table`() {
        CartStore.addProduct(product())
        CartStore.setOrderType("SALE")
        assertNull(CartStore.lines.value.single().blockDetail)
    }

    @Test
    fun `the order payload sends BLOCK with the days, the price and the option id`() {
        CartStore.addProduct(product())
        val today = LocalDate.of(2026, 10, 25)
        CartStore.setPickup(today)
        CartStore.setReturn(today.plusDays(4))
        val lines = CartStore.lines.value
        api().createOrder(
            orderType = "RENT", customerId = null,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount, rentalDays = CartStore.rentalDaysInclusive(),
            lineExtras = CartOrderSubmit.lineExtras(lines),
        ).getOrThrow()
        val item = sentBody().getJSONArray("orderItems").getJSONObject(0)
        assertEquals("BLOCK", item.getString("pricingType"))
        assertEquals(5, item.getInt("rentDays"))
        assertEquals(160_000.0, item.getDouble("unitPrice"), 0.0)
        assertEquals(160_000.0, item.getDouble("totalPrice"), 0.0)
        assertEquals(9, item.getInt("pricingOptionId"))
        assertEquals(160_000.0, sentBody().getDouble("totalAmount"), 0.0)
    }

    @Test
    fun `a block line without a table goes out as FIXED`() {
        // a BLOCK option from before #1189 has a price and no table: it is a plain price
        val bare = api().parseProduct(productJson("""[{"id":3,"type":"BLOCK","price":400000,"isDefault":true}]"""))
        val line = CartLine(product = bare, quantity = 1, pricingType = "BLOCK")
        assertNull(line.blockDetail)
        assertEquals(400_000.0, line.unitPrice, 0.0)
        api().createOrder(
            orderType = "RENT", customerId = null, lines = listOf(Triple(25, 1, line.unitPrice)), totalAmount = 400_000.0,
            lineExtras = CartOrderSubmit.lineExtras(listOf(line)),
        ).getOrThrow()
        val item = sentBody().getJSONArray("orderItems").getJSONObject(0)
        assertEquals("FIXED", item.getString("pricingType"))
        assertFalse(item.has("pricingOptionId"))
        assertEquals(1, item.getInt("rentDays"))
    }

    @Test
    fun `every request carries the capability header`() {
        api().getProduct(25)
        assertEquals("installments,block-pricing", requests.last().header("X-Client-Capabilities"))
        api().createOrder(orderType = "SALE", customerId = null, lines = listOf(Triple(25, 1, 1.0)), totalAmount = 1.0).getOrThrow()
        assertEquals("installments,block-pricing", requests.last().header("X-Client-Capabilities"))
    }

    @Test
    fun `a line loaded from a saved order keeps its table and prices again on a new date`() {
        val snapshot = BlockSnapshot.from(
            JSONObject("""{"tiers":[80000,100000,120000],"startDay":1,"extraMode":"EXTRA_PER_DAY","extraPrice":20000,"currency":"VND","days":3}"""),
        )!!
        val bare = api().parseProduct(productJson("[]"))
        val line = CartLine(product = bare, quantity = 1, rentalDays = 3, pricingType = "BLOCK", unitPriceOverride = 120_000.0, savedBlockTable = snapshot.table)
        assertEquals(120_000.0, line.unitPrice, 0.0)
        assertEquals(160_000.0, line.copy(rentalDays = 5).unitPrice, 0.0)
        // the sheet offers the table the order was priced with
        assertTrue(CartV2Logic.pricingChoices(line).any { it.type == "BLOCK" })
    }

    @Test
    fun `the draft keeps the table of a block line`() {
        CartStore.addProduct(product())
        oneDay()
        val saved = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(saved)
        val line = CartStore.lines.value.single()
        assertNotNull(line.blockTable)
        assertEquals("BLOCK", line.pricingType)
        assertEquals(80_000.0, line.unitPrice, 0.0)
    }

    @Test
    fun `a changed table reloads onto the block lines`() {
        CartStore.addProduct(product())
        oneDay()
        val changed = api().parseProduct(
            productJson("""[{"id":9,"type":"BLOCK","price":90000,"isDefault":true,"blockTiers":[90000,110000],"blockExtraMode":"HOLD_LAST"}]"""),
        )
        CartStore.refreshBlockTable(changed)
        assertEquals(90_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        // a product without a table changes nothing
        CartStore.refreshBlockTable(api().parseProduct(productJson("[]")))
        assertEquals(90_000.0, CartStore.lines.value.single().unitPrice, 0.0)
    }

    @Test
    fun `the product save sends the version and the table, the old form does not`() {
        val options = com.anyrent.pos.domain.products.ProductPricing.options(
            perRental = 92_000.0, perDay = null, defaultMode = PricingMode.BLOCK,
            block = BlockTable(listOf(80_000.0, 100_000.0, 120_000.0), 1, "EXTRA_PER_DAY", 20_000.0),
        )
        assertEquals(listOf("FIXED", "BLOCK"), options.map { it.type })
        assertEquals(listOf(false, true), options.map { it.isDefault })
        assertEquals(80_000.0, options.last().price, 0.0)
        // the default falls back to the mode that has a price
        val fallback = com.anyrent.pos.domain.products.ProductPricing.options(null, null, PricingMode.PER_DAY, BlockTable(listOf(5.0)))
        assertTrue(fallback.single().isDefault)
        assertEquals(2, PRICING_SCHEMA_VERSION)
    }

    @Test
    fun `BLOCK is kept by the type reader and the code of a mismatch is on the error`() {
        assertEquals("BLOCK", PricingTypes.normalize("block"))
        assertEquals("FIXED", PricingTypes.normalize("WEEKLY"))
        assertEquals("BLOCK_PRICE_MISMATCH", BlockPricingError.PRICE_MISMATCH)
        assertEquals("BLOCK_PRICE_MISMATCH", AppError.Http(400, "x", "BLOCK_PRICE_MISMATCH").code)
        assertFalse(CartOrderSubmit.reloadBlockTablesIfNeeded(AppError.Http(400, "x", "VALIDATION_ERROR")))
    }
}
