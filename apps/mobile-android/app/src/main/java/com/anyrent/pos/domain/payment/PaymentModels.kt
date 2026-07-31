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
    fun actionFor(order: OrderDetail): PaymentAction? {
        if (order.summary.status == "CANCELLED") return null
        if (order.summary.orderType == "SALE") {
            val paid = completedAmount(order, PaymentPurpose.SALE)
            val remaining = (order.summary.totalAmount - paid).coerceAtLeast(0.0)
            return remaining.takeIf { it > 0.0 }?.let {
                PaymentAction(PaymentKind.COLLECT, PaymentPurpose.SALE, it, null)
            }
        }

        return when (order.summary.status) {
            "RESERVED" -> {
                val pickupPaid = completedAmount(order, PaymentPurpose.PICKUP)
                val amount = (
                    order.summary.totalAmount -
                        order.summary.depositAmount +
                        order.securityDeposit -
                        pickupPaid
                    ).coerceAtLeast(0.0)
                amount.takeIf { it > 0.0 }?.let {
                    PaymentAction(
                        PaymentKind.COLLECT,
                        PaymentPurpose.PICKUP,
                        it,
                        order.collateralDetails,
                    )
                }
            }
            "PICKUPED" -> {
                val adjustment = order.damageFee + order.lateFee - order.securityDeposit
                when {
                    adjustment > 0.0 -> PaymentAction(
                        PaymentKind.COLLECT,
                        PaymentPurpose.RETURN_ADJUSTMENT,
                        adjustment,
                        order.collateralDetails,
                    )
                    adjustment < 0.0 -> PaymentAction(
                        PaymentKind.REFUND,
                        PaymentPurpose.RETURN_ADJUSTMENT,
                        -adjustment,
                        order.collateralDetails,
                    )
                    else -> null
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
