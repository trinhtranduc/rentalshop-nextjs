package com.anyrent.pos.data

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.availability.BlockedRentalProduct
import com.anyrent.pos.domain.availability.RentalCartLine
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import com.anyrent.pos.domain.error.AppError

/**
 * The create-order request of the cart (#341, #476). The review screen (`CartCheckoutScreen`) and the new cart's
 * confirm sheet both call this, so they send the same `POST /api/orders` body and Idempotency-Key header.
 * #676: the same holds for an edit: [editAvailabilityError] and [update] are the review screen's checks and
 * `PUT /api/orders/{id}` body, used by that screen and by the new cart's "Lưu thay đổi" sheet.
 */
object CartOrderSubmit {
    /** Rental lines the API cannot reserve for the cart's dates (thrown errors: the check itself failed) */
    suspend fun blockedRentalLines(validate: ValidateRentalCartAvailability): List<BlockedRentalProduct> =
        validate(
            lines = CartStore.lines.value.map {
                RentalCartLine(productId = it.product.id, productName = it.product.name, quantity = it.quantity)
            },
            pickupDate = CartStore.pickupDate.value,
            returnDate = CartStore.returnDate.value,
        )

    /** Blocking network call; run it off the main thread. #480: [noteImages] = the cart note photos as JPEG bytes. */
    fun create(idempotencyKey: String, noteImages: List<ByteArray> = emptyList()): Result<OrderSummary> {
        val lines = CartStore.lines.value
        val orderType = CartStore.orderType.value
        val notes = CartStore.notes.value
        val collateral = CartStore.collateralDetails.value
        val discount = CartStore.discount.value
        return ApiClient.get().createOrder(
            orderType = orderType,
            customerId = CartStore.customer.value?.id,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount,
            depositAmount = CartStore.depositAmount.value,
            notes = listOfNotNull(
                notes.takeIf { it.isNotBlank() },
                collateral.takeIf { it.isNotBlank() }?.let { "Collateral: $it" },
            ).joinToString("\n").ifBlank { null },
            rentalDays = CartStore.rentalDaysInclusive(),
            pickupPlanAt = if (orderType == "RENT") CartStore.isoPickup() else null,
            returnPlanAt = if (orderType == "RENT") CartStore.isoReturn() else null,
            securityDeposit = CartStore.securityDeposit.value.takeIf { it > 0 },
            discountType = if (CartStore.discountType.value == CartStore.DiscountType.AMOUNT) "amount" else "percentage",
            discountValue = discount.takeIf { it > 0 },
            discountAmount = CartStore.discountAmount.takeIf { it > 0 },
            depositsByProduct = lines.associate { it.product.id to it.product.deposit },
            pricingTypesByProduct = lines.associate { it.product.id to it.pricingType },
            rentalDaysByProduct = lines.associate { it.product.id to it.rentalDays },
            idempotencyKey = idempotencyKey,
            noteImages = noteImages,
        )
    }

    /**
     * The review screen's rental check before it saves (#676): null when the save may go on, else the message it shows
     * (session expired, the check failed, or "Availability conflicts: …"). A sale is not checked.
     */
    suspend fun editAvailabilityError(
        validate: ValidateRentalCartAvailability,
        sessionExpiredMessage: String,
        availabilityFailedMessage: String,
    ): String? {
        if (CartStore.orderType.value != "RENT") return null
        val result = runCatching { blockedRentalLines(validate) }
        val failure = result.exceptionOrNull()
        if (failure != null) {
            return when (failure) {
                is AppError.Unauthorized -> sessionExpiredMessage
                else -> "$availabilityFailedMessage\n${failure.message.orEmpty()}"
            }
        }
        val blocked = result.getOrThrow()
        return if (blocked.isNotEmpty()) "Availability conflicts: " + blocked.joinToString { it.productName } else null
    }

    /** Blocking network call; run it off the main thread. The review screen's edit request (#676). */
    fun update(orderId: Int): Result<OrderSummary> {
        val lines = CartStore.lines.value
        val orderType = CartStore.orderType.value
        val notes = CartStore.notes.value
        val collateral = CartStore.collateralDetails.value
        val discountType = CartStore.discountType.value
        return ApiClient.get().updateOrder(
            orderId = orderId,
            orderType = orderType,
            customerId = CartStore.customer.value?.id,
            lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
            totalAmount = CartStore.totalAmount,
            depositAmount = CartStore.depositAmount.value,
            notes = listOfNotNull(
                notes.takeIf { it.isNotBlank() },
                collateral.takeIf { it.isNotBlank() }?.let { "Collateral: $it" },
            ).joinToString("\n").ifBlank { null },
            rentalDays = CartStore.rentalDaysInclusive(),
            pickupPlanAt = if (orderType == "RENT") CartStore.isoPickup() else null,
            returnPlanAt = if (orderType == "RENT") CartStore.isoReturn() else null,
            securityDeposit = CartStore.securityDeposit.value,
            discountType = if (discountType == CartStore.DiscountType.AMOUNT) "amount" else "percentage",
            discountValue = CartStore.discount.value,
            discountAmount = CartStore.discountAmount,
            collateralDetails = collateral.takeIf { it.isNotBlank() },
            depositsByProduct = lines.associate { it.product.id to it.product.deposit },
            pricingTypesByProduct = lines.associate { it.product.id to it.pricingType },
            rentalDaysByProduct = lines.associate { it.product.id to it.rentalDays },
        )
    }

    /** The review screen's message for a failed save: the API message, else [fallback] */
    fun errorMessage(error: Throwable, fallback: String): String =
        error.message?.takeUnless { it.isBlank() || it.equals("Validation error", ignoreCase = true) } ?: fallback
}
