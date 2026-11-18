package com.anyrent.pos.data

import com.anyrent.pos.domain.products.HourBlock
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/**
 * #1621 hour blocks on the wire: the API's HOURLY options become blocks, the cart sends a block line as HOURLY with its
 * option id and a flat total (Váy 4 giờ + Vest 2 giờ = 330.000 over 3 days), and an edited order keeps its block.
 */
class CartHourBlocksTest {
    private val requests = mutableListOf<Request>()
    private var responseBody = """{"success":true,"data":{"id":1}}"""

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun api(): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                requests += chain.request()
                Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                    .body(responseBody.toResponseBody("application/json".toMediaType())).build()
            }
            .build()
        return ApiClient(baseUrl = "https://example.test", tokenProvider = { "token" }, onUnauthorized = {}, client = client, appVersion = "0.2.0")
    }

    private fun productJson(id: Int, name: String, options: String) = JSONObject(
        """{"id":$id,"name":"$name","barcode":null,"totalStock":5,"stock":5,"renting":0,"available":5,
            "rentPrice":500000,"salePrice":null,"deposit":0,"images":[],"pricingType":"FIXED","pricingOptions":$options,
            "categoryId":1,"merchantId":9,"outletStock":[]}""",
    )

    private val vay = productJson(
        7, "Váy cưới trắng",
        """[{"id":11,"type":"FIXED","price":500000,"isDefault":true,"isActive":true},
            {"id":12,"type":"HOURLY","price":250000,"unit":"HOUR","blockSize":4,"isDefault":false,"isActive":true},
            {"id":13,"type":"HOURLY","price":150000,"unit":"HOUR","blockSize":2,"isDefault":false,"isActive":true},
            {"id":14,"type":"HOURLY","price":400000,"unit":"HOUR","blockSize":8,"isDefault":false,"isActive":true}]""",
    )
    private val vest = productJson(
        8, "Vest nam đen",
        """[{"id":21,"type":"FIXED","price":250000,"isDefault":true,"isActive":true},
            {"id":22,"type":"HOURLY","price":80000,"unit":"HOUR","blockSize":2,"isDefault":false,"isActive":true}]""",
    )

    private fun sentBody(): JSONObject {
        val buffer = Buffer()
        requests.last().body!!.writeTo(buffer)
        return JSONObject(buffer.readUtf8())
    }

    @Test
    fun `HOURLY options with hours parse as blocks`() {
        val p = api().parseProduct(vay)
        assertEquals(listOf(HourBlock(2, 150_000.0), HourBlock(4, 250_000.0), HourBlock(8, 400_000.0)), ProductPricing.hourBlocks(p))
        assertEquals("a block is not a per-rental price", 500_000.0, ProductPricing.perRental(p)!!, 0.0)
        // an old "per hour" option without hours is not a block
        val old = api().parseProduct(productJson(1, "Áo", """[{"id":1,"type":"FIXED","price":1,"isDefault":true},{"id":2,"type":"HOURLY","price":50000}]"""))
        assertTrue(ProductPricing.hourBlocks(old).isEmpty())
    }

    @Test
    fun `a cart of Vay on 4 hours and Vest on 2 hours sends 330000 over 3 days`() {
        val api = api()
        CartStore.addProduct(api.parseProduct(vay))
        CartStore.addProduct(api.parseProduct(vest))
        val today = LocalDate.of(2026, 11, 18)
        CartStore.setPickup(today)
        CartStore.setReturn(today.plusDays(2))
        val (vayLine, vestLine) = CartStore.lines.value
        CartStore.applyLinePricing(vayLine.lineId, "HOURLY:12", 250_000.0)
        CartStore.applyLinePricing(vestLine.lineId, "HOURLY:22", 80_000.0)
        assertEquals(330_000.0, CartStore.subtotal, 0.0)
        val lines = CartStore.lines.value
        api.createOrder(
            orderType = "RENT", customerId = 5,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount, rentalDays = CartStore.rentalDaysInclusive(),
            lineExtras = CartOrderSubmit.lineExtras(lines),
        ).getOrThrow()
        val items = sentBody().getJSONArray("orderItems")
        val sent = (0 until items.length()).map { items.getJSONObject(it) }
        assertEquals(listOf("HOURLY", "HOURLY"), sent.map { it.getString("pricingType") })
        assertEquals(listOf(12, 22), sent.map { it.getInt("pricingOptionId") })
        assertEquals(listOf(250_000.0, 80_000.0), sent.map { it.getDouble("totalPrice") })
        assertEquals(listOf(1, 1), sent.map { it.getInt("rentDays") })
        assertEquals(330_000.0, sentBody().getDouble("totalAmount"), 0.0)
    }

    @Test
    fun `an edited order keeps its block and sends it back`() {
        responseBody = """{"success":true,"data":{"id":95,"orderNumber":"482913","orderType":"RENT","status":"RESERVED",
            "totalAmount":250000,"depositAmount":0,"customerId":5,"customerName":"Lan",
            "pickupPlanAt":"2026-11-18T03:00:00Z","returnPlanAt":"2026-11-20T03:00:00Z",
            "orderItems":[{"id":1,"productId":7,"productName":"Váy cưới trắng","quantity":1,"unitPrice":250000,"totalPrice":250000,
              "rentalDays":1,"pricingType":"HOURLY","pricingOptionId":12,"pricingSnapshot":{"type":"HOURLY","hours":4,"price":250000}}],
            "payments":[]}}"""
        val api = api()
        val detail = api.getOrder(95).getOrThrow()
        val item = detail.items.single()
        assertEquals(HourBlock(4, 250_000.0), item.hourBlock)
        assertEquals(12, item.pricingOptionId)
        assertNull("not a day-block table", item.pricingSnapshot)
        CartStore.loadFromOrderDetail(detail)
        val line = CartStore.lines.value.single()
        assertTrue(line.isHourBlock)
        assertEquals(4, line.hourBlockHours)
        assertEquals(250_000.0, line.lineTotal, 0.0)
        val lines = CartStore.lines.value
        api.updateOrder(
            orderId = 95, orderType = "RENT", customerId = 5,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount, lineExtras = CartOrderSubmit.lineExtras(lines),
        ).getOrThrow()
        val sent = sentBody().getJSONArray("orderItems").getJSONObject(0)
        assertEquals("HOURLY", sent.getString("pricingType"))
        assertEquals(12, sent.getInt("pricingOptionId"))
        assertEquals(250_000.0, sent.getDouble("totalPrice"), 0.0)
    }

    @Test
    fun `a saved cart keeps the line's block`() {
        CartStore.addProduct(api().parseProduct(vay))
        CartStore.applyLinePricing(CartStore.lines.value.single().lineId, "HOURLY:12", 250_000.0)
        val json = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(json)
        val restored = CartStore.lines.value.single()
        assertTrue(restored.isHourBlock)
        assertEquals(4, restored.hourBlockHours)
        assertEquals(12, restored.hourOptionId)
        assertEquals(4, restored.product.pricingOptions.first { it.id == 12 }.blockSize)
        assertEquals(250_000.0, restored.lineTotal, 0.0)
    }
}
