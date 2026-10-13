package com.anyrent.pos.data

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.ProductRowLogic
import com.anyrent.pos.domain.products.ProductStock
import org.json.JSONArray
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * #951 — 0đ is a price: a 0đ product and a line given free (typed 0) never ask "Nhập giá"; only a line with no price
 * does. Every add is its own cart line with a line id; per-line actions target that line (iOS reference).
 */
class CartZeroPriceLinesTest {
    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun product(
        id: Int,
        options: List<PricingOption>,
        rentPrice: Double = options.firstOrNull { it.isDefault }?.price ?: 0.0,
        salePrice: Double? = null,
        pricingType: String = "FIXED",
        deposit: Double = 0.0,
    ) = Product(
        id = id, name = "SP $id", barcode = null, rentPrice = rentPrice, salePrice = salePrice, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = deposit, pricingType = pricingType,
        pricingOptions = options,
    )

    private val free = product(1, listOf(PricingOption(11, "FIXED", 0.0, isDefault = true)))
    private val vest = product(2, listOf(PricingOption(21, "FIXED", 300_000.0, isDefault = true), PricingOption(22, "DAILY", 120_000.0)), salePrice = 900_000.0)
    private val noPrice = product(3, emptyList(), rentPrice = 0.0)

    // --- products

    @Test
    fun `a 0đ option is a price in the list, detail and form`() {
        assertEquals(0.0, ProductPricing.perRental(free)!!, 0.0)
        assertNull(ProductPricing.perDay(free))
        assertEquals(0.0, ProductRowLogic.price(free)!!.main, 0.0)
        // a product without options and rentPrice 0 has no price
        assertNull(ProductPricing.perRental(noPrice))
        assertNull(ProductRowLogic.price(noPrice))
        // sale 0 stays "not for sale" (old rows)
        assertNull(ProductPricing.sale(product(4, emptyList(), salePrice = 0.0)))
        val daily0 = product(5, listOf(PricingOption(51, "DAILY", 0.0, isDefault = true)), pricingType = "DAILY")
        assertEquals(0.0, ProductPricing.perDay(daily0)!!, 0.0)
    }

    // --- cart prices

    @Test
    fun `a 0đ product goes in the cart at 0đ and does not block create`() {
        CartStore.addProduct(free)
        val line = CartStore.lines.value.single()
        assertEquals(0.0, line.unitPrice, 0.0)
        assertEquals(0.0, line.lineTotal, 0.0)
        assertFalse(CartV2Logic.needsPrice(line, isSale = false))
        assertEquals(0.0, CartV2Logic.chipPrice(line, isSale = false)!!, 0.0)
        assertTrue(CartV2Logic.missingPrices(CartStore.lines.value, isSale = false).isEmpty())
        assertEquals(CartPricingChoiceOf("FIXED", 0.0), CartV2Logic.pricingChoices(line).first().let { CartPricingChoiceOf(it.type, it.catalogPrice) })
    }

    @Test
    fun `a product without a rent price still asks for one`() {
        CartStore.addProduct(noPrice)
        val line = CartStore.lines.value.single()
        assertTrue(CartV2Logic.needsPrice(line, isSale = false))
        assertNull(CartV2Logic.chipPrice(line, isSale = false))
        assertEquals(listOf("SP 3"), CartV2Logic.missingPrices(CartStore.lines.value, isSale = false))
        // typed 0 is a price
        CartStore.applyLinePricing(line.lineId, "FIXED", 0.0)
        assertFalse(CartV2Logic.needsPrice(CartStore.lines.value.single(), isSale = false))
        // clearing the typed price asks again
        CartStore.applyLinePricing(line.lineId, "FIXED", null)
        assertTrue(CartV2Logic.needsPrice(CartStore.lines.value.single(), isSale = false))
    }

    @Test
    fun `a priced line given free keeps 0 and does not ask, clearing goes back to the catalog price`() {
        CartStore.addProduct(vest, quantity = 2)
        val id = CartStore.lines.value.single().lineId
        CartStore.applyLinePricing(id, "FIXED", 0.0)
        var line = CartStore.lines.value.single()
        assertEquals(0.0, line.unitPrice, 0.0)
        assertEquals(0.0, line.lineTotal, 0.0)
        assertFalse(CartV2Logic.needsPrice(line, isSale = false))
        assertEquals(0.0, CartV2Logic.sheetStartPrice(line, "FIXED")!!, 0.0)
        assertEquals("the product keeps its price", 300_000.0, line.product.pricingOptions.first().price, 0.0)
        CartStore.applyLinePricing(id, "FIXED", null)
        line = CartStore.lines.value.single()
        assertEquals(300_000.0, line.unitPrice, 0.0)
    }

    @Test
    fun `a mode without a price starts empty in the sheet and asks for a price`() {
        CartStore.addProduct(product(6, emptyList(), rentPrice = 150_000.0))
        val id = CartStore.lines.value.single().lineId
        CartStore.setPricingType(id, "DAILY")
        val line = CartStore.lines.value.single()
        assertTrue(CartV2Logic.needsPrice(line, isSale = false))
        assertNull(CartV2Logic.sheetStartPrice(line, "DAILY"))
        assertEquals(150_000.0, CartV2Logic.sheetStartPrice(line, "FIXED")!!, 0.0)
    }

    @Test
    fun `a sale line never asks and shows 0đ`() {
        CartStore.setOrderType("SALE")
        CartStore.addProduct(product(7, emptyList(), rentPrice = 0.0, salePrice = 0.0))
        val line = CartStore.lines.value.single()
        assertFalse(CartV2Logic.needsPrice(line, isSale = true))
        assertEquals(0.0, CartV2Logic.chipPrice(line, isSale = true)!!, 0.0)
        // a sale line given free
        CartStore.addProduct(vest)
        val sale = CartStore.lines.value.last()
        CartStore.applyLinePricing(sale.lineId, null, 0.0)
        assertEquals(0.0, CartStore.lines.value.last().lineTotal, 0.0)
        CartStore.applyLinePricing(sale.lineId, null, null)
        assertEquals(900_000.0, CartStore.lines.value.last().unitPrice, 0.0)
    }

    @Test
    fun `the price box keeps a lone 0 and drops leading zeros`() {
        assertEquals("0", CartV2Logic.priceDigits("0"))
        assertEquals("0", CartV2Logic.priceDigits("00"))
        assertEquals("5", CartV2Logic.priceDigits("05"))
        assertEquals("120000", CartV2Logic.priceDigits("120.000đ"))
        assertEquals("", CartV2Logic.priceDigits(""))
    }

    @Test
    fun `an edited order with a 0 line does not ask for a price`() {
        CartStore.loadFromOrderDetail(order(listOf(item(1, 2, 7, 0.0), item(2, 1, 7, 150_000.0))))
        val lines = CartStore.lines.value
        assertEquals("lines load unmerged", 2, lines.size)
        assertTrue(CartV2Logic.missingPrices(lines, isSale = false).isEmpty())
        assertEquals(listOf(0.0, 150_000.0), lines.map { it.unitPrice })
        assertEquals(listOf(2, 1), lines.map { it.quantity })
        assertNotEquals(lines[0].lineId, lines[1].lineId)
    }

    // --- lines

    @Test
    fun `two adds are two lines, editing or removing one leaves the other`() {
        CartStore.addProduct(vest)
        CartStore.addProduct(vest)
        val (a, b) = CartStore.lines.value
        assertNotEquals(a.lineId, b.lineId)
        CartStore.applyLinePricing(b.lineId, "FIXED", 0.0)
        CartStore.updateQuantity(a.lineId, 3)
        CartStore.updateNote(b.lineId, "tặng")
        var lines = CartStore.lines.value
        assertEquals(listOf(3, 1), lines.map { it.quantity })
        assertEquals(listOf(300_000.0, 0.0), lines.map { it.unitPrice })
        assertEquals(listOf(null, "tặng"), lines.map { it.note })
        assertEquals(900_000.0, CartStore.subtotal, 0.0)
        // badge / "+" count = units across lines
        assertEquals(4, CartStore.itemCount)
        assertEquals(4, ProductRowLogic.cartCount(2, lines))
        assertEquals(mapOf(2 to 4), CartV2Logic.quantitiesByProduct(lines))
        CartStore.remove(a.lineId)
        lines = CartStore.lines.value
        assertEquals(listOf(b.lineId), lines.map { it.lineId })
        assertEquals(0.0, lines.single().unitPrice, 0.0)
        CartStore.updateQuantity(b.lineId, 0)
        assertTrue(CartStore.lines.value.isEmpty())
    }

    @Test
    fun `a saved draft keeps line ids, an older draft gets new ones and its 0 marker means no price`() {
        CartStore.addProduct(vest)
        CartStore.addProduct(vest)
        val ids = CartStore.lines.value.map { it.lineId }
        val json = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(json)
        assertEquals(ids, CartStore.lines.value.map { it.lineId })

        // A draft saved before #951: no lineId; an override of 0 was the "ask for a price" marker
        val old = CartStore.draftJson()
        val lines: JSONArray = old.getJSONArray("lines")
        for (i in 0 until lines.length()) lines.getJSONObject(i).remove("lineId")
        lines.getJSONObject(1).put("pricingType", "DAILY").put("unitPriceOverride", 0.0)
        lines.getJSONObject(1).getJSONObject("product").put("pricingOptions", JSONArray())
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(old)
        val restored = CartStore.lines.value
        assertEquals(2, restored.size)
        assertTrue(restored.all { it.lineId.isNotBlank() })
        assertNotEquals(restored[0].lineId, restored[1].lineId)
        assertNull(restored[1].unitPriceOverride)
        assertTrue(CartV2Logic.needsPrice(restored[1], isSale = false))
    }

    @Test
    fun `the order request keeps each line's own price, mode, days and note`() {
        val sent = mutableListOf<okhttp3.Request>()
        val api = ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { "token" },
            onUnauthorized = {},
            client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
                sent += chain.request()
                okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                    .body(okhttp3.ResponseBody.Companion.run { "{\"success\":true,\"data\":{\"id\":1}}".toResponseBody(null) })
                    .build()
            }.build(),
            appVersion = "0.2.0",
        )
        CartStore.addProduct(vest)
        CartStore.addProduct(vest, quantity = 2)
        val (paid, gift) = CartStore.lines.value
        CartStore.setPricingType(paid.lineId, "DAILY")
        CartStore.applyLinePricing(gift.lineId, "FIXED", 0.0)
        CartStore.updateNote(gift.lineId, "tặng")
        val lines = CartStore.lines.value
        api.createOrder(
            orderType = "RENT",
            customerId = 5,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount,
            rentalDays = 3,
            lineExtras = CartOrderSubmit.lineExtras(lines),
        )
        val buffer = okio.Buffer()
        sent.single().body!!.writeTo(buffer)
        val items = org.json.JSONObject(buffer.readUtf8()).getJSONArray("orderItems")
        assertEquals(2, items.length())
        val first = items.getJSONObject(0)
        val second = items.getJSONObject(1)
        assertEquals(listOf("DAILY", "FIXED"), listOf(first.getString("pricingType"), second.getString("pricingType")))
        assertEquals(listOf(120_000.0, 0.0), listOf(first.getDouble("unitPrice"), second.getDouble("unitPrice")))
        assertEquals(0.0, second.getDouble("totalPrice"), 0.0)
        assertEquals("tặng", second.getString("notes"))
        assertFalse(first.has("notes"))
    }

    private data class CartPricingChoiceOf(val type: String, val price: Double?)

    private fun item(id: Int, quantity: Int, productId: Int, unitPrice: Double) = OrderItem(
        id = id, productId = productId, productName = "Vest", quantity = quantity, unitPrice = unitPrice,
        totalPrice = unitPrice * quantity,
    )

    private fun order(items: List<OrderItem>) = OrderDetail(
        summary = OrderSummary(
            id = 95, orderNumber = "551122", orderType = "RENT", status = "RESERVED", totalAmount = 150_000.0,
            depositAmount = 0.0, customerName = "Khách", customerPhone = null,
            pickupPlanAt = "2026-10-20T03:00:00Z", returnPlanAt = "2026-10-21T03:00:00Z", createdAt = null, notes = null,
        ),
        items = items,
        customerId = 5,
        payments = emptyList(),
    )
}
