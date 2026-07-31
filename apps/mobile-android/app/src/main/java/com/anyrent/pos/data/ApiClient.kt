package com.anyrent.pos.data

import com.anyrent.pos.BuildConfig
import com.anyrent.pos.data.model.CalendarDay
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.InboxNotification
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.PaymentEntry
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.RankingItem
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.data.model.TodayMetrics
import com.anyrent.pos.data.model.UserProfile
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * OkHttp API client mirroring iOS BaseService paths.
 * Why one client: keeps auth + error mapping consistent across POS screens.
 */
class ApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/'),
    private val tokenProvider: () -> String? = { SessionStore.accessToken },
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .build()

    data class PageResult<T>(
        val items: List<T>,
        val hasMore: Boolean,
        val total: Int? = null,
        val unreadCount: Int? = null,
    )

    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------

    fun login(email: String, password: String): Result<UserProfile> = runCatching {
        // Match iOS AuthenticationService: POST /api/auth/login
        val body = JSONObject()
            .put("email", email.trim())
            .put("password", password)
            .toString()
            .toRequestBody(jsonMedia)

        val json = execute(post("/api/auth/login", body, authed = false))
        requireSuccess(json)
        val data = json.getJSONObject("data")
        val token = data.optString("token").ifBlank { data.optString("accessToken") }
        require(token.isNotBlank()) { "Missing access token" }
        SessionStore.accessToken = token

        val user = data.optJSONObject("user") ?: JSONObject()
        val profile = parseUserProfile(user)
        SessionStore.userName = profile.displayName
        SessionStore.email = profile.email
        SessionStore.role = profile.role
        SessionStore.userId = profile.id
        SessionStore.merchantId = profile.merchantId
        SessionStore.outletId = profile.outletId
        SessionStore.merchantName = profile.merchantName
        SessionStore.outletName = profile.outletName
        profile
    }

    fun forgotPassword(email: String): Result<String> = runCatching {
        val body = JSONObject().put("email", email.trim()).toString().toRequestBody(jsonMedia)
        val json = execute(post("/api/auth/forgot-password", body, authed = false))
        requireSuccess(json)
        json.optString("message").ifBlank { "If the email exists, a reset link was sent." }
    }

    fun logout(): Result<Unit> = runCatching {
        val body = JSONObject().put("deviceId", SessionStore.deviceId).toString().toRequestBody(jsonMedia)
        runCatching { execute(post("/api/auth/logout", body, authed = true)) }
        Unit
    }

    // -------------------------------------------------------------------------
    // Device / FCM
    // -------------------------------------------------------------------------

    fun registerDevice(pushToken: String): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("deviceId", SessionStore.deviceId)
            .put("pushToken", pushToken)
            .put("platform", "android")
            .toString()
            .toRequestBody(jsonMedia)
        val json = execute(post("/api/mobile/notifications/register-device", body))
        if (!json.optBoolean("success", true)) {
            error(json.optString("message").ifBlank { "Device registration failed" })
        }
    }

    fun unregisterDevice(): Result<Unit> = runCatching {
        if (tokenProvider().isNullOrBlank()) return@runCatching
        val body = JSONObject().put("deviceId", SessionStore.deviceId).toString().toRequestBody(jsonMedia)
        runCatching {
            execute(
                Request.Builder()
                    .url("$baseUrl/api/mobile/notifications/register-device")
                    .delete(body)
                    .applyAuth(true)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .build()
            )
        }
        Unit
    }

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------

    fun getNotifications(page: Int, limit: Int = 20): Result<PageResult<InboxNotification>> = runCatching {
        val url = "$baseUrl/api/notifications".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())
            .addQueryParameter("limit", limit.toString())
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("notifications")
            ?: data.optJSONArray("items")
            ?: JSONArray()
        val items = (0 until array.length()).map { parseInbox(array.getJSONObject(it)) }
        PageResult(
            items = items,
            hasMore = data.optBoolean("hasMore", false) ||
                (data.optInt("page", page) < data.optInt("totalPages", page)),
            total = data.optInt("total").takeIf { data.has("total") },
            unreadCount = data.optInt("unreadCount").takeIf { data.has("unreadCount") },
        )
    }

    fun getUnreadCount(): Result<Int> = runCatching {
        val json = execute(get("$baseUrl/api/notifications/unread-count"))
        val data = json.optJSONObject("data")
        data?.optInt("count", 0) ?: json.optInt("count", 0)
    }

    fun markNotificationRead(id: Int): Result<Unit> = runCatching {
        execute(patch("$baseUrl/api/notifications/$id/read", "{}".toRequestBody(jsonMedia)))
        Unit
    }

    fun markAllNotificationsRead(): Result<Unit> = runCatching {
        execute(patch("$baseUrl/api/notifications/mark-all-read", "{}".toRequestBody(jsonMedia)))
        Unit
    }

    // -------------------------------------------------------------------------
    // Orders
    // -------------------------------------------------------------------------

    fun searchOrders(
        page: Int = 1,
        limit: Int = 20,
        q: String? = null,
        status: String? = null,
        orderType: String? = null,
        startDate: String? = null,
        endDate: String? = null,
    ): Result<PageResult<OrderSummary>> = runCatching {
        val url = "$baseUrl/api/orders".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())
            .addQueryParameter("limit", limit.toString())
            .apply {
                if (!q.isNullOrBlank()) addQueryParameter("q", q)
                if (!status.isNullOrBlank()) addQueryParameter("status", status)
                if (!orderType.isNullOrBlank()) addQueryParameter("orderType", orderType)
                if (!startDate.isNullOrBlank()) addQueryParameter("startDate", startDate)
                if (!endDate.isNullOrBlank()) addQueryParameter("endDate", endDate)
            }
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("orders") ?: JSONArray()
        PageResult(
            items = (0 until array.length()).map { parseOrderSummary(array.getJSONObject(it)) },
            hasMore = data.optBoolean("hasMore", false),
            total = data.optInt("total").takeIf { data.has("total") },
        )
    }

    fun getOrder(id: Int): Result<OrderDetail> = runCatching {
        val json = execute(get("$baseUrl/api/orders/$id"))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: json
        parseOrderDetail(data)
    }

    fun findOrderByNumber(orderNumber: String): Result<OrderDetail> = runCatching {
        val page = searchOrders(page = 1, limit = 5, q = orderNumber).getOrThrow()
        val match = page.items.firstOrNull {
            it.orderNumber.equals(orderNumber, ignoreCase = true) ||
                it.orderNumber.contains(orderNumber, ignoreCase = true)
        } ?: error("Order not found")
        getOrder(match.id).getOrThrow()
    }

    fun updateOrderStatus(id: Int, status: String): Result<OrderSummary> = runCatching {
        val body = JSONObject().put("status", status).toString().toRequestBody(jsonMedia)
        val json = execute(put("$baseUrl/api/orders/$id", body))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject().put("id", id).put("status", status)
        parseOrderSummary(data)
    }

    fun updateOrderNotes(id: Int, notes: String): Result<Unit> = runCatching {
        val body = JSONObject().put("notes", notes).toString().toRequestBody(jsonMedia)
        execute(put("$baseUrl/api/orders/$id", body))
        Unit
    }

    fun recordPayment(orderId: Int, amount: Double, method: String = "CASH"): Result<Unit> = runCatching {
        // iOS records paid amount via depositAmount on update
        val body = JSONObject()
            .put("depositAmount", amount)
            .put("paymentMethod", method)
            .toString()
            .toRequestBody(jsonMedia)
        execute(put("$baseUrl/api/orders/$orderId", body))
        Unit
    }

    fun createOrder(
        orderType: String,
        customerId: Int?,
        lines: List<Triple<Int, Int, Double>>, // productId, qty, unitPrice
        totalAmount: Double,
        depositAmount: Double = 0.0,
        notes: String? = null,
        rentalDays: Int = 1,
        pickupPlanAt: String? = null,
        returnPlanAt: String? = null,
        securityDeposit: Double? = null,
        discountType: String? = null,
        discountValue: Double? = null,
        discountAmount: Double? = null,
        depositsByProduct: Map<Int, Double> = emptyMap(),
    ): Result<OrderSummary> = runCatching {
        val items = JSONArray()
        lines.forEach { (productId, qty, unitPrice) ->
            val lineTotal = unitPrice * qty * if (orderType == "SALE") 1 else rentalDays
            items.put(
                JSONObject()
                    .put("productId", productId)
                    .put("quantity", qty)
                    .put("unitPrice", unitPrice)
                    .put("totalPrice", lineTotal)
                    .apply {
                        depositsByProduct[productId]?.let { put("deposit", it) }
                        if (orderType == "RENT") {
                            put("rentDays", rentalDays)
                            put("pricingType", "DAILY")
                        }
                    }
            )
        }
        val body = JSONObject()
            .put("orderType", orderType)
            .put("totalAmount", totalAmount)
            .put("orderItems", items)
            .put("isReadyToDeliver", false)
            .apply {
                if (customerId != null) put("customerId", customerId)
                if (!notes.isNullOrBlank()) put("notes", notes)
                if (orderType == "RENT") {
                    put("depositAmount", depositAmount)
                    if (securityDeposit != null) put("securityDeposit", securityDeposit)
                    if (pickupPlanAt != null) put("pickupPlanAt", pickupPlanAt)
                    if (returnPlanAt != null) put("returnPlanAt", returnPlanAt)
                    put("rentalDuration", rentalDays)
                    put("rentalDurationUnit", "day")
                }
                if (discountAmount != null && discountAmount > 0) {
                    put("discountType", discountType ?: "amount")
                    put("discountValue", discountValue ?: discountAmount)
                    put("discountAmount", discountAmount)
                }
            }
            .toString()
            .toRequestBody(jsonMedia)
        val json = execute(post("/api/orders", body))
        requireSuccess(json)
        parseOrderSummary(json.optJSONObject("data") ?: JSONObject())
    }

    // --- helpers used by ApiParity ---
    fun publicPost(path: String, body: okhttp3.RequestBody): JSONObject =
        execute(post(path, body, authed = false)).also { requireSuccess(it) }

    fun authedGet(path: String): JSONObject =
        execute(get(if (path.startsWith("http")) path else "$baseUrl$path")).also { requireSuccess(it) }

    fun authedPost(path: String, body: okhttp3.RequestBody): JSONObject =
        execute(post(path, body)).also { requireSuccess(it) }

    fun authedPut(path: String, body: okhttp3.RequestBody): JSONObject =
        execute(put(if (path.startsWith("http")) path else "$baseUrl$path", body)).also { requireSuccess(it) }

    fun authedPatch(path: String): JSONObject =
        execute(patch(if (path.startsWith("http")) path else "$baseUrl$path", "{}".toRequestBody(jsonMedia)))
            .also { requireSuccess(it) }

    fun authedDelete(path: String): JSONObject {
        val request = Request.Builder()
            .url(if (path.startsWith("http")) path else "$baseUrl$path")
            .delete()
            .applyAuth(true)
            .header("Accept", "application/json")
            .build()
        return execute(request)
    }

    fun authedMultipartPut(path: String, body: okhttp3.RequestBody): JSONObject {
        val request = Request.Builder()
            .url(if (path.startsWith("http")) path else "$baseUrl$path")
            .put(body)
            .applyAuth(true)
            .header("Accept", "application/json")
            .build()
        return execute(request).also { requireSuccess(it) }
    }

    fun authedMultipart(path: String, body: okhttp3.RequestBody): JSONObject {
        val request = Request.Builder()
            .url(if (path.startsWith("http")) path else "$baseUrl$path")
            .post(body)
            .applyAuth(true)
            .header("Accept", "application/json")
            .build()
        return execute(request).also { requireSuccess(it) }
    }

    fun authedBytes(pathWithQuery: String): ByteArray {
        val request = Request.Builder()
            .url(if (pathWithQuery.startsWith("http")) pathWithQuery else "$baseUrl$pathWithQuery")
            .get()
            .applyAuth(true)
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("Download failed (${response.code})")
            return response.body?.bytes() ?: ByteArray(0)
        }
    }

    // -------------------------------------------------------------------------
    // Products
    // -------------------------------------------------------------------------

    fun searchProducts(page: Int = 1, limit: Int = 30, q: String? = null): Result<PageResult<Product>> =
        runCatching {
            val url = "$baseUrl/api/products".toHttpUrl().newBuilder()
                .addQueryParameter("page", page.toString())
                .addQueryParameter("limit", limit.toString())
                .apply { if (!q.isNullOrBlank()) addQueryParameter("q", q) }
                .build()
            val json = execute(get(url.toString()))
            requireSuccess(json)
            val data = json.optJSONObject("data") ?: JSONObject()
            val array = data.optJSONArray("products") ?: JSONArray()
            PageResult(
                items = (0 until array.length()).map { parseProduct(array.getJSONObject(it)) },
                hasMore = data.optBoolean("hasMore", false),
                total = data.optInt("total").takeIf { data.has("total") },
            )
        }

    fun getProduct(id: Int): Result<Product> = runCatching {
        val json = execute(get("$baseUrl/api/products/$id"))
        requireSuccess(json)
        parseProduct(json.optJSONObject("data") ?: JSONObject())
    }

    fun createProduct(name: String, rentPrice: Double, stock: Int, salePrice: Double? = null): Result<Product> =
        runCatching {
            val outletId = SessionStore.outletId
            val body = JSONObject()
                .put("name", name)
                .put("rentPrice", rentPrice)
                .put("totalStock", stock)
                .apply {
                    if (salePrice != null) put("salePrice", salePrice)
                    if (outletId != null) {
                        put("outletId", outletId)
                        put(
                            "outletStock",
                            JSONArray().put(JSONObject().put("outletId", outletId).put("stock", stock))
                        )
                    }
                }
                .toString()
                .toRequestBody(jsonMedia)
            val json = execute(post("/api/products", body))
            requireSuccess(json)
            parseProduct(json.optJSONObject("data") ?: JSONObject())
        }

    fun updateProduct(id: Int, name: String, rentPrice: Double, stock: Int): Result<Product> = runCatching {
        val body = JSONObject()
            .put("name", name)
            .put("rentPrice", rentPrice)
            .put("totalStock", stock)
            .toString()
            .toRequestBody(jsonMedia)
        val json = execute(put("$baseUrl/api/products/$id", body))
        requireSuccess(json)
        parseProduct(json.optJSONObject("data") ?: JSONObject())
    }

    fun deleteProduct(id: Int): Result<Unit> = runCatching {
        execute(
            Request.Builder().url("$baseUrl/api/products/$id").delete().applyAuth(true)
                .header("Accept", "application/json").build()
        )
        Unit
    }

    fun findProductByBarcode(barcode: String): Result<Product> = runCatching {
        val page = searchProducts(page = 1, limit = 10, q = barcode).getOrThrow()
        page.items.firstOrNull {
            it.barcode.equals(barcode, ignoreCase = true) || it.name.contains(barcode, ignoreCase = true)
        } ?: error("Product not found for barcode")
    }

    // -------------------------------------------------------------------------
    // Customers
    // -------------------------------------------------------------------------

    fun searchCustomers(page: Int = 1, limit: Int = 30, q: String? = null): Result<PageResult<Customer>> =
        runCatching {
            val url = "$baseUrl/api/customers".toHttpUrl().newBuilder()
                .addQueryParameter("page", page.toString())
                .addQueryParameter("limit", limit.toString())
                .apply { if (!q.isNullOrBlank()) addQueryParameter("q", q) }
                .build()
            val json = execute(get(url.toString()))
            requireSuccess(json)
            val data = json.optJSONObject("data") ?: JSONObject()
            val array = data.optJSONArray("customers") ?: JSONArray()
            PageResult(
                items = (0 until array.length()).map { parseCustomer(array.getJSONObject(it)) },
                hasMore = data.optBoolean("hasMore", false),
                total = data.optInt("total").takeIf { data.has("total") },
            )
        }

    fun createCustomer(
        firstName: String,
        lastName: String? = null,
        phone: String? = null,
        email: String? = null,
        address: String? = null,
    ): Result<Customer> = runCatching {
        val body = JSONObject()
            .put("firstName", firstName)
            .apply {
                if (!lastName.isNullOrBlank()) put("lastName", lastName)
                if (!phone.isNullOrBlank()) put("phone", phone)
                if (!email.isNullOrBlank()) put("email", email)
                if (!address.isNullOrBlank()) put("address", address)
            }
            .toString()
            .toRequestBody(jsonMedia)
        val json = execute(post("/api/customers", body))
        requireSuccess(json)
        parseCustomer(json.optJSONObject("data") ?: JSONObject())
    }

    fun updateCustomer(
        id: Int,
        firstName: String,
        lastName: String? = null,
        phone: String? = null,
        email: String? = null,
        address: String? = null,
    ): Result<Customer> = runCatching {
        val body = JSONObject()
            .put("firstName", firstName)
            .apply {
                if (!lastName.isNullOrBlank()) put("lastName", lastName)
                if (!phone.isNullOrBlank()) put("phone", phone)
                if (!email.isNullOrBlank()) put("email", email)
                if (!address.isNullOrBlank()) put("address", address)
            }
            .toString()
            .toRequestBody(jsonMedia)
        val json = execute(put("$baseUrl/api/customers/$id", body))
        requireSuccess(json)
        parseCustomer(json.optJSONObject("data") ?: JSONObject())
    }

    fun deleteCustomer(id: Int): Result<Unit> = runCatching {
        execute(
            Request.Builder().url("$baseUrl/api/customers/$id").delete().applyAuth(true)
                .header("Accept", "application/json").build()
        )
        Unit
    }

    // -------------------------------------------------------------------------
    // Calendar / Analytics
    // -------------------------------------------------------------------------


    fun calendarOrdersCount(month: Int, year: Int): Result<Map<String, Int>> = runCatching {
        val url = "$baseUrl/api/calendar/orders/count".toHttpUrl().newBuilder()
            .addQueryParameter("month", month.toString())
            .addQueryParameter("year", year.toString())
            .addQueryParameter("status", "RESERVED")
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        val counts = data.optJSONObject("countByDate")
            ?: data.optJSONObject("counts")
            ?: data.optJSONObject("orderCounts")
            ?: JSONObject()
        val map = mutableMapOf<String, Int>()
        if (counts.length() > 0) {
            counts.keys().forEach { key -> map[key] = counts.optInt(key) }
        } else {
            val array = data.optJSONArray("calendar") ?: data.optJSONArray("days") ?: JSONArray()
            for (i in 0 until array.length()) {
                val day = array.getJSONObject(i)
                val date = day.optString("date")
                val count = day.optInt("count", day.optJSONObject("summary")?.optInt("total") ?: 0)
                if (date.isNotBlank()) map[date] = count
            }
        }
        map
    }

    fun calendarOrdersByDate(date: String, status: String = "RESERVED"): Result<List<OrderSummary>> = runCatching {
        val url = "$baseUrl/api/calendar/orders/by-date".toHttpUrl().newBuilder()
            .addQueryParameter("date", date)
            .addQueryParameter("status", status)
            .addQueryParameter("limit", "100")
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = when {
            data.optJSONArray("orders") != null -> data.getJSONArray("orders")
            json.optJSONArray("data") != null -> json.getJSONArray("data")
            else -> JSONArray()
        }
        (0 until array.length()).map { parseOrderSummary(array.getJSONObject(it)) }
    }

    fun calendarOrders(month: Int, year: Int): Result<List<CalendarDay>> = runCatching {
        val url = "$baseUrl/api/calendar/orders".toHttpUrl().newBuilder()
            .addQueryParameter("month", month.toString())
            .addQueryParameter("year", year.toString())
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("calendar") ?: JSONArray()
        (0 until array.length()).map { i ->
            val day = array.getJSONObject(i)
            val ordersArr = day.optJSONArray("orders") ?: JSONArray()
            CalendarDay(
                date = day.optString("date"),
                orderCount = day.optJSONObject("summary")?.optInt("total")
                    ?: ordersArr.length(),
                orders = (0 until ordersArr.length()).map { parseOrderSummary(ordersArr.getJSONObject(it)) },
            )
        }
    }

    fun todayMetrics(): Result<TodayMetrics> = runCatching {
        val json = execute(get("$baseUrl/api/analytics/today-metrics"))
        requireSuccess(json)
        val data = json.optJSONObject("data") ?: JSONObject()
        TodayMetrics(
            totalOrders = data.optInt("totalOrders"),
            activeRentals = data.optInt("activeRentals"),
            completedOrders = data.optInt("completedOrders"),
            totalRevenue = data.optDouble("totalRevenue"),
            totalStock = data.optInt("totalStock"),
            availableStock = data.optInt("availableStock"),
            rentingStock = data.optInt("rentingStock"),
        )
    }

    fun analyticsOverview(startDate: String, endDate: String): Result<Pair<List<RankingItem>, List<RankingItem>>> =
        runCatching {
            val url = "$baseUrl/api/analytics/overview".toHttpUrl().newBuilder()
                .addQueryParameter("startDate", startDate)
                .addQueryParameter("endDate", endDate)
                .addQueryParameter("limit", "5")
                .build()
            val json = execute(get(url.toString()))
            requireSuccess(json)
            val data = json.optJSONObject("data") ?: JSONObject()
            val products = data.optJSONArray("topProducts") ?: JSONArray()
            val customers = data.optJSONArray("topCustomers") ?: JSONArray()
            parseRankings(products) to parseRankings(customers)
        }

    // -------------------------------------------------------------------------
    // Users / store
    // -------------------------------------------------------------------------

    fun listUsers(page: Int = 1, limit: Int = 50): Result<PageResult<StaffUser>> = runCatching {
        val url = "$baseUrl/api/users".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())
            .addQueryParameter("limit", limit.toString())
            .build()
        val json = execute(get(url.toString()))
        requireSuccess(json)
        val array = when {
            json.optJSONArray("data") != null -> json.getJSONArray("data")
            json.optJSONObject("data")?.optJSONArray("users") != null ->
                json.getJSONObject("data").getJSONArray("users")
            else -> JSONArray()
        }
        val pagination = json.optJSONObject("pagination")
        PageResult(
            items = (0 until array.length()).map { parseStaff(array.getJSONObject(it)) },
            hasMore = pagination?.optBoolean("hasMore", false) ?: false,
            total = pagination?.optInt("total"),
        )
    }

    fun healthCheck(): Result<Boolean> = runCatching {
        val json = execute(get("$baseUrl/api/health", authed = false))
        json.optBoolean("success", true) || json.has("status")
    }

    // -------------------------------------------------------------------------
    // HTTP helpers + parsers
    // -------------------------------------------------------------------------

    private fun execute(request: Request): JSONObject {
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val json = JSONObject(if (raw.isBlank()) "{}" else raw)
            if (!response.isSuccessful && !json.has("success")) {
                error(json.optString("message").ifBlank { "HTTP ${response.code}" })
            }
            return json
        }
    }

    private fun requireSuccess(json: JSONObject) {
        if (json.has("success") && !json.optBoolean("success")) {
            error(
                json.optString("message")
                    .ifBlank { json.optString("error") }
                    .ifBlank { "Request failed" }
            )
        }
    }

    private fun get(url: String, authed: Boolean = true): Request =
        Request.Builder().url(url).get().applyAuth(authed).header("Accept", "application/json").build()

    private fun post(path: String, body: okhttp3.RequestBody, authed: Boolean = true): Request =
        Request.Builder()
            .url(if (path.startsWith("http")) path else "$baseUrl$path")
            .post(body)
            .applyAuth(authed)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .build()

    private fun put(url: String, body: okhttp3.RequestBody): Request =
        Request.Builder().url(url).put(body).applyAuth(true)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .build()

    private fun patch(url: String, body: okhttp3.RequestBody): Request =
        Request.Builder().url(url).patch(body).applyAuth(true)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .build()

    private fun Request.Builder.applyAuth(authed: Boolean): Request.Builder {
        if (authed) {
            val token = tokenProvider()
            if (!token.isNullOrBlank()) header("Authorization", "Bearer $token")
        }
        return this
    }

    private fun parseUserProfile(user: JSONObject): UserProfile {
        val merchant = user.optJSONObject("merchant")
        val outlet = user.optJSONObject("outlet")
        return UserProfile(
            id = user.optInt("id"),
            email = user.optString("email"),
            firstName = user.optString("firstName").takeIf { it.isNotBlank() },
            lastName = user.optString("lastName").takeIf { it.isNotBlank() },
            name = user.optString("name").takeIf { it.isNotBlank() },
            role = user.optString("role"),
            merchantId = user.optInt("merchantId").takeIf { user.has("merchantId") && it > 0 }
                ?: merchant?.optInt("id")?.takeIf { it > 0 },
            outletId = user.optInt("outletId").takeIf { user.has("outletId") && it > 0 }
                ?: outlet?.optInt("id")?.takeIf { it > 0 },
            merchantName = merchant?.optString("name")?.takeIf { it.isNotBlank() },
            outletName = outlet?.optString("name")?.takeIf { it.isNotBlank() },
        )
    }

    private fun parseInbox(item: JSONObject): InboxNotification {
        val payload = item.optJSONObject("data")
        val orderId = payload?.optString("orderId")?.toIntOrNull()
            ?: item.optString("orderId").toIntOrNull()
        return InboxNotification(
            id = item.optInt("id"),
            title = item.optString("title"),
            body = item.optString("body").ifBlank { item.optString("message") },
            type = item.optString("type"),
            isRead = item.optBoolean("isRead", false),
            createdAt = item.optString("createdAt").takeIf { it.isNotBlank() },
            orderId = orderId,
        )
    }

    private fun parseProduct(o: JSONObject): Product = Product(
        id = o.optInt("id"),
        name = o.optString("name"),
        barcode = o.optString("barcode").takeIf { it.isNotBlank() },
        rentPrice = o.optDouble("rentPrice", o.optDouble("price", 0.0)),
        salePrice = o.optDouble("salePrice").takeIf { o.has("salePrice") },
        stock = o.optInt("stock", o.optInt("totalStock")),
        available = o.optInt("available", o.optInt("stock")),
        renting = o.optInt("renting"),
        categoryId = o.optInt("categoryId").takeIf { o.has("categoryId") && it > 0 },
        categoryName = o.optJSONObject("category")?.optString("name")
            ?: o.optString("categoryName").takeIf { it.isNotBlank() },
        imageUrl = o.optString("imageUrl").ifBlank { o.optString("image") }.takeIf { it.isNotBlank() },
        deposit = o.optDouble("deposit", 0.0),
    )

    private fun parseCustomer(o: JSONObject): Customer = Customer(
        id = o.optInt("id"),
        firstName = o.optString("firstName").ifBlank { o.optString("name") },
        lastName = o.optString("lastName").takeIf { it.isNotBlank() },
        phone = o.optString("phone").takeIf { it.isNotBlank() },
        email = o.optString("email").takeIf { it.isNotBlank() },
        address = o.optString("address").takeIf { it.isNotBlank() },
    )

    private fun parseOrderSummary(o: JSONObject): OrderSummary {
        val customer = o.optJSONObject("customer")
        return OrderSummary(
            id = o.optInt("id"),
            orderNumber = o.optString("orderNumber"),
            orderType = o.optString("orderType"),
            status = o.optString("status"),
            totalAmount = o.optDouble("totalAmount"),
            depositAmount = o.optDouble("depositAmount"),
            customerName = o.optString("customerName").ifBlank {
                listOfNotNull(
                    customer?.optString("firstName")?.takeIf { it.isNotBlank() },
                    customer?.optString("lastName")?.takeIf { it.isNotBlank() },
                ).joinToString(" ").ifBlank { null }
            }.takeIf { !it.isNullOrBlank() },
            customerPhone = o.optString("customerPhone").ifBlank { customer?.optString("phone") }
                .takeIf { !it.isNullOrBlank() },
            pickupPlanAt = o.optString("pickupPlanAt").takeIf { it.isNotBlank() },
            returnPlanAt = o.optString("returnPlanAt").takeIf { it.isNotBlank() },
            createdAt = o.optString("createdAt").takeIf { it.isNotBlank() },
            notes = o.optString("notes").takeIf { it.isNotBlank() },
            isReadyToDeliver = o.optBoolean("isReadyToDeliver", false),
        )
    }

    private fun parseOrderDetail(o: JSONObject): OrderDetail {
        val itemsArr = o.optJSONArray("orderItems") ?: o.optJSONArray("items") ?: JSONArray()
        val paymentsArr = o.optJSONArray("payments") ?: JSONArray()
        return OrderDetail(
            summary = parseOrderSummary(o),
            items = (0 until itemsArr.length()).map { i ->
                val item = itemsArr.getJSONObject(i)
                val product = item.optJSONObject("product")
                OrderItem(
                    id = item.optInt("id").takeIf { item.has("id") },
                    productId = item.optInt("productId", product?.optInt("id") ?: 0),
                    productName = item.optString("productName").ifBlank { product?.optString("name") }
                        .takeIf { !it.isNullOrBlank() },
                    quantity = item.optInt("quantity", 1),
                    unitPrice = item.optDouble("unitPrice"),
                    totalPrice = item.optDouble("totalPrice"),
                )
            },
            customerId = o.optInt("customerId").takeIf { o.has("customerId") && it > 0 }
                ?: o.optJSONObject("customer")?.optInt("id"),
            payments = (0 until paymentsArr.length()).map { i ->
                val p = paymentsArr.getJSONObject(i)
                PaymentEntry(
                    id = p.optInt("id"),
                    amount = p.optDouble("amount"),
                    paymentMethod = p.optString("paymentMethod").ifBlank { p.optString("method") }
                        .takeIf { it.isNotBlank() },
                    status = p.optString("status").takeIf { it.isNotBlank() },
                    notes = p.optString("notes").takeIf { it.isNotBlank() },
                )
            },
        )
    }

    private fun parseStaff(o: JSONObject): StaffUser = StaffUser(
        id = o.optInt("id"),
        email = o.optString("email"),
        firstName = o.optString("firstName").takeIf { it.isNotBlank() },
        lastName = o.optString("lastName").takeIf { it.isNotBlank() },
        role = o.optString("role"),
        isActive = o.optBoolean("isActive", true),
    )

    private fun parseRankings(array: JSONArray): List<RankingItem> =
        (0 until array.length()).map { i ->
            val o = array.getJSONObject(i)
            RankingItem(
                id = o.optInt("id").takeIf { o.has("id") },
                name = o.optString("name").ifBlank { o.optString("productName") }
                    .ifBlank { o.optString("customerName") },
                value = o.optDouble("totalAmount", o.optDouble("revenue", o.optDouble("count", 0.0))),
                subtitle = o.optString("subtitle").takeIf { it.isNotBlank() },
            )
        }

    companion object {
        @Volatile
        private var instance: ApiClient? = null

        fun get(): ApiClient = instance ?: synchronized(this) {
            instance ?: ApiClient().also { instance = it }
        }
    }
}
