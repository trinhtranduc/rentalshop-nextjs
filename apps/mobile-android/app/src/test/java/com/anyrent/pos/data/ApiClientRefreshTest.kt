package com.anyrent.pos.data

import com.anyrent.pos.domain.error.AppError
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections

/**
 * #344 — refresh on TOKEN_EXPIRED, sign out with the server's reason otherwise.
 */
class ApiClientRefreshTest {
    private class FakeServer(
        val handler: (Request, String) -> Pair<Int, String>,
    ) {
        val calls: MutableList<String> = Collections.synchronizedList(mutableListOf())

        val client: OkHttpClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request()
                val body = request.body?.let { b -> Buffer().also { b.writeTo(it) }.readUtf8() }.orEmpty()
                calls += "${request.url.encodedPath} ${request.header("Authorization").orEmpty()}"
                val (status, json) = handler(request, body)
                Response.Builder()
                    .request(request)
                    .protocol(Protocol.HTTP_1_1)
                    .code(status)
                    .message("Test")
                    .body(json.toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
    }

    private class Tokens(var access: String?, var refresh: String?)

    private fun api(server: FakeServer, tokens: Tokens, unauthorized: MutableList<String?>) = ApiClient(
        baseUrl = "https://example.test",
        tokenProvider = { tokens.access },
        onUnauthorized = { code -> unauthorized += code },
        client = server.client,
        refreshTokenProvider = { tokens.refresh },
        onTokensRefreshed = { access, refresh ->
            tokens.access = access
            tokens.refresh = refresh
        },
        deviceIdProvider = { "device-1" },
    )

    @Test
    fun `TOKEN_EXPIRED refreshes once and retries with the new token`() {
        val tokens = Tokens("old-access", "rt-1")
        val unauthorized = mutableListOf<String?>()
        val server = FakeServer { request, body ->
            when {
                request.url.encodedPath == "/api/mobile/auth/refresh" -> {
                    assertEquals("rt-1", JSONObject(body).getString("refreshToken"))
                    assertEquals("device-1", JSONObject(body).getString("deviceId"))
                    200 to """{"success":true,"data":{"token":"new-access","refreshToken":"rt-2"}}"""
                }
                request.header("Authorization") == "Bearer old-access" ->
                    401 to """{"success":false,"code":"TOKEN_EXPIRED","message":"expired"}"""
                else -> 200 to """{"success":true,"data":{"ok":true}}"""
            }
        }

        val json = api(server, tokens, unauthorized).authedGet("/api/orders")

        assertTrue(json.getJSONObject("data").getBoolean("ok"))
        assertEquals("new-access", tokens.access)
        assertEquals("rt-2", tokens.refresh)
        assertTrue(unauthorized.isEmpty())
        assertEquals(
            listOf(
                "/api/orders Bearer old-access",
                "/api/mobile/auth/refresh ",
                "/api/orders Bearer new-access",
            ),
            server.calls,
        )
    }

    @Test
    fun `SESSION_REPLACED signs out with that reason and does not refresh`() {
        val tokens = Tokens("access", "rt-1")
        val unauthorized = mutableListOf<String?>()
        val server = FakeServer { _, _ ->
            401 to """{"success":false,"code":"SESSION_REPLACED","message":"other device"}"""
        }

        assertThrows(AppError.Unauthorized::class.java) {
            api(server, tokens, unauthorized).authedGet("/api/orders")
        }

        assertEquals(listOf<String?>("SESSION_REPLACED"), unauthorized)
        assertEquals(1, server.calls.size)
    }

    @Test
    fun `refresh rejected because another device logged in signs out with SESSION_REPLACED`() {
        val tokens = Tokens("old-access", "rt-1")
        val unauthorized = mutableListOf<String?>()
        val server = FakeServer { request, _ ->
            if (request.url.encodedPath == "/api/mobile/auth/refresh") {
                401 to """{"success":false,"code":"SESSION_REPLACED"}"""
            } else {
                401 to """{"success":false,"code":"TOKEN_EXPIRED"}"""
            }
        }

        assertThrows(AppError.Unauthorized::class.java) {
            api(server, tokens, unauthorized).authedGet("/api/orders")
        }

        assertEquals(listOf<String?>("SESSION_REPLACED"), unauthorized)
        assertEquals(2, server.calls.size)
    }

    @Test
    fun `TOKEN_EXPIRED without a refresh token signs out`() {
        val tokens = Tokens("old-access", null)
        val unauthorized = mutableListOf<String?>()
        val server = FakeServer { _, _ -> 401 to """{"success":false,"code":"TOKEN_EXPIRED"}""" }

        assertThrows(AppError.Unauthorized::class.java) {
            api(server, tokens, unauthorized).authedGet("/api/orders")
        }

        assertEquals(listOf<String?>("TOKEN_EXPIRED"), unauthorized)
        assertEquals(1, server.calls.size)
    }

    @Test
    fun `wrong password on login does not sign out`() {
        val tokens = Tokens(null, null)
        val unauthorized = mutableListOf<String?>()
        val server = FakeServer { _, _ -> 401 to """{"success":false,"code":"INVALID_CREDENTIALS"}""" }

        assertThrows(AppError.Unauthorized::class.java) {
            api(server, tokens, unauthorized).publicPost(
                "/api/mobile/auth/login",
                """{"email":"a@b.c"}""".toRequestBody("application/json".toMediaType()),
            )
        }

        assertTrue(unauthorized.isEmpty())
        assertNull(tokens.access)
    }
}
