package com.anyrent.pos.data

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.products.CartV2Logic
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/**
 * #418 — a product without a pricing type must be priced and sent as FIXED (per rental).
 *
 * On a device, Android's `org.json` returns the string "null" from `optString` for a JSON null,
 * so `parseProduct` stored "NULL" and `POST /api/orders` answered VALIDATION_ERROR. The JVM test
 * classpath uses the reference `org.json`, which returns the fallback instead; the "null" string
 * cases below reproduce what the device sees.
 */
class CartNullPricingTest {
    private val requests = mutableListOf<Request>()

    private fun api(): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                requests += chain.request()
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body("""{"success":true,"data":{"id":1}}""".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
        return ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { "token" },
            onUnauthorized = {},
            client = client,
            appVersion = "0.2.0",
        )
    }

    private fun productJson(pricingType: Any?) = JSONObject()
        .put("id", 32)
        .put("name", "P32")
        .put("rentPrice", 100000)
        .put("stock", 3)
        .put("pricingType", pricingType ?: JSONObject.NULL)

    private fun sentPricingTypes(): List<String> {
        val buffer = Buffer()
        requests.single().body!!.writeTo(buffer)
        val items = JSONObject(buffer.readUtf8()).getJSONArray("orderItems")
        return (0 until items.length()).map { items.getJSONObject(it).getString("pricingType") }
    }

    @Test
    fun `a product with a null pricing type is read as FIXED`() {
        assertEquals("FIXED", api().parseProduct(productJson(null)).pricingType)
        // What Android's org.json hands back for a JSON null
        assertEquals("FIXED", api().parseProduct(productJson("null")).pricingType)
        assertEquals("FIXED", api().parseProduct(productJson("")).pricingType)
    }

    @Test
    fun `an unknown pricing type is read as FIXED and known ones are kept`() {
        assertEquals("FIXED", api().parseProduct(productJson("BLOCK")).pricingType)
        assertEquals("DAILY", api().parseProduct(productJson("daily")).pricingType)
        assertEquals("HOURLY", api().parseProduct(productJson("HOURLY")).pricingType)
    }

    @Test
    fun `a pricing option without a type is read as FIXED`() {
        val json = productJson(null).put(
            "pricingOptions",
            org.json.JSONArray().put(JSONObject().put("id", 1).put("type", "null").put("price", 100000)),
        )
        assertEquals("FIXED", api().parseProduct(json).pricingOptions.single().type)
    }

    @Test
    fun `the per-day toggle stays hidden for such a product`() {
        val product = api().parseProduct(productJson("null"))
        assertFalse(CartV2Logic.offersBothModes(product))
        assertEquals("FIXED", CartLine(product = product, quantity = 1).pricingType)
    }

    @Test
    fun `createOrder never sends NULL as the pricing type`() {
        api().createOrder(
            orderType = "RENT",
            customerId = null,
            lines = listOf(Triple(32, 1, 100000.0), Triple(33, 1, 50000.0)),
            totalAmount = 150000.0,
            // A cart draft saved before the fix still holds "NULL"
            pricingTypesByProduct = mapOf(32 to "NULL", 33 to "DAILY"),
        ).getOrThrow()
        assertEquals(listOf("FIXED", "DAILY"), sentPricingTypes())
    }

    @Test
    fun `updateOrder never sends NULL as the pricing type`() {
        api().updateOrder(
            orderId = 7,
            orderType = "RENT",
            customerId = null,
            lines = listOf(Triple(32, 1, 100000.0)),
            totalAmount = 100000.0,
            pricingTypesByProduct = mapOf(32 to "NULL"),
        ).getOrThrow()
        assertEquals(listOf("FIXED"), sentPricingTypes())
    }
}
