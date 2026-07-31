package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.payment.BankAccount
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentKind
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentQr
import com.anyrent.pos.domain.payment.PaymentReceipt
import com.anyrent.pos.domain.payment.PaymentRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class DefaultPaymentRepository(
    private val api: ApiClient = ApiClient.get(),
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PaymentRepository {
    override suspend fun processPayment(
        orderId: Int,
        action: PaymentAction,
        method: PaymentMethod,
        reference: String,
    ): PaymentReceipt = withContext(ioDispatcher) {
        if (action.amount <= 0.0) throw AppError.Validation("Payment amount must be positive")
        runCatching {
            val body = JSONObject()
                .put("orderId", orderId)
                .put("amount", action.amount)
                .put("method", method.name)
                .put("kind", action.kind.name)
                .put("reference", reference)
                .put("notes", action.purpose.name)
                .toString()
                .toRequestBody("application/json; charset=utf-8".toMediaType())
            val json = api.authedPost("/api/payments/process", body)
            val payment = (json.optJSONObject("data") ?: json)
                .optJSONObject("payment")
                ?: throw AppError.InvalidResponse("Payment response is missing payment data")
            PaymentReceipt(
                id = payment.optInt("id"),
                amount = payment.optDouble("amount"),
                method = enumValueOf(payment.optString("method")),
                kind = if (payment.optString("status") == "REFUNDED") {
                    PaymentKind.REFUND
                } else {
                    PaymentKind.COLLECT
                },
                status = payment.optString("status"),
                reference = payment.optString("reference").ifBlank { reference },
            )
        }.getOrElse { throw AppError.from(it) }
    }

    override suspend fun getPaymentQr(orderId: Int): PaymentQr = withContext(ioDispatcher) {
        runCatching {
            val json = api.authedGet("/api/orders/$orderId/qr-code")
            val data = json.optJSONObject("data")
                ?: throw AppError.InvalidResponse("QR response is missing data")
            val bank = data.optJSONObject("bankAccount")
                ?: throw AppError.InvalidResponse("QR response is missing bank account")
            val payload = data.optString("qrCodeString")
            if (payload.isBlank()) throw AppError.InvalidResponse("QR payload is empty")
            PaymentQr(
                qrCodeString = payload,
                amount = data.optDouble("amount"),
                orderNumber = data.optString("orderNumber"),
                transferDescription = data.optString("transferDescription")
                    .takeIf { it.isNotBlank() },
                bankAccount = BankAccount(
                    accountHolderName = bank.optString("accountHolderName"),
                    accountNumber = bank.optString("accountNumber"),
                    bankName = bank.optString("bankName"),
                    bankCode = bank.optString("bankCode").takeIf { it.isNotBlank() },
                    branch = bank.optString("branch").takeIf { it.isNotBlank() },
                ),
            ).also {
                if (
                    it.bankAccount.accountHolderName.isBlank() ||
                    it.bankAccount.accountNumber.isBlank() ||
                    it.bankAccount.bankName.isBlank()
                ) {
                    throw AppError.InvalidResponse("Bank account information is incomplete")
                }
            }
        }.getOrElse { throw AppError.from(it) }
    }
}
