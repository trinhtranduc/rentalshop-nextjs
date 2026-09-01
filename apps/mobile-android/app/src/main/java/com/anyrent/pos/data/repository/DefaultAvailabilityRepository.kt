package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.availability.AvailabilityConflict
import com.anyrent.pos.domain.availability.AvailabilityOrder
import com.anyrent.pos.domain.availability.AvailabilityProduct
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.availability.AvailabilityRepository
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

class DefaultAvailabilityRepository(
    private val api: ApiClient = ApiClient.get(),
    private val outletIdProvider: () -> Int? = { SessionStore.outletId },
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AvailabilityRepository {
    override suspend fun searchProducts(query: String): List<AvailabilityProduct> =
        withContext(ioDispatcher) {
            runCatching {
                api.searchProducts(page = 1, limit = 30, q = query.trim().ifBlank { null })
                    .getOrThrow()
                    .items
                    .map {
                        AvailabilityProduct(
                            id = it.id,
                            name = it.name,
                            barcode = it.barcode,
                            stock = it.stock,
                        )
                    }
            }.getOrElse { throw AppError.from(it) }
        }

    override suspend fun getProduct(productId: Int): AvailabilityProduct =
        withContext(ioDispatcher) {
            runCatching {
                api.getProduct(productId).getOrThrow().let {
                    AvailabilityProduct(
                        id = it.id,
                        name = it.name,
                        barcode = it.barcode,
                        stock = it.stock,
                    )
                }
            }.getOrElse { throw AppError.from(it) }
        }

    override suspend fun checkAvailability(
        productId: Int,
        startDate: LocalDate,
        endDate: LocalDate,
        quantity: Int,
    ): ProductAvailability = withContext(ioDispatcher) {
        if (endDate.isBefore(startDate)) {
            throw AppError.Validation("Return date must be on or after pickup date")
        }
        if (quantity < 1) {
            throw AppError.Validation("Quantity must be at least 1")
        }
        val outletId = outletIdProvider()
            ?: throw AppError.Validation("An outlet is required to check availability")
        runCatching {
            val path = buildString {
                append("/api/products/$productId/availability")
                append("?startDate=${startDate}T00:00:00Z")
                append("&endDate=${endDate}T23:59:59Z")
                append("&quantity=$quantity")
                append("&outletId=$outletId")
                append("&includeAllOrders=true")
            }
            val json = api.authedGet(path)
            parseAvailability(json.optJSONObject("data") ?: json)
        }.getOrElse { throw AppError.from(it) }
    }

    override suspend fun checkBatchAvailability(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): Map<Int, ProductAvailability> = withContext(ioDispatcher) {
        validateBatch(requests, startDate, endDate)
        if (requests.isEmpty()) return@withContext emptyMap()

        val outletId = outletIdProvider()
            ?: throw AppError.Validation("An outlet is required to check availability")
        val normalized = requests
            .groupBy { it.productId }
            .mapValues { (_, values) -> values.sumOf { it.quantity } }
            .map { (productId, quantity) -> AvailabilityRequest(productId, quantity) }
        val payload = JSONObject()
            .put("productIds", JSONArray(normalized.map { it.productId }))
            .put(
                "products",
                JSONArray(normalized.map {
                    JSONObject().put("productId", it.productId).put("quantity", it.quantity)
                }),
            )
            .put("startDate", "${startDate}T00:00:00Z")
            .put("endDate", "${endDate}T23:59:59Z")
            .put("outletId", outletId)
            .toString()
            .toRequestBody("application/json; charset=utf-8".toMediaType())

        try {
            val json = api.authedPost("/api/products/batch-availability", payload)
            val data = json.optJSONObject("data") ?: json
            normalized.associate { request ->
                val parsed = try {
                    parseBatchItem(data, request)
                } catch (_: AppError.InvalidResponse) {
                    checkAvailability(
                        productId = request.productId,
                        startDate = startDate,
                        endDate = endDate,
                        quantity = request.quantity,
                    )
                }
                request.productId to parsed
            }
        } catch (error: AppError.Http) {
            if (error.statusCode != 404 && error.statusCode != 405) throw error
            // Older servers may not expose the batch route. Every single check must
            // still succeed; any failure aborts checkout instead of becoming "available".
            normalized.associate { request ->
                request.productId to checkAvailability(
                    productId = request.productId,
                    startDate = startDate,
                    endDate = endDate,
                    quantity = request.quantity,
                )
            }
        } catch (error: Throwable) {
            throw AppError.from(error)
        }
    }

    private fun validateBatch(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
    ) {
        if (endDate.isBefore(startDate)) {
            throw AppError.Validation("Return date must be on or after pickup date")
        }
        requests.firstOrNull { it.productId <= 0 }?.let {
            throw AppError.Validation("Product id must be valid")
        }
        requests.firstOrNull { it.quantity < 1 }?.let {
            throw AppError.Validation("Quantity must be at least 1")
        }
    }

    private fun parseBatchItem(
        data: JSONObject,
        request: AvailabilityRequest,
    ): ProductAvailability {
        val key = request.productId.toString()
        val directConflicts = data.optJSONArray(key)
        val item = data.optJSONObject(key)
            ?: data.optJSONObject("availability")?.optJSONObject(key)
            ?: data.optJSONObject("availabilityByProduct")?.optJSONObject(key)
            ?: data.optJSONArray("products")?.let { products ->
                (0 until products.length())
                    .mapNotNull(products::optJSONObject)
                    .firstOrNull { it.optInt("productId") == request.productId }
            }
            ?: directConflicts?.let {
                JSONObject()
                    .put("productId", request.productId)
                    .put("requestedQuantity", request.quantity)
                    .put("isAvailable", it.length() == 0)
                    .put("conflicts", it)
            }
            ?: throw AppError.InvalidResponse(
                "Availability response is missing product ${request.productId}",
            )
        val normalized = JSONObject(item.toString())
            .put("productId", item.optInt("productId", request.productId))
            .put("requestedQuantity", item.optInt("requestedQuantity", request.quantity))
            .apply {
                if (!has("isAvailable") && item.has("available")) {
                    put("isAvailable", item.optBoolean("available"))
                }
            }
        return parseAvailability(normalized)
    }

    internal fun parseAvailability(data: JSONObject): ProductAvailability {
        val outlet = data.optJSONArray("availabilityByOutlet")
            ?.optJSONObject(0)
            ?: JSONObject()
        val conflicts = outlet.optJSONArray("conflicts")
            ?: data.optJSONArray("conflicts")
            ?: JSONArray()
        val orders = data.optJSONArray("orders") ?: JSONArray()

        return ProductAvailability(
            productId = data.optInt("productId"),
            productName = data.optString("productName"),
            totalStock = data.optInt("totalStock", outlet.optInt("stock")),
            totalRenting = data.optInt("totalRenting", outlet.optInt("renting")),
            effectivelyAvailable = data.optInt(
                "totalAvailableStock",
                outlet.optInt("effectivelyAvailable", outlet.optInt("available")),
            ),
            requestedQuantity = data.optInt("requestedQuantity", 1),
            isAvailable = data.optBoolean("isAvailable"),
            conflicts = (0 until conflicts.length()).map { index ->
                val item = conflicts.getJSONObject(index)
                AvailabilityConflict(
                    orderId = item.optInt("orderId").takeIf { it > 0 }
                        ?: item.optInt("id").takeIf { it > 0 },
                    orderNumber = item.optString("orderNumber").takeIf { it.isNotBlank() },
                    quantity = item.optInt("quantity", 1),
                    pickupAt = item.optString("pickupPlanAt")
                        .ifBlank { item.optString("startDate") }
                        .takeIf { it.isNotBlank() },
                    returnAt = item.optString("returnPlanAt")
                        .ifBlank { item.optString("endDate") }
                        .takeIf { it.isNotBlank() },
                    status = item.optString("status").takeIf { it.isNotBlank() },
                    message = item.optString("message").ifBlank {
                        item.optString("orderNumber").ifBlank { "Availability conflict" }
                    },
                )
            },
            orders = (0 until orders.length()).mapNotNull { index ->
                val item = orders.optJSONObject(index) ?: return@mapNotNull null
                val id = item.optInt("id").takeIf { it > 0 } ?: return@mapNotNull null
                val orderItems = item.optJSONArray("orderItems") ?: JSONArray()
                val summedQuantity = (0 until orderItems.length()).sumOf {
                    orderItems.optJSONObject(it)?.optInt("quantity", 0) ?: 0
                }
                val quantityInOrder = summedQuantity.takeIf { it > 0 }
                    ?: item.optInt("quantity", 1).coerceAtLeast(1)
                AvailabilityOrder(
                    id = id,
                    orderNumber = item.optString("orderNumber").ifBlank { "#$id" },
                    orderType = item.optString("orderType").takeIf { it.isNotBlank() },
                    status = item.optString("status"),
                    customerName = item.optString("customerName").takeIf { it.isNotBlank() },
                    quantity = quantityInOrder,
                    createdAt = item.optString("createdAt").takeIf {
                        it.isNotBlank() && !it.equals("null", ignoreCase = true)
                    },
                    pickupAt = item.optString("pickupPlanAt").takeIf { it.isNotBlank() },
                    returnAt = item.optString("returnPlanAt").takeIf { it.isNotBlank() },
                    isConflict = item.optBoolean("isConflict"),
                )
            },
            message = data.optString("message").takeIf { it.isNotBlank() },
        )
    }

    override suspend fun occupancyCalendar(
        productId: Int,
        from: LocalDate,
        to: LocalDate,
    ): Map<LocalDate, Int> = withContext(ioDispatcher) {
        val outletId = outletIdProvider()
            ?: throw AppError.Validation("An outlet is required to check availability")
        runCatching {
            val path = "/api/products/$productId/availability-calendar?from=$from&to=$to&outletId=$outletId"
            val json = api.authedGet(path)
            val data = json.optJSONObject("data") ?: json
            val days = data.optJSONArray("days") ?: JSONArray()
            (0 until days.length()).mapNotNull { index ->
                val day = days.optJSONObject(index) ?: return@mapNotNull null
                val date = day.optString("date").takeIf { it.isNotBlank() }
                    ?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
                    ?: return@mapNotNull null
                date to day.optInt("available", 0)
            }.toMap()
        }.getOrElse { throw AppError.from(it) }
    }
}
