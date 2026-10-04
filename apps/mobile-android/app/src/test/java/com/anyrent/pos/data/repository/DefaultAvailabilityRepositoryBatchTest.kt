package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.availability.AvailabilityRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate
import java.util.TimeZone

/**
 * #414: `POST /api/products/batch-availability` answers `data.results[]` (iOS
 * `BatchAvailabilityData.results`). The fixtures were captured from the local API
 * (merchant2, outlet 2, products 31 and 62, day 2026-10-05).
 */
class DefaultAvailabilityRepositoryBatchTest {
    private val batchBody = resource("availability/batch-availability-results.json")
    private val singleBody = resource("availability/product-62-availability.json")
    private val seen = mutableListOf<Request>()
    private val bodies = mutableListOf<String>()
    private lateinit var savedZone: TimeZone

    @Before
    fun setUp() {
        savedZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"))
    }

    @After
    fun tearDown() {
        TimeZone.setDefault(savedZone)
    }

    @Test
    fun `batch answer is read from data results with one request and no single checks`() {
        val repo = repository { request ->
            if (request.url.encodedPath == BATCH) 200 to batchBody else 500 to SINGLE_NOT_EXPECTED
        }

        val result = runBlocking {
            repo.checkBatchAvailability(
                requests = listOf(AvailabilityRequest(31, 1), AvailabilityRequest(62, 2)),
                startDate = LocalDate.of(2026, 10, 5),
                endDate = LocalDate.of(2026, 10, 5),
            )
        }

        assertEquals(listOf(BATCH), seen.map { it.url.encodedPath })
        val p31 = result.getValue(31)
        assertTrue(p31.isAvailable)
        assertEquals(11, p31.effectivelyAvailable)
        assertEquals(14, p31.totalStock)
        assertEquals(3, p31.totalRenting)
        assertEquals(1, p31.requestedQuantity)
        assertEquals(3, p31.conflicts.size)
        val p62 = result.getValue(62)
        assertFalse(p62.isAvailable)
        assertEquals(1, p62.effectivelyAvailable)
        assertEquals(2, p62.requestedQuantity)
        assertEquals("786100", p62.conflicts.single().orderNumber)
        assertEquals(2, p62.conflicts.single().quantity)
    }

    @Test
    fun `batch window is the cart plan instants of the chosen days in the device zone`() {
        val repo = repository { 200 to batchBody }

        runBlocking {
            repo.checkBatchAvailability(
                requests = listOf(AvailabilityRequest(31, 1), AvailabilityRequest(62, 2)),
                startDate = LocalDate.of(2026, 10, 4),
                endDate = LocalDate.of(2026, 10, 5),
            )
        }

        val sent = JSONObject(bodies.single())
        assertEquals("2026-10-03T17:00:00.000Z", sent.getString("startDate"))
        assertEquals("2026-10-05T16:59:59.000Z", sent.getString("endDate"))
    }

    @Test
    fun `an entry with an error falls back to the single check for that product only`() {
        val withError = JSONObject(batchBody).apply {
            val results = getJSONObject("data").getJSONArray("results")
            val kept = JSONArray().put(results.getJSONObject(0))
                .put(JSONObject().put("productId", 62).put("error", "PRODUCT_OUTLET_NOT_FOUND"))
            getJSONObject("data").put("results", kept)
        }.toString()
        val repo = repository { request ->
            when (request.url.encodedPath) {
                BATCH -> 200 to withError
                "/api/products/62/availability" -> 200 to singleBody
                else -> 500 to SINGLE_NOT_EXPECTED
            }
        }

        val result = runBlocking {
            repo.checkBatchAvailability(
                requests = listOf(AvailabilityRequest(31, 1), AvailabilityRequest(62, 2)),
                startDate = LocalDate.of(2026, 10, 5),
                endDate = LocalDate.of(2026, 10, 5),
            )
        }

        assertEquals(listOf(BATCH, "/api/products/62/availability"), seen.map { it.url.encodedPath })
        assertTrue(result.getValue(31).isAvailable)
        assertFalse(result.getValue(62).isAvailable)
        assertEquals(1, result.getValue(62).effectivelyAvailable)
    }

    @Test
    fun `a missing batch route still falls back to single checks`() {
        val repo = repository { request ->
            when (request.url.encodedPath) {
                BATCH -> 404 to """{"success":false,"message":"Not found"}"""
                "/api/products/62/availability" -> 200 to singleBody
                else -> 500 to SINGLE_NOT_EXPECTED
            }
        }

        val result = runBlocking {
            repo.checkBatchAvailability(
                requests = listOf(AvailabilityRequest(62, 2)),
                startDate = LocalDate.of(2026, 10, 5),
                endDate = LocalDate.of(2026, 10, 5),
            )
        }

        assertEquals(listOf(BATCH, "/api/products/62/availability"), seen.map { it.url.encodedPath })
        assertFalse(result.getValue(62).isAvailable)
    }

    @Test
    fun `a merchant login without an outlet still checks in one batch and lets the API pick the default outlet`() {
        val repo = repository(outletId = null) { request ->
            if (request.url.encodedPath == BATCH) 200 to batchBody else 500 to SINGLE_NOT_EXPECTED
        }

        val result = runBlocking {
            repo.checkBatchAvailability(
                requests = listOf(AvailabilityRequest(31, 1), AvailabilityRequest(62, 2)),
                startDate = LocalDate.of(2026, 10, 5),
                endDate = LocalDate.of(2026, 10, 5),
            )
        }

        assertEquals(listOf(BATCH), seen.map { it.url.encodedPath })
        assertFalse(JSONObject(bodies.single()).has("outletId"))
        assertEquals(setOf(31, 62), result.keys)
    }

    private fun repository(
        outletId: Int? = 2,
        answer: (Request) -> Pair<Int, String>,
    ): DefaultAvailabilityRepository {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request()
                seen += request
                request.body?.let { body -> bodies += Buffer().also { body.writeTo(it) }.readUtf8() }
                val (status, body) = answer(request)
                Response.Builder()
                    .request(request)
                    .protocol(Protocol.HTTP_1_1)
                    .code(status)
                    .message("Test response")
                    .body(body.toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
        val api = ApiClient(
            baseUrl = "https://example.test",
            tokenProvider = { "token" },
            onUnauthorized = {},
            client = client,
            appVersion = "test",
        )
        return DefaultAvailabilityRepository(
            api = api,
            outletIdProvider = { outletId },
            ioDispatcher = Dispatchers.Unconfined,
        )
    }

    private fun resource(name: String): String =
        requireNotNull(javaClass.classLoader?.getResource(name)) { "missing fixture $name" }.readText()

    private companion object {
        const val BATCH = "/api/products/batch-availability"
        const val SINGLE_NOT_EXPECTED = """{"success":false,"message":"single check not expected"}"""
    }
}
