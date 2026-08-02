package com.anyrent.pos.domain.availability

import java.time.LocalDate

data class AvailabilityProduct(
    val id: Int,
    val name: String,
    val barcode: String?,
    val stock: Int,
)

data class AvailabilityConflict(
    val orderId: Int?,
    val orderNumber: String?,
    val quantity: Int,
    val pickupAt: String?,
    val returnAt: String?,
    val status: String?,
    val message: String,
)

data class AvailabilityOrder(
    val id: Int,
    val orderNumber: String,
    val status: String,
    val customerName: String?,
    val quantity: Int,
    val createdAt: String?,
    val pickupAt: String?,
    val returnAt: String?,
    val isConflict: Boolean,
)

data class ProductAvailability(
    val productId: Int,
    val productName: String,
    val totalStock: Int,
    val totalRenting: Int,
    val effectivelyAvailable: Int,
    val requestedQuantity: Int,
    val isAvailable: Boolean,
    val conflicts: List<AvailabilityConflict>,
    val orders: List<AvailabilityOrder>,
    val message: String?,
)

data class AvailabilityRequest(
    val productId: Int,
    val quantity: Int,
)

interface AvailabilityRepository {
    suspend fun searchProducts(query: String): List<AvailabilityProduct>

    suspend fun getProduct(productId: Int): AvailabilityProduct

    suspend fun checkAvailability(
        productId: Int,
        startDate: LocalDate,
        endDate: LocalDate,
        quantity: Int = 1,
    ): ProductAvailability

    suspend fun checkBatchAvailability(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): Map<Int, ProductAvailability>
}
