package com.anyrent.pos.data

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.StaffUser
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Extra API methods for iOS parity (register, store, users, QR, export, availability).
 * Kept separate so the core client stays readable.
 */
object ApiParity {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    fun registerMerchant(
        email: String,
        password: String,
        fullName: String,
        phone: String,
        storeName: String,
        address: String,
        businessTags: List<String> = listOf("OTHER"),
    ): Result<Unit> = runCatching {
        val parts = fullName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        val first = parts.firstOrNull() ?: fullName
        val last = parts.drop(1).joinToString(" ")
        val body = JSONObject()
            .put("firstName", first)
            .put("lastName", last)
            .put("email", email.trim())
            .put("password", password)
            .put("phone", phone)
            .put("role", "MERCHANT")
            .put("businessName", storeName)
            .put("outletName", storeName)
            .put("address", address)
            .put("businessTags", JSONArray(businessTags))
            .put("pricingType", "FIXED")
            .toString()
            .toRequestBody(jsonMedia)
        val json = ApiClient.get().publicPost("/api/auth/register", body)
        if (json.has("success") && !json.optBoolean("success")) {
            error(json.optString("message").ifBlank { "Registration failed" })
        }
    }

    fun resendVerification(email: String): Result<Unit> = runCatching {
        val body = JSONObject().put("email", email.trim()).toString().toRequestBody(jsonMedia)
        ApiClient.get().publicPost("/api/auth/resend-verification", body)
        Unit
    }

    fun deleteAccount(): Result<Unit> = runCatching {
        ApiClient.get().authedDelete("/api/users/me")
        // Fallback path some deployments use:
        runCatching { ApiClient.get().authedDelete("/api/auth/delete-account") }
        Unit
    }

    fun updateOutlet(
        outletId: Int,
        name: String,
        address: String?,
        phone: String?,
    ): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("name", name)
            .apply {
                if (!address.isNullOrBlank()) put("address", address)
                if (!phone.isNullOrBlank()) put("phone", phone)
            }
            .toString()
            .toRequestBody(jsonMedia)
        ApiClient.get().authedPut("/api/outlets/$outletId", body)
        Unit
    }

    fun createUser(
        firstName: String,
        lastName: String,
        email: String,
        password: String,
        role: String,
        outletId: Int?,
    ): Result<StaffUser> = runCatching {
        val body = JSONObject()
            .put("firstName", firstName)
            .put("lastName", lastName)
            .put("email", email)
            .put("password", password)
            .put("role", role)
            .apply {
                outletId?.let { put("outletId", it) }
                SessionStore.merchantId?.let { put("merchantId", it) }
            }
            .toString()
            .toRequestBody(jsonMedia)
        val json = ApiClient.get().authedPost("/api/users", body)
        val data = json.optJSONObject("data") ?: JSONObject()
        StaffUser(
            id = data.optInt("id"),
            email = data.optString("email"),
            firstName = data.optString("firstName").takeIf { it.isNotBlank() },
            lastName = data.optString("lastName").takeIf { it.isNotBlank() },
            role = data.optString("role"),
            isActive = data.optBoolean("isActive", true),
        )
    }

    fun updateUser(
        id: Int,
        firstName: String,
        lastName: String,
        role: String,
        isActive: Boolean,
        outletId: Int?,
    ): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("firstName", firstName)
            .put("lastName", lastName)
            .put("role", role)
            .put("isActive", isActive)
            .apply { outletId?.let { put("outletId", it) } }
            .toString()
            .toRequestBody(jsonMedia)
        ApiClient.get().authedPut("/api/users/$id", body)
        Unit
    }

    fun changeUserPassword(id: Int, newPassword: String): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("newPassword", newPassword)
            .put("confirmPassword", newPassword)
            .toString()
            .toRequestBody(jsonMedia)
        ApiClient.get().authedPost("/api/users/$id/change-password", body)
        Unit
    }

    fun deleteUser(id: Int): Result<Unit> = runCatching {
        ApiClient.get().authedDelete("/api/users/$id")
        Unit
    }

    fun deleteOrder(id: Int): Result<Unit> = runCatching {
        ApiClient.get().authedDelete("/api/orders/$id")
        Unit
    }

    fun setReadyToDeliver(id: Int, ready: Boolean): Result<Unit> = runCatching {
        val body = JSONObject().put("isReadyToDeliver", ready).toString().toRequestBody(jsonMedia)
        ApiClient.get().authedPut("/api/orders/$id", body)
        Unit
    }

    fun updateOrderFull(
        id: Int,
        notes: String?,
        depositAmount: Double?,
        pickupPlanAt: String?,
        returnPlanAt: String?,
        status: String? = null,
    ): Result<OrderSummary> = runCatching {
        val body = JSONObject().apply {
            if (notes != null) put("notes", notes)
            if (depositAmount != null) put("depositAmount", depositAmount)
            if (pickupPlanAt != null) put("pickupPlanAt", pickupPlanAt)
            if (returnPlanAt != null) put("returnPlanAt", returnPlanAt)
            if (status != null) put("status", status)
        }.toString().toRequestBody(jsonMedia)
        val json = ApiClient.get().authedPut("/api/orders/$id", body)
        val data = json.optJSONObject("data") ?: JSONObject().put("id", id)
        ApiClient.get().getOrder(id).getOrThrow().summary.copy(
            notes = data.optString("notes").takeIf { it.isNotBlank() } ?: notes,
            depositAmount = data.optDouble("depositAmount", depositAmount ?: 0.0),
            status = data.optString("status").ifBlank { status ?: "" },
        )
    }

    fun orderQrCodeUrl(orderId: Int): String =
        "${com.anyrent.pos.BuildConfig.API_BASE_URL.trimEnd('/')}/api/orders/$orderId/qr-code"

    fun fetchOrderQrPayload(orderId: Int): Result<String> = runCatching {
        val json = ApiClient.get().authedGet("/api/orders/$orderId/qr-code")
        val data = json.optJSONObject("data") ?: json
        data.optString("qrCode").ifBlank {
            data.optString("qr").ifBlank { data.optString("url") }
        }.ifBlank { error("No QR payload") }
    }

    fun productAvailability(productId: Int, startDate: String, endDate: String): Result<String> =
        runCatching {
            val path = "/api/products/$productId/availability?startDate=$startDate&endDate=$endDate"
            val json = ApiClient.get().authedGet(path)
            json.optJSONObject("data")?.toString() ?: json.toString()
        }

    fun createProductFull(
        name: String,
        rentPrice: Double,
        salePrice: Double?,
        stock: Int,
        barcode: String?,
        deposit: Double,
        imageFile: File?,
    ): Result<Product> = runCatching {
        val outletId = SessionStore.outletId
        val data = JSONObject()
            .put("name", name)
            .put("rentPrice", rentPrice)
            .put("totalStock", stock)
            .put("deposit", deposit)
            .apply {
                if (salePrice != null) put("salePrice", salePrice)
                if (!barcode.isNullOrBlank()) put("barcode", barcode)
                if (outletId != null) {
                    put("outletId", outletId)
                    put(
                        "outletStock",
                        JSONArray().put(JSONObject().put("outletId", outletId).put("stock", stock)),
                    )
                }
            }
        if (imageFile == null) {
            val body = data.toString().toRequestBody(jsonMedia)
            val json = ApiClient.get().authedPost("/api/products", body)
            return@runCatching ApiClient.get().getProduct(
                (json.optJSONObject("data") ?: JSONObject()).optInt("id")
            ).getOrThrow()
        }
        val multipart = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("data", data.toString())
            .addFormDataPart(
                "images",
                imageFile.name,
                imageFile.asRequestBody("image/*".toMediaType()),
            )
            .build()
        val json = ApiClient.get().authedMultipart("/api/products", multipart)
        val id = (json.optJSONObject("data") ?: JSONObject()).optInt("id")
        ApiClient.get().getProduct(id).getOrThrow()
    }

    fun downloadExport(pathWithQuery: String): Result<ByteArray> = runCatching {
        ApiClient.get().authedBytes(pathWithQuery)
    }

    fun customerOrders(customerId: Int): Result<List<OrderSummary>> = runCatching {
        ApiClient.get().searchOrders(page = 1, limit = 50, q = null).getOrThrow().items
            // Prefer dedicated endpoint when available
            .ifEmpty { emptyList() }
            .let { list ->
                val dedicated = runCatching {
                    val json = ApiClient.get().authedGet("/api/customers/$customerId/orders?page=1&limit=50")
                    val data = json.optJSONObject("data") ?: JSONObject()
                    val arr = data.optJSONArray("orders") ?: org.json.JSONArray()
                    (0 until arr.length()).map {
                        // reuse search parser via getOrder summary
                        val id = arr.getJSONObject(it).optInt("id")
                        ApiClient.get().getOrder(id).getOrThrow().summary
                    }
                }.getOrNull()
                dedicated ?: list.filter { true }
            }
    }

    fun markNotificationUnread(id: Int): Result<Unit> = runCatching {
        ApiClient.get().authedPatch("/api/notifications/$id/unread")
        Unit
    }

    fun deleteNotification(id: Int): Result<Unit> = runCatching {
        ApiClient.get().authedDelete("/api/notifications/$id")
        Unit
    }

    fun deleteAllReadNotifications(): Result<Unit> = runCatching {
        ApiClient.get().authedDelete("/api/notifications/delete-read")
        Unit
    }

    fun analyticsPeriod(startDate: String, endDate: String): Result<JSONObject> = runCatching {
        ApiClient.get().authedGet(
            "/api/analytics/period?startDate=$startDate&endDate=$endDate&groupBy=day&limit=5"
        ).optJSONObject("data") ?: JSONObject()
    }
}
