package com.anyrent.pos.data

import com.anyrent.pos.domain.customers.CustomerOrders
import com.anyrent.pos.domain.customers.CustomerRow
import com.anyrent.pos.domain.customers.CustomerRules
import com.anyrent.pos.domain.customers.CustomersPage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.net.URLEncoder

/**
 * Customer calls of the redesigned customer screens (#387). Existing endpoints only; the old screens keep theirs.
 */
object CustomersV2Api {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    /** `GET /api/customers` in its default order (newest first), or searched by name / phone with `q` */
    fun list(page: Int, limit: Int, q: String?): Result<CustomersPage> = runCatching {
        val query = buildList {
            add("page=$page")
            add("limit=$limit")
            if (!q.isNullOrBlank()) add("q=" + URLEncoder.encode(q, "UTF-8"))
        }.joinToString("&")
        val json = ApiClient.get().authedGet("/api/customers?$query")
        CustomerRules.parsePage(json.optJSONObject("data") ?: JSONObject())
    }

    fun create(payload: JSONObject): Result<CustomerRow> = runCatching {
        val json = ApiClient.get().authedPost("/api/customers", payload.toString().toRequestBody(jsonMedia))
        CustomerRules.parseRow(json.optJSONObject("data") ?: JSONObject())
    }

    /** `GET /api/customers/{id}` as the edit form */
    fun profile(customerId: Int): Result<com.anyrent.pos.domain.customers.CustomerEditForm> = runCatching {
        val json = ApiClient.get().authedGet("/api/customers/$customerId")
        com.anyrent.pos.domain.customers.CustomerEditRules.formFrom(json.optJSONObject("data") ?: JSONObject())
    }

    /** The existing update endpoint; a phone that belongs to another customer fails with HTTP 409 */
    fun update(customerId: Int, payload: JSONObject): Result<Unit> = runCatching {
        ApiClient.get().authedPut("/api/customers/$customerId", payload.toString().toRequestBody(jsonMedia))
        Unit
    }

    /** First page of `GET /api/customers/{id}/orders` with its `summary` */
    fun orders(customerId: Int, limit: Int): Result<CustomerOrders> = runCatching {
        val json = ApiClient.get().authedGet("/api/customers/$customerId/orders?page=1&limit=$limit")
        CustomerRules.parseOrders(json.optJSONObject("data") ?: JSONObject())
    }

    /**
     * #482 orders by customer: a page of `GET /api/customers/{id}/orders` (optionally in a period) as order rows, with
     * the `summary` (cancelled excluded from the money by the API) and the customer snapshot
     */
    fun ordersPage(
        customerId: Int,
        page: Int,
        limit: Int,
        startDate: String?,
        endDate: String?,
    ): Result<Pair<ApiClient.PageResult<com.anyrent.pos.data.model.OrderSummary>, CustomerOrders>> = runCatching {
        val query = buildList {
            add("page=$page")
            add("limit=$limit")
            add("sortBy=createdAt")
            add("sortOrder=desc")
            if (!startDate.isNullOrBlank()) add("startDate=" + URLEncoder.encode(startDate, "UTF-8"))
            if (!endDate.isNullOrBlank()) add("endDate=" + URLEncoder.encode(endDate, "UTF-8"))
        }.joinToString("&")
        val json = ApiClient.get().authedGet("/api/customers/$customerId/orders?$query")
        ApiClient.get().parseOrdersPage(json) to CustomerRules.parseOrders(json.optJSONObject("data") ?: JSONObject())
    }

    /** Orders of the customer that are out now (`status=PICKUPED`), read from the list `total` */
    fun rentingCount(customerId: Int): Result<Int> = runCatching {
        val json = ApiClient.get().authedGet("/api/orders?customerId=$customerId&status=PICKUPED&limit=1&page=1")
        json.optJSONObject("data")?.optInt("total") ?: 0
    }
}
