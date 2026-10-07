package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.time.LocalDate

/** #411 — a MERCHANT without an outlet lets the API pick its default outlet (#398) */
class DefaultAvailabilityRepositoryOutletTest {
    private val requests = mutableListOf<Request>()
    private val start = LocalDate.of(2026, 10, 5)
    private val end = LocalDate.of(2026, 10, 6)

    private val single = """{"success":true,"data":{"productId":7,"isAvailable":true,"totalStock":3,"totalAvailableStock":3,"requestedQuantity":1}}"""
    private val batch = """{"success":true,"data":{"products":[{"productId":7,"isAvailable":true,"requestedQuantity":2}]}}"""
    private val calendar = """{"success":true,"data":{"days":[{"date":"2026-10-05","available":2}]}}"""

    private fun repo(role: String?, outletId: Int?, body: String): DefaultAvailabilityRepository {
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
        val api = ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { "token" },
            onUnauthorized = {},
            client = client,
            appVersion = "0.2.0",
        )
        return DefaultAvailabilityRepository(
            api = api,
            outletIdProvider = { outletId },
            roleProvider = { role },
            ioDispatcher = Dispatchers.Unconfined,
        )
    }

    private fun bodyOf(request: Request): JSONObject {
        val buffer = Buffer()
        request.body!!.writeTo(buffer)
        return JSONObject(buffer.readUtf8())
    }

    @Test
    fun merchantWithoutOutletChecksOneProductWithoutOutletId() = runBlocking {
        val result = repo("MERCHANT", null, single).checkAvailability(7, start, end, 1)
        assertTrue(result.isAvailable)
        assertEquals(1, requests.size)
        assertNull(requests.single().url.queryParameter("outletId"))
    }

    @Test
    fun merchantWithoutOutletChecksTheCartWithoutOutletId() = runBlocking {
        val result = repo("MERCHANT", null, batch)
            .checkBatchAvailability(listOf(AvailabilityRequest(7, 2)), start, end)
        assertTrue(result.getValue(7).isAvailable)
        assertEquals("/api/products/batch-availability", requests.single().url.encodedPath)
        assertFalse(bodyOf(requests.single()).has("outletId"))
    }

    @Test
    fun merchantWithoutOutletLoadsTheCalendarWithoutOutletId() = runBlocking {
        val days = repo("MERCHANT", null, calendar).occupancyCalendar(7, start, end)
        assertEquals(mapOf(start to 2), days)
        assertNull(requests.single().url.queryParameter("outletId"))
    }

    @Test
    fun sessionOutletIsStillSent() = runBlocking {
        repo("OUTLET_STAFF", 12, single).checkAvailability(7, start, end, 1)
        repo("MERCHANT", 34, batch).checkBatchAvailability(listOf(AvailabilityRequest(7, 2)), start, end)
        repo("OUTLET_ADMIN", 56, calendar).occupancyCalendar(7, start, end)
        assertEquals("12", requests[0].url.queryParameter("outletId"))
        assertEquals(34, bodyOf(requests[1]).getInt("outletId"))
        assertEquals("56", requests[2].url.queryParameter("outletId"))
    }

    @Test
    fun adminAndOutletUsersWithoutOutletAreRefusedOnTheDevice() = runBlocking {
        for (role in listOf("ADMIN", "OUTLET_ADMIN", "OUTLET_STAFF", null)) {
            val repository = repo(role, null, single)
            expectValidation { repository.checkAvailability(7, start, end, 1) }
            expectValidation { repository.checkBatchAvailability(listOf(AvailabilityRequest(7, 1)), start, end) }
            expectValidation { repository.occupancyCalendar(7, start, end) }
        }
        assertTrue("no request may leave the device", requests.isEmpty())
    }

    private suspend fun expectValidation(block: suspend () -> Unit) {
        try {
            block()
            fail("expected AppError.Validation")
        } catch (_: AppError.Validation) {
        }
    }
}
