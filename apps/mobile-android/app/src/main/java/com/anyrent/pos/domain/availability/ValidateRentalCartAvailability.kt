package com.anyrent.pos.domain.availability

import com.anyrent.pos.domain.error.AppError
import java.time.LocalDate

data class RentalCartLine(
    val productId: Int,
    val productName: String,
    val quantity: Int,
)

data class BlockedRentalProduct(
    val productId: Int,
    val productName: String,
    val availability: ProductAvailability,
)

class ValidateRentalCartAvailability(
    private val repository: AvailabilityRepository,
) {
    suspend operator fun invoke(
        lines: List<RentalCartLine>,
        pickupDate: LocalDate,
        returnDate: LocalDate,
    ): List<BlockedRentalProduct> {
        if (lines.isEmpty()) throw AppError.Validation("Cart is empty")
        val grouped = lines
            .groupBy { it.productId }
            .map { (productId, productLines) ->
                RentalCartLine(
                    productId = productId,
                    productName = productLines.first().productName,
                    quantity = productLines.sumOf { it.quantity },
                )
            }
        val result = repository.checkBatchAvailability(
            requests = grouped.map { AvailabilityRequest(it.productId, it.quantity) },
            startDate = pickupDate,
            endDate = returnDate,
        )
        val missing = grouped.filterNot { result.containsKey(it.productId) }
        if (missing.isNotEmpty()) {
            throw AppError.InvalidResponse(
                "Availability was not confirmed for ${missing.joinToString { it.productName }}",
            )
        }
        return grouped.mapNotNull { line ->
            val availability = result.getValue(line.productId)
            if (availability.isAvailable) null
            else BlockedRentalProduct(line.productId, line.productName, availability)
        }
    }
}
