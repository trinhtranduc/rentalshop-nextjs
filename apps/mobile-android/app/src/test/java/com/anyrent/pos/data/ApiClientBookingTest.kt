package com.anyrent.pos.data

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/** #1124 the create-order body links the booking request; without one it is the request old apps send */
class ApiClientBookingTest {
    private val bodies = mutableListOf<Pair<String, String>>()

    private val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request()
            val body = request.body?.let { b -> Buffer().also { b.writeTo(it) }.readUtf8() }.orEmpty()
            bodies += request.url.encodedPath to body
            Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body("""{"success":true,"data":{"id":501,"orderNumber":"482913","orderType":"RENT","status":"RESERVED"}}""".toResponseBody("application/json".toMediaType()))
                .build()
        }
        .build()

    private fun api() = ApiClient(
        baseUrl = "https://example.test",
        tokenProvider = { "t" },
        onUnauthorized = {},
        client = client,
        refreshTokenProvider = { null },
        onTokensRefreshed = { _, _ -> },
        deviceIdProvider = { "device-1" },
    )

    @Test
    fun `createOrder sends bookingRequestId and the booking outlet`() {
        api().createOrder(
            orderType = "RENT", customerId = 41, lines = listOf(Triple(7, 2, 250_000.0)), totalAmount = 500_000.0,
            outletId = 3, bookingRequestId = 12,
        ).getOrThrow()
        val (path, body) = bodies.single()
        assertEquals("/api/orders", path)
        val json = JSONObject(body)
        assertEquals(12, json.getInt("bookingRequestId"))
        assertEquals(3, json.getInt("outletId"))
    }

    @Test
    fun `a normal order has no bookingRequestId`() {
        api().createOrder(
            orderType = "RENT", customerId = 41, lines = listOf(Triple(7, 1, 1.0)), totalAmount = 1.0, outletId = null,
        ).getOrThrow()
        assertFalse(JSONObject(bodies.single().second).has("bookingRequestId"))
    }
}
