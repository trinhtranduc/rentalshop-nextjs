package com.anyrent.pos.domain.payment

import com.anyrent.pos.data.model.OrderDetail

enum class PaymentMethod {
    CASH,
    TRANSFER,
    CHECK,
}

enum class PaymentKind {
    COLLECT,
    REFUND,
}

enum class PaymentPurpose {
    DEPOSIT,
    PICKUP,
    RETURN_ADJUSTMENT,
    SALE,
}

data class PaymentAction(
    val kind: PaymentKind,
    val purpose: PaymentPurpose,
    val amount: Double,
    val collateralDetails: String?,
)

data class PaymentReceipt(
    val id: Int,
    val amount: Double,
    val method: PaymentMethod,
    val kind: PaymentKind,
    val status: String,
    val reference: String,
)

data class PaymentQr(
    val qrCodeString: String,
    val amount: Double,
    val orderNumber: String,
    val transferDescription: String?,
    val bankAccount: BankAccount,
)

data class BankAccount(
    val accountHolderName: String,
    val accountNumber: String,
    val bankName: String,
    val bankCode: String?,
    val branch: String?,
)

interface PaymentRepository {
    suspend fun processPayment(
        orderId: Int,
        action: PaymentAction,
        method: PaymentMethod,
        reference: String,
    ): PaymentReceipt

    suspend fun getPaymentQr(orderId: Int): PaymentQr
}

object PaymentPolicy {
    /**
     * Payment sheet action for the current order status (iOS `OrderViewModel.getPaymentType()`).
     * Always returns an action for RESERVED / PICKUPED / SALE so staff see collect/refund + collateral
     * before confirming pickup/return — even when money amount is 0.
     */
    fun actionFor(order: OrderDetail): PaymentAction? {
        if (order.summary.status == "CANCELLED") return null
        if (order.summary.orderType == "SALE") {
            val paid = completedAmount(order, PaymentPurpose.SALE)
            val remaining = (order.summary.totalAmount - paid).coerceAtLeast(0.0)
            return PaymentAction(PaymentKind.COLLECT, PaymentPurpose.SALE, remaining, null)
                .takeIf { remaining > 0.0 }
        }

        return when (order.summary.status) {
            "RESERVED" -> {
                // iOS: (totalAmount - depositAmount) + securityDeposit
                val pickupPaid = completedAmount(order, PaymentPurpose.PICKUP)
                val amount = (
                    order.summary.totalAmount -
                        order.summary.depositAmount +
                        order.securityDeposit -
                        pickupPaid
                    ).coerceAtLeast(0.0)
                PaymentAction(
                    PaymentKind.COLLECT,
                    PaymentPurpose.PICKUP,
                    amount,
                    order.collateralDetails?.takeIf { it.isNotBlank() },
                )
            }
            "PICKUPED" -> {
                // iOS: damageFee - securityDeposit (negative = refund). Also include lateFee.
                val adjustment = order.damageFee + order.lateFee - order.securityDeposit
                val collateral = order.collateralDetails?.takeIf { it.isNotBlank() }
                when {
                    adjustment > 0.0 -> PaymentAction(
                        PaymentKind.COLLECT,
                        PaymentPurpose.RETURN_ADJUSTMENT,
                        adjustment,
                        collateral,
                    )
                    adjustment < 0.0 -> PaymentAction(
                        PaymentKind.REFUND,
                        PaymentPurpose.RETURN_ADJUSTMENT,
                        -adjustment,
                        collateral,
                    )
                    else -> PaymentAction(
                        PaymentKind.COLLECT,
                        PaymentPurpose.RETURN_ADJUSTMENT,
                        0.0,
                        collateral,
                    )
                }
            }
            else -> null
        }
    }

    private fun completedAmount(
        order: OrderDetail,
        purpose: PaymentPurpose,
    ): Double = order.payments
        .filter { it.status == "COMPLETED" && it.notes == purpose.name }
        .sumOf { it.amount }
}
