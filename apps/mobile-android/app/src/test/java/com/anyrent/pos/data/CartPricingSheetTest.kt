package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.CartPricingChoice
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.domain.products.PricingTypes
import okhttp3.OkHttpClient
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/** #482 — one pricing chip per cart line and the "Cách tính giá" sheet (board Gio-hang-chon-gia; iOS parity) */
class CartPricingSheetTest {
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

    private fun product(options: String): Product = api.parseProduct(
        JSONObject(
            """
            {"id":301,"name":"Vest đen slim fit","barcode":"VS-004","totalStock":3,"stock":3,"renting":0,"available":3,
             "rentPrice":150000,"salePrice":0,"deposit":0,"images":[],"pricingType":"FIXED","pricingOptions":$options,
             "categoryId":1,"merchantId":9,"outletStock":[]}
            """.trimIndent(),
        ),
    )

    private val threeOptions = """
        [{"id":1,"type":"FIXED","price":350000,"isDefault":true},
         {"id":2,"type":"DAILY","price":150000,"isDefault":false},
         {"id":3,"type":"BLOCK","price":0,"isDefault":false}]
    """.trimIndent()

    @Test
    fun `sheet lists both modes then other option types`() {
        CartStore.addProduct(product(threeOptions))
        val line = CartStore.lines.value.single()
        assertEquals(
            listOf(CartPricingChoice("FIXED", 350_000.0), CartPricingChoice("DAILY", 150_000.0), CartPricingChoice("BLOCK", null)),
            CartV2Logic.pricingChoices(line),
        )
        CartStore.clear(persistToDisk = false)
        CartStore.addProduct(product("[]"))
        val onePrice = CartStore.lines.value.single()
        assertEquals(listOf("FIXED", "DAILY"), CartV2Logic.pricingChoices(onePrice).map { it.type })
        assertNull(CartV2Logic.pricingChoices(onePrice)[1].catalogPrice)
    }

    @Test
    fun `field starts at the line price then the catalog price`() {
        CartStore.addProduct(product(threeOptions))
        val id = CartStore.lines.value.single().product.id
        CartStore.applyLinePricing(id, "FIXED", 320_000.0)
        val line = CartStore.lines.value.single()
        assertEquals(320_000.0, CartV2Logic.startPrice(line, "FIXED"), 0.1)
        assertEquals(150_000.0, CartV2Logic.startPrice(line, "DAILY"), 0.1)
        assertEquals(0.0, CartV2Logic.startPrice(line, "BLOCK"), 0.1)
    }

    @Test
    fun `preview multiplies days only for a daily rent price`() {
        val daily = CartV2Logic.pricePreview("DAILY", 130_000.0, 3, 1, isSale = false)
        assertEquals(3, daily.days)
        assertEquals(390_000.0, daily.total, 0.1)
        val fixed = CartV2Logic.pricePreview("FIXED", 350_000.0, 3, 2, isSale = false)
        assertNull(fixed.days)
        assertEquals(700_000.0, fixed.total, 0.1)
        assertEquals(600_000.0, CartV2Logic.pricePreview("DAILY", 300_000.0, 3, 2, isSale = true).total, 0.1)
    }

    @Test
    fun `apply changes only the line, and the catalog price clears the override`() {
        CartStore.addProduct(product(threeOptions))
        val id = CartStore.lines.value.single().product.id
        CartStore.applyLinePricing(id, "DAILY", 130_000.0)
        var line = CartStore.lines.value.single()
        assertEquals("DAILY", line.pricingType)
        assertEquals(130_000.0, line.unitPrice, 0.1)
        assertEquals(150_000.0, line.product.pricingOptions.first { it.type == "DAILY" }.price, 0.1)

        CartStore.applyLinePricing(id, "DAILY", 150_000.0)
        line = CartStore.lines.value.single()
        assertNull("the catalog price is not pinned", line.unitPriceOverride)

        CartStore.applyLinePricing(id, "BLOCK", 400_000.0)
        line = CartStore.lines.value.single()
        assertEquals("BLOCK", line.pricingType)
        assertEquals(400_000.0, line.lineTotal, 0.1)
        // The order API takes FIXED / HOURLY / DAILY: a block price goes out as FIXED (unit × quantity)
        assertEquals("FIXED", PricingTypes.normalize(line.pricingType))
        assertEquals("BLOCK", PricingTypes.normalizeOption("block"))
    }
}
