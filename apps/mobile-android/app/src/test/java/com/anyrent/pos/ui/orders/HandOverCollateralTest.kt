package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.ui.orders.v2.OrderDetailSource
import com.anyrent.pos.ui.orders.v2.OrderDetailV2ViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
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

/**
 * #427 — hand-over asks for papers and a security deposit but does not require them.
 * Empty fields still hand the order over; given fields travel with `status: PICKUPED`.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class HandOverCollateralTest {
    private val dispatcher = StandardTestDispatcher()
    private val requests = mutableListOf<Request>()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    private fun api(): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                requests += chain.request()
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body("""{"success":true,"data":{"id":9,"status":"PICKUPED"}}""".toResponseBody("application/json".toMediaType()))
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

    private fun sentBody(): JSONObject {
        val buffer = Buffer()
        requests.single().body!!.writeTo(buffer)
        return JSONObject(buffer.readUtf8())
    }

    @Test
    fun `empty papers and no deposit send only the status`() {
        val fields = OrderDetailLogic.handOverFields(papers = "  ", securityDeposit = 0.0, currentPapers = null, currentDeposit = 0.0)
        assertEquals(HandOverFields(), fields)

        assertTrue(api().updateOrderStatus(9, "PICKUPED", fields).isSuccess)

        val body = sentBody()
        assertEquals("PUT", requests.single().method)
        assertTrue(requests.single().url.toString().endsWith("/api/orders/9"))
        assertEquals("PICKUPED", body.getString("status"))
        assertEquals(setOf("status"), body.keys().asSequence().toSet())
    }

    @Test
    fun `papers and deposit travel with the status like the old screen sends them`() {
        val fields = OrderDetailLogic.handOverFields(papers = " CCCD ", securityDeposit = 500.0, currentPapers = null, currentDeposit = 0.0)
        assertEquals(HandOverFields(collateralType = "ID_CARD", collateralDetails = "CCCD", securityDeposit = 500.0), fields)

        api().updateOrderStatus(9, "PICKUPED", fields).getOrThrow()

        val body = sentBody()
        assertEquals("PICKUPED", body.getString("status"))
        assertEquals("ID_CARD", body.getString("collateralType"))
        assertEquals("CCCD", body.getString("collateralDetails"))
        assertEquals(500.0, body.getDouble("securityDeposit"), 0.0)
    }

    @Test
    fun `clearing prefilled papers and deposit clears them on the order`() {
        val fields = OrderDetailLogic.handOverFields(papers = "", securityDeposit = 0.0, currentPapers = "GPLX", currentDeposit = 300.0)
        assertEquals(HandOverFields(collateralDetails = "", securityDeposit = 0.0), fields)
    }

    @Test
    fun `the view model hands over with empty fields`() = runTest(dispatcher) {
        val source = FakeSource()
        val vm = OrderDetailV2ViewModel(9, source)
        advanceUntilIdle()
        var done: Boolean? = null

        vm.handOver(HandOverFields()) { done = it }
        advanceUntilIdle()

        assertEquals(true, done)
        assertEquals(listOf(9 to HandOverFields()), source.handOvers)
        assertNull(vm.state.value.statusError)
        assertEquals(2, source.loads)
    }

    private class FakeSource : OrderDetailSource {
        var loads = 0
        val handOvers = mutableListOf<Pair<Int, HandOverFields>>()

        override suspend fun load(id: Int): Result<OrderDetail> {
            loads++
            return Result.success(
                OrderDetail(
                    summary = OrderSummary(
                        id = id, orderNumber = "ORD-1-9", orderType = "RENT", status = "RESERVED",
                        totalAmount = 100.0, depositAmount = 0.0, customerName = null, customerPhone = null,
                        pickupPlanAt = null, returnPlanAt = null, createdAt = null, notes = null,
                    ),
                    items = emptyList(),
                    customerId = null,
                    payments = emptyList(),
                ),
            )
        }

        override suspend fun changeStatus(id: Int, status: String) = Result.success(Unit)

        override suspend fun handOver(id: Int, fields: HandOverFields): Result<Unit> {
            handOvers += id to fields
            return Result.success(Unit)
        }

        override suspend fun setReadyToDeliver(id: Int, ready: Boolean) = Result.success(Unit)

        override suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double) = Result.success(Unit)

        override suspend fun saveNotes(
            id: Int,
            notes: String,
            original: List<String>,
            kept: List<String>,
            newImages: List<ByteArray>,
        ) = Result.success(Unit)
    }
}
