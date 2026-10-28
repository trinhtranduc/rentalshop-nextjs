package com.anyrent.pos.data

import com.anyrent.pos.domain.deposit.ClientCapabilities
import com.anyrent.pos.domain.deposit.DepositPlanLogic
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
import org.junit.Test

/** #1199 — the header, the old and new order payloads and the requests of staged deposits, through the real ApiClient */
class DepositPlanApiTest {
    private val requests = mutableListOf<Request>()
    private val bodies = mutableListOf<String>()

    private fun api(answer: String): ApiClient {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request()
                requests += request
                bodies += request.body?.let { b -> Buffer().also { b.writeTo(it) }.readUtf8() }.orEmpty()
                Response.Builder().request(request).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                    .body(answer.toResponseBody("application/json".toMediaType())).build()
            }
            .build()
        return ApiClient(baseUrl = "https://example.test", tokenProvider = { "token" }, onUnauthorized = {}, client = client, appVersion = "1.0.0")
    }

    private val order = """
        {"id":7,"orderNumber":"123456","orderType":"RENT","status":"RESERVED","totalAmount":12000000,"depositAmount":3600000,
         "orderItems":[{"productId":1,"quantity":1,"unitPrice":12000000,"totalPrice":12000000,"product":{"id":1,"name":"Áo dài"}}]%s}
    """.trimIndent()

    @Test
    fun `every request carries the installments capability in one header`() {
        api("""{"success":true,"data":{}}""").authedGet("/api/orders")
        assertEquals("installments,block-pricing", requests.single().header(ClientCapabilities.HEADER_NAME))
        assertEquals("X-Client-Capabilities", ClientCapabilities.HEADER_NAME)
    }

    @Test
    fun `an old order payload decodes without a plan`() {
        val detail = api("""{"success":true,"data":${order.format("")}}""").getOrder(7).getOrThrow()
        assertNull(detail.deposit?.installments)
        assertNull(detail.summary.hasDepositPlan)
        assertNull(detail.summary.installmentPercentCollected)
        assertFalse(DepositPlanLogic.hasPlan(detail.deposit))
        assertEquals(3_600_000.0, detail.summary.depositAmount, 0.0)
    }

    @Test
    fun `a plan order payload decodes the stages the summary and the payment key`() {
        val extra = ""","hasDepositPlan":true,"depositPlanPolicy":"p","cancelKeptAmount":null,
          "installmentSummary":{"planned":12000000,"collected":3600000,"remaining":8400000,"percentCollected":30},
          "installments":[{"key":"i1","label":"A","percent":30,"amount":3600000,"status":"PAID","paidAmount":3600000},{"key":"rest","label":"R","percent":70,"amount":8400000,"status":"UPCOMING"}],
          "payments":[{"id":1,"amount":3600000,"paymentMethod":"CASH","status":"COMPLETED","notes":"INSTALLMENT","installmentKey":"i1"}]"""
        val detail = api("""{"success":true,"data":${order.format(extra)}}""").getOrder(7).getOrThrow()
        assertTrue(DepositPlanLogic.hasPlan(detail.deposit))
        assertEquals(30.0, detail.summary.installmentPercentCollected!!, 0.0)
        assertEquals(true, detail.summary.hasDepositPlan)
        assertNull(detail.summary.cancelKeptAmount)
        assertEquals("i1", detail.payments.single().installmentKey)
        assertEquals("p", detail.deposit?.policy)
    }

    @Test
    fun `create order sends the paymentPlan and a zero deposit`() {
        val plan = JSONObject("""{"collectFirstNow":{"method":"CASH","reference":"abcdefgh"}}""")
        api("""{"success":true,"data":{"id":9,"orderNumber":"654321"}}""").createOrder(
            orderType = "RENT", customerId = 1, lines = listOf(Triple(1, 1, 12_000_000.0)), totalAmount = 12_000_000.0,
            depositAmount = 2_000_000.0, paymentPlan = plan,
        ).getOrThrow()
        val sent = JSONObject(bodies.single())
        assertEquals(0.0, sent.getDouble("depositAmount"), 0.0)
        assertEquals("CASH", sent.getJSONObject("paymentPlan").getJSONObject("collectFirstNow").getString("method"))
    }

    @Test
    fun `create order without a plan is the same request as before`() {
        api("""{"success":true,"data":{"id":9,"orderNumber":"654321"}}""").createOrder(
            orderType = "RENT", customerId = 1, lines = listOf(Triple(1, 1, 12_000_000.0)), totalAmount = 12_000_000.0, depositAmount = 2_000_000.0,
        ).getOrThrow()
        val sent = JSONObject(bodies.single())
        assertEquals(2_000_000.0, sent.getDouble("depositAmount"), 0.0)
        assertFalse(sent.has("paymentPlan"))
    }

    @Test
    fun `cancelling sends the kept amount and the note only when there are any`() {
        api("""{"success":true,"data":{"id":7,"status":"CANCELLED"}}""").updateOrderStatus(7, "CANCELLED", cancelKeptAmount = 1_800_000.0, cancelNote = " khách báo ").getOrThrow()
        val kept = JSONObject(bodies.last())
        assertEquals("CANCELLED", kept.getString("status"))
        assertEquals(1_800_000.0, kept.getDouble("cancelKeptAmount"), 0.0)
        assertEquals("khách báo", kept.getString("cancelNote"))
        api("""{"success":true,"data":{"id":7,"status":"CANCELLED"}}""").updateOrderStatus(7, "CANCELLED").getOrThrow()
        assertEquals("""{"status":"CANCELLED"}""", bodies.last())
    }

    @Test
    fun `an order list row carries the collected share for the badge`() {
        val page = api("{}").parseOrdersPage(
            JSONObject("""{"success":true,"data":{"orders":[{"id":1,"orderNumber":"1","orderType":"RENT","status":"RESERVED","hasDepositPlan":true,"installmentSummary":{"percentCollected":30}},{"id":2,"orderNumber":"2","orderType":"RENT","status":"RESERVED"}],"total":2}}"""),
        )
        assertEquals(30.0, page.items[0].installmentPercentCollected!!, 0.0)
        assertEquals(true, page.items[0].hasDepositPlan)
        assertNull(page.items[1].installmentPercentCollected)
        assertNull(page.items[1].hasDepositPlan)
    }

    @Test
    fun `stage paths`() {
        assertEquals("/api/orders/7/installments/i2/collect", DepositPlanApi.collectPath(7, "i2"))
        assertEquals("/api/orders/7/installments/i2/void", DepositPlanApi.voidPath(7, "i2"))
        assertEquals("/api/orders/7/deposit-plan", DepositPlanApi.planPath(7))
    }

    @Test
    fun `the cart sends stages only for a staged rental and staff send none`() {
        CartStore.clear(persistToDisk = false)
        SessionStore.depositMode = com.anyrent.pos.domain.deposit.DepositMode.STAGED
        val template = com.anyrent.pos.domain.deposit.DepositTemplate(
            "t1", "3", true,
            listOf(
                com.anyrent.pos.domain.deposit.DepositStageTemplate("A", 30.0, com.anyrent.pos.domain.deposit.DepositDueRule.onCreate),
                com.anyrent.pos.domain.deposit.DepositStageTemplate("B", 40.0, com.anyrent.pos.domain.deposit.DepositDueRule.beforePickup(3)),
            ),
        )
        assertNull(CartStore.paymentPlanRequest("ref-12345678", canEditStages = true)) // no stages yet
        CartStore.setDepositTemplate(template)
        CartStore.setDepositStageAmount(1, 5_000_000.0)
        assertTrue(CartStore.isStagedRental)
        val owner = CartStore.paymentPlanRequest("ref-12345678", canEditStages = true)!!
        assertEquals("t1", owner.getString("templateId"))
        assertEquals(5_000_000.0, owner.getJSONArray("items").getJSONObject(1).getDouble("amountOverride"), 0.0)
        // staff send {} (the API takes the shop's default template); an empty cart collects nothing now
        assertEquals("{}", CartStore.paymentPlanRequest("ref-12345678", canEditStages = false).toString())
        SessionStore.depositMode = null
        assertFalse(CartStore.isStagedRental) // ONE_TIME (or unknown): the cart is unchanged
        CartStore.clear(persistToDisk = false)
    }
}
