package com.anyrent.pos.data

import com.anyrent.pos.domain.error.AppError
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiClientErrorTest {
    @Test
    fun `401 clears session through callback and returns typed unauthorized error`() {
        var unauthorizedCalls = 0
        val api = apiReturning(
            status = 401,
            body = """{"success":false,"message":"Token expired"}""",
            onUnauthorized = { unauthorizedCalls++ },
        )

        val error = assertThrows(AppError.Unauthorized::class.java) {
            api.authedGet("/api/orders")
        }

        assertEquals("Token expired", error.message)
        assertEquals(1, unauthorizedCalls)
    }

    @Test
    fun `non successful HTTP cannot pass even when envelope says success`() {
        val api = apiReturning(500, """{"success":true,"message":"Unexpected"}""")

        val error = assertThrows(AppError.Http::class.java) {
            api.authedGet("/api/orders")
        }

        assertEquals(500, error.statusCode)
    }

    @Test
    fun `invalid JSON becomes typed invalid response`() {
        val api = apiReturning(200, "<html>not json</html>")

        assertThrows(AppError.InvalidResponse::class.java) {
            api.authedGet("/api/orders")
        }
    }

    @Test
    fun `delete enforces failed success envelope`() {
        val api = apiReturning(200, """{"success":false,"message":"Cannot delete"}""")

        val error = assertThrows(AppError.InvalidResponse::class.java) {
            api.authedDelete("/api/products/7")
        }

        assertTrue(error.message.orEmpty().contains("Cannot delete"))
    }

    @Test
    fun `plan limit keeps user text and does not append machine code`() {
        val api = apiReturning(
            422,
            """{"success":false,"code":"PLAN_LIMIT_EXCEEDED","message":"Plan limit exceeded"}""",
        )

        val error = assertThrows(AppError.Http::class.java) {
            api.authedGet("/api/products")
        }

        assertEquals(422, error.statusCode)
        assertEquals("PLAN_LIMIT_EXCEEDED", error.code)
        assertEquals("Plan limit exceeded", error.message)
    }

    private fun apiReturning(
        status: Int,
        body: String,
        onUnauthorized: () -> Unit = {},
    ): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(status)
                    .message("Test response")
                    .body(body.toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
        return ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { "token" },
            onUnauthorized = onUnauthorized,
            client = client,
        )
    }
}
