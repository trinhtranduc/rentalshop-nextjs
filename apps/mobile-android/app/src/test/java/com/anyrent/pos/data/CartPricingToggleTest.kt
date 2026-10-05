package com.anyrent.pos.data

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.CartV2Logic
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.ResponseBody.Companion.toResponseBody
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #473 — the cart's "Theo lần / Theo ngày" toggle for a product that has both prices */
class CartPricingToggleTest {
    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private val api = ApiClient(
        baseUrl = "https://example.test",
        tokenProvider = { "token" },
        onUnauthorized = {},
        client = OkHttpClient(),
        appVersion = "0.2.0",
    )

    private val bothOptions = """
        [{"id":1,"productId":301,"type":"FIXED","price":150000,"unit":null,"blockSize":null,"isDefault":true,"isActive":true,
          "sortOrder":0,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"},
         {"id":2,"productId":301,"type":"DAILY","price":50000,"unit":null,"blockSize":null,"isDefault":false,"isActive":true,
          "sortOrder":1,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"}]
    """.trimIndent()

    /** One row of `GET /api/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc&outletId=17` (local stack, 2026-10-05) */
    private fun homeRow(options: String): Product = api.parseProduct(
        JSONObject(
            """
            {"id":301,"name":"Cart toggle probe both prices","description":null,"barcode":null,"totalStock":3,"stock":3,
             "renting":0,"available":3,"effectiveAvailableToday":3,"rentPrice":150000,"salePrice":0,"costPrice":0,"deposit":0,
             "images":[],"isActive":true,"embeddingGeneratedAt":null,"pricingType":"FIXED","durationConfig":null,
             "pricingOptions":$options,
             "createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z","deletedAt":null,"categoryId":1,
             "category":{"id":1,"name":"Electronics"},"merchant":{"id":9,"name":"Rental Shop Demo"},"merchantId":9,
             "outletStock":[{"id":601,"stock":3,"available":3,"renting":0,"productId":301,"outletId":17,
                             "outlet":{"id":17,"name":"Rental Shop Demo - Main Branch","address":"123 Main Street"}}]}
            """.trimIndent(),
        ),
    )

    @Test
    fun `a home row with both prices offers both modes`() {
        CartStore.addProduct(homeRow(bothOptions))
        val line = CartStore.lines.value.single()
        assertTrue(CartV2Logic.offersBothModes(line.product))
        assertEquals("FIXED", line.pricingType)
        assertEquals(150_000.0, line.unitPrice, 0.0)
    }

    @Test
    fun `a product with one price shows no toggle`() {
        val onePrice = homeRow("[]")
        CartStore.addProduct(onePrice)
        CartStore.addProduct(onePrice)
        CartStore.refreshPricing(onePrice)
        val line = CartStore.lines.value.single()
        assertEquals(2, line.quantity)
        assertFalse(CartV2Logic.offersBothModes(line.product))
    }

    @Test
    fun `a stale line gets the toggle when the product is added again`() {
        // Put in the cart while it had one price; then the per-day price was added and it is added again
        CartStore.addProduct(homeRow("[]"))
        assertFalse(CartV2Logic.offersBothModes(CartStore.lines.value.single().product))

        CartStore.addProduct(homeRow(bothOptions))
        val line = CartStore.lines.value.single()
        assertEquals(2, line.quantity)
        assertTrue(CartV2Logic.offersBothModes(line.product))
        assertEquals("FIXED", line.pricingType)
        assertEquals(150_000.0, line.unitPrice, 0.0)

        CartStore.setPricingType(301, "DAILY")
        assertEquals(50_000.0, CartStore.lines.value.single().unitPrice, 0.0)
    }

    @Test
    fun `an edited order line gets the toggle after a refresh and keeps its unit price`() {
        // What loadFromOrderDetail builds: no options, the order's own unit price
        val edited = CartLine(
            product = Product(
                id = 301, name = "Cart toggle probe both prices", barcode = null, rentPrice = 140_000.0,
                salePrice = 140_000.0, stock = 0, available = 0, renting = 0, categoryId = null, categoryName = null,
                imageUrl = null, pricingType = "FIXED",
            ),
            quantity = 1,
            pricingType = "FIXED",
            unitPriceOverride = 140_000.0,
        )
        assertFalse(CartV2Logic.offersBothModes(edited.product))

        val refreshed = CartV2Logic.withFreshPricing(edited, homeRow(bothOptions))
        assertTrue(CartV2Logic.offersBothModes(refreshed.product))
        assertEquals(140_000.0, refreshed.unitPrice, 0.0)
        assertEquals("FIXED", refreshed.pricingType)
        assertEquals(1, refreshed.quantity)
    }

    // Owner decision 2026-10-05: both modes on every rent line; the line price (this order only) is editable

    private val sent = mutableListOf<okhttp3.Request>()

    private val recordingApi = ApiClient(
        baseUrl = "https://example.test",
        tokenProvider = { "token" },
        onUnauthorized = {},
        client = OkHttpClient.Builder().addInterceptor { chain ->
            sent += chain.request()
            okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                .body("""{"success":true,"data":{"id":1}}""".toResponseBody("application/json".toMediaType()))
                .build()
        }.build(),
        appVersion = "0.2.0",
    )

    @Test
    fun `every rent line shows the toggle even with one price`() {
        CartStore.addProduct(homeRow("[]"))
        assertFalse(CartV2Logic.offersBothModes(CartStore.lines.value.single().product))
        assertTrue(CartV2Logic.showsPricingToggle(isSale = false))
        assertFalse(CartV2Logic.showsPricingToggle(isSale = true))
    }

    @Test
    fun `a mode without a price starts at zero, asks for a price and blocks create`() {
        CartStore.addProduct(homeRow("[]"))
        assertTrue(CartV2Logic.missingPrices(CartStore.lines.value, isSale = false).isEmpty())

        CartStore.setPricingType(301, "DAILY")
        val line = CartStore.lines.value.single()
        assertEquals(0.0, line.unitPrice, 0.0)
        assertTrue("the cart opens the price editor", CartV2Logic.needsPrice(line, isSale = false))
        assertEquals(listOf("Cart toggle probe both prices"), CartV2Logic.missingPrices(CartStore.lines.value, isSale = false))

        CartStore.setPricingType(301, "FIXED")
        assertEquals(150_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        assertTrue(CartV2Logic.missingPrices(CartStore.lines.value, isSale = false).isEmpty())
    }

    @Test
    fun `a line that already has a product price can be edited for this order only`() {
        val product = homeRow("[]")
        CartStore.addProduct(product, quantity = 2)
        CartStore.updateUnitPrice(301, 120_000.0)
        val line = CartStore.lines.value.single()
        assertEquals(120_000.0, line.unitPrice, 0.0)
        assertEquals(240_000.0, line.lineTotal, 0.0)
        assertEquals("the product price is untouched", 150_000.0, line.product.rentPrice, 0.0)
    }

    @Test
    fun `the edited per-day price is used in totals and the create request`() {
        CartStore.addProduct(homeRow("[]"), quantity = 2)
        CartStore.setPricingType(301, "DAILY")
        CartStore.updateUnitPrice(301, 60_000.0)
        val line = CartStore.lines.value.single()
        val days = line.rentalDays
        assertEquals(60_000.0 * 2 * days, line.lineTotal, 0.0)

        // What the review screen sends for the cart lines
        recordingApi.createOrder(
            orderType = "RENT",
            customerId = 5,
            lines = listOf(Triple(line.product.id, line.quantity, line.unitPrice)),
            totalAmount = line.lineTotal,
            pricingTypesByProduct = mapOf(line.product.id to line.pricingType),
            rentalDaysByProduct = mapOf(line.product.id to line.rentalDays),
        ).getOrThrow()
        val buffer = okio.Buffer()
        sent.single().body!!.writeTo(buffer)
        val item = JSONObject(buffer.readUtf8()).getJSONArray("orderItems").getJSONObject(0)
        assertEquals(60_000.0, item.getDouble("unitPrice"), 0.0)
        assertEquals("DAILY", item.getString("pricingType"))
        assertEquals(days, item.getInt("rentDays"))
        assertEquals(60_000.0 * 2 * days, item.getDouble("totalPrice"), 0.0)
    }
}
