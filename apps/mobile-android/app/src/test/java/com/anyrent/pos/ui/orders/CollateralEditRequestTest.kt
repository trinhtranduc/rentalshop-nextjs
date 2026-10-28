package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.domain.orders.OrderDetailLogic
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

/** #1279 — editing papers and collateral of a picked-up order sends them with no status */
@OptIn(ExperimentalCoroutinesApi::class)
class CollateralEditRequestTest {
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
                    .request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                    .body("""{"success":true,"data":{"id":9,"status":"PICKUPED"}}""".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
        return ApiClient("https://example.test", { "token" }, {}, client, "0.2.0")
    }

    @Test
    fun `edit sends papers and deposit as PUT without a status`() {
        val fields = OrderDetailLogic.collateralEditFields("CCCD", 500_000.0, null, 0.0)
        assertTrue(api().updateOrderCollateral(9, fields).isSuccess)
        val request = requests.single()
        assertEquals("PUT", request.method)
        assertTrue(request.url.encodedPath.endsWith("/api/orders/9"))
        val buffer = Buffer()
        request.body!!.writeTo(buffer)
        val body = JSONObject(buffer.readUtf8())
        assertEquals("CCCD", body.getString("collateralDetails"))
        assertEquals("ID_CARD", body.getString("collateralType"))
        assertEquals(500_000.0, body.getDouble("securityDeposit"), 0.0)
        assertTrue(!body.has("status"))
    }
}
