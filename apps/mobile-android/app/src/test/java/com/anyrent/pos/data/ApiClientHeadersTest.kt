package com.anyrent.pos.data

import com.anyrent.pos.domain.appconfig.MobileFeature
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #370 — every request names the app and its version; app-config is read without a token */
class ApiClientHeadersTest {
    private val requests = mutableListOf<Request>()

    private fun api(body: String, token: String? = "token"): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                requests += chain.request()
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body(body.toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
        return ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { token },
            onUnauthorized = {},
            client = client,
            appVersion = "0.2.0",
        )
    }

    @Test
    fun `authed calls carry platform and version headers`() {
        api("""{"success":true,"data":{}}""").authedGet("/api/orders")
        val request = requests.single()
        assertEquals("mobile", request.header("X-Client-Platform"))
        assertEquals("android", request.header("X-Device-Type"))
        assertEquals("0.2.0", request.header("X-App-Version"))
        assertEquals("Bearer token", request.header("Authorization"))
    }

    @Test
    fun `app-config is public and parsed`() {
        val body = """
            {"success":true,"code":"APP_CONFIG_SUCCESS","data":{
              "ios":{"minVersion":"1.1.3","latestVersion":"1.2.0","storeUrl":null},
              "android":{"minVersion":"0.2.0","latestVersion":"0.2.1","storeUrl":"https://play.google.com/store/apps/details?id=anyrent.shop"},
              "features":{"newOrders":true,"newOrderDetail":false,"unknownFlag":true}}}
        """.trimIndent()
        val config = api(body).appConfig().getOrThrow()
        val request = requests.single()
        assertEquals("/api/mobile/app-config", request.url.encodedPath)
        assertNull(request.header("Authorization"))
        assertEquals("0.2.0", request.header("X-App-Version"))
        assertEquals("0.2.0", config.android.minVersion)
        assertEquals("https://play.google.com/store/apps/details?id=anyrent.shop", config.android.storeUrl)
        assertNull(config.ios.storeUrl)
        assertEquals(setOf(MobileFeature.NEW_ORDERS), config.features)
    }
}
