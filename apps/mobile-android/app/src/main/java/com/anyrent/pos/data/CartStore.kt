package com.anyrent.pos.data

import android.content.Context
import android.content.SharedPreferences
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.data.model.Product
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * POS cart. Draft state is written to SharedPreferences per user so killing
 * the app does not lose an unfinished order. Logout clears memory only.
 */
object CartStore {
    enum class DiscountType { AMOUNT, PERCENT }

    private const val PREFS = "anyrent.cart"
    private const val KEY_PREFIX = "draftCart."

    private lateinit var prefs: SharedPreferences
    /// Off until this user's disk snapshot is loaded so an empty in-memory cart
    /// cannot wipe the saved draft on cold start.
    private var persistEnabled = false

    /** Non-null when cart was loaded from an existing order (iOS `cart.orderId`). */
    private val _editingOrderId = MutableStateFlow<Int?>(null)
    val editingOrderId: StateFlow<Int?> = _editingOrderId.asStateFlow()

    private val _lines = MutableStateFlow<List<CartLine>>(emptyList())
    val lines: StateFlow<List<CartLine>> = _lines.asStateFlow()

    private val _customer = MutableStateFlow<Customer?>(null)
    val customer: StateFlow<Customer?> = _customer.asStateFlow()

    private val _orderType = MutableStateFlow("RENT")
    val orderType: StateFlow<String> = _orderType.asStateFlow()

    private val _pickupDate = MutableStateFlow(LocalDate.now())
    val pickupDate: StateFlow<LocalDate> = _pickupDate.asStateFlow()

    private val _returnDate = MutableStateFlow(LocalDate.now().plusDays(1))
    val returnDate: StateFlow<LocalDate> = _returnDate.asStateFlow()

    private val _notes = MutableStateFlow("")
    val notes: StateFlow<String> = _notes.asStateFlow()

    private val _discount = MutableStateFlow(0.0)
    val discount: StateFlow<Double> = _discount.asStateFlow()

    private val _discountType = MutableStateFlow(DiscountType.AMOUNT)
    val discountType: StateFlow<DiscountType> = _discountType.asStateFlow()

    private val _depositAmount = MutableStateFlow(0.0)
    val depositAmount: StateFlow<Double> = _depositAmount.asStateFlow()

    private val _securityDeposit = MutableStateFlow(0.0)
    val securityDeposit: StateFlow<Double> = _securityDeposit.asStateFlow()

    private val _collateralDetails = MutableStateFlow("")
    val collateralDetails: StateFlow<String> = _collateralDetails.asStateFlow()

    val itemCount: Int get() = _lines.value.sumOf { it.quantity }

    val isEditing: Boolean get() = _editingOrderId.value != null

    val subtotal: Double
        get() = _lines.value.sumOf { it.lineTotal }

    val discountAmount: Double
        get() = when (_discountType.value) {
            DiscountType.AMOUNT -> _discount.value.coerceAtLeast(0.0)
            DiscountType.PERCENT -> subtotal * (_discount.value.coerceIn(0.0, 100.0) / 100.0)
        }

    val totalAmount: Double
        get() = (subtotal - discountAmount).coerceAtLeast(0.0)

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun restoreFromDisk() {
        if (!::prefs.isInitialized) return
        val userId = SessionStore.userId ?: return
        val raw = prefs.getString(KEY_PREFIX + userId, null)
        persistEnabled = false
        if (raw != null) {
            runCatching { applyJson(JSONObject(raw)) }
                .onFailure { android.util.Log.w("AnyRentCart", "Draft cart restore failed: ${it.message}") }
        }
        persistEnabled = true
    }

    private fun persist() = persistToDisk()

    fun rentalDaysInclusive(): Int {
        val days = ChronoUnit.DAYS.between(_pickupDate.value, _returnDate.value) + 1
        return days.toInt().coerceAtLeast(1)
    }

    fun setOrderType(type: String) {
        val sale = type.equals("SALE", ignoreCase = true)
        _orderType.value = if (sale) "SALE" else "RENT"
        _lines.update { list -> list.map { it.copy(isSale = sale, rentalDays = rentalDaysInclusive()) } }
        persist()
    }

    fun setCustomer(customer: Customer?) {
        _customer.value = customer
        persist()
    }
    fun setPickup(date: LocalDate) {
        _pickupDate.value = date
        if (_returnDate.value.isBefore(date)) _returnDate.value = date.plusDays(1)
        syncRentalDays()
        persist()
    }
    fun setReturn(date: LocalDate) {
        _returnDate.value = if (date.isBefore(_pickupDate.value)) _pickupDate.value else date
        syncRentalDays()
        persist()
    }
    fun setNotes(value: String) {
        _notes.value = value
        persist()
    }
    fun setDiscount(value: Double) {
        _discount.value = value
        persist()
    }
    fun setDiscountType(type: DiscountType) {
        _discountType.value = type
        persist()
    }
    fun setDeposit(value: Double) {
        _depositAmount.value = value
        persist()
    }
    fun setSecurityDeposit(value: Double) {
        _securityDeposit.value = value
        persist()
    }
    fun setCollateral(value: String) {
        _collateralDetails.value = value
        persist()
    }

    private fun syncRentalDays() {
        val days = rentalDaysInclusive()
        _lines.update {
            it.map { line ->
                if (line.pricingType.equals("DAILY", ignoreCase = true)) {
                    line.copy(rentalDays = days)
                } else line
            }
        }
    }

    fun addProduct(product: Product, quantity: Int = 1) {
        val sale = _orderType.value == "SALE"
        val days = rentalDaysInclusive()
        _lines.update { current ->
            val existing = current.indexOfFirst { it.product.id == product.id }
            if (existing >= 0) {
                current.toMutableList().also {
                    val line = it[existing]
                    it[existing] = line.copy(quantity = line.quantity + quantity)
                }
            } else {
                current + CartLine(product = product, quantity = quantity, rentalDays = days, isSale = sale)
            }
        }
        // Auto deposit = sum of item deposits for rent
        if (!sale) {
            val auto = _lines.value.sumOf { it.product.deposit * it.quantity }
            if (_depositAmount.value <= 0) _depositAmount.value = auto
        }
        persist()
    }

    fun updateQuantity(productId: Int, quantity: Int) {
        if (quantity <= 0) {
            remove(productId)
            return
        }
        _lines.update { list ->
            list.map { if (it.product.id == productId) it.copy(quantity = quantity) else it }
        }
        persist()
    }

    fun updateUnitPrice(productId: Int, price: Double) {
        _lines.update { list ->
            list.map {
                if (it.product.id == productId) it.copy(unitPriceOverride = price.coerceAtLeast(0.0)) else it
            }
        }
        persist()
    }

    fun updateRentalDays(productId: Int, days: Int) {
        val safe = days.coerceAtLeast(1)
        _lines.update { list ->
            list.map { if (it.product.id == productId) it.copy(rentalDays = safe) else it }
        }
        persist()
    }

    fun setPricingType(productId: Int, type: String) {
        val normalized = if (type.equals("DAILY", ignoreCase = true)) "DAILY" else "FIXED"
        _lines.update { list ->
            list.map { line ->
                if (line.product.id != productId) return@map line
                // iOS CartItem.applyPricingOption: switching FIXED/DAILY also updates
                // the unit price to that option's catalog price so totals refresh.
                val catalogPrice = line.product.pricingOptions.firstOrNull {
                    it.type.equals(normalized, ignoreCase = true)
                }?.price ?: if (line.product.pricingType.equals(normalized, ignoreCase = true)) {
                    line.product.rentPrice
                } else {
                    line.unitPrice
                }
                line.copy(
                    pricingType = normalized,
                    rentalDays = rentalDaysInclusive(),
                    unitPriceOverride = catalogPrice,
                )
            }
        }
        persist()
    }

    fun remove(productId: Int) {
        _lines.update { it.filterNot { line -> line.product.id == productId } }
        persist()
    }

    fun clear(persistToDisk: Boolean = true) {
        _editingOrderId.value = null
        _lines.value = emptyList()
        _customer.value = null
        _notes.value = ""
        _discount.value = 0.0
        _discountType.value = DiscountType.AMOUNT
        _depositAmount.value = 0.0
        _securityDeposit.value = 0.0
        _collateralDetails.value = ""
        _pickupDate.value = LocalDate.now()
        _returnDate.value = LocalDate.now().plusDays(1)
        _orderType.value = "RENT"
        if (persistToDisk) persist() else persistEnabled = false
    }

    /**
     * iOS `Cart.fromOrder` / `Cart.fromOrderDetail` — load an existing order for edit.
     * Call after swipe “Update Order” on RENT+RESERVED (or SALE+COMPLETED).
     *
     * Why assign StateFlows only after mapping: an earlier version called `clear()` first,
     * so any parse failure left the cart empty and looked like “edit didn’t load products”.
     */
    fun loadFromOrderDetail(detail: com.anyrent.pos.data.model.OrderDetail) {
        val summary = detail.summary
        require(summary.id > 0) { "Invalid order id" }
        require(detail.items.isNotEmpty()) {
            "Order #${summary.orderNumber} has no line items to edit"
        }

        val sale = summary.orderType.equals("SALE", ignoreCase = true)
        val pickup = parseOrderDate(summary.pickupPlanAt) ?: LocalDate.now()
        val ret = parseOrderDate(summary.returnPlanAt) ?: pickup.plusDays(1).let { candidate ->
            if (candidate.isBefore(pickup)) pickup else candidate
        }
        val inclusiveDays = ChronoUnit.DAYS.between(pickup, ret).toInt().let { d ->
            (d + 1).coerceAtLeast(1)
        }

        val customer = detail.customer?.takeIf { it.id > 0 }
            ?: detail.customerId?.takeIf { it > 0 }?.let { customerId ->
                val nameParts = summary.customerName.orEmpty().trim().split(Regex("\\s+"))
                    .filter { it.isNotBlank() }
                Customer(
                    id = customerId,
                    firstName = nameParts.firstOrNull().orEmpty()
                        .ifBlank { summary.customerName.orEmpty().ifBlank { "#$customerId" } },
                    lastName = nameParts.drop(1).joinToString(" ").takeIf { it.isNotBlank() },
                    phone = summary.customerPhone,
                    email = null,
                    address = null,
                )
            }

        val mappedLines = detail.items.map { item ->
            require(item.productId > 0) { "Order item missing productId" }
            val product = Product(
                id = item.productId,
                name = item.productName.orEmpty().ifBlank { "Product #${item.productId}" },
                barcode = null,
                rentPrice = item.unitPrice,
                salePrice = item.unitPrice,
                stock = 0,
                available = 0,
                renting = 0,
                categoryId = null,
                categoryName = null,
                imageUrl = item.imageUrl,
                deposit = item.deposit,
                pricingType = item.pricingType.ifBlank { "FIXED" },
            )
            CartLine(
                product = product,
                quantity = item.quantity.coerceAtLeast(1),
                rentalDays = item.rentalDays.coerceAtLeast(1).let { rd ->
                    if (rd > 1) rd else inclusiveDays
                },
                isSale = sale,
                pricingType = item.pricingType.ifBlank { "FIXED" },
                unitPriceOverride = item.unitPrice,
            )
        }

        // Assign after building so collectors never see a cleared mid-load cart.
        _editingOrderId.value = summary.id
        _orderType.value = if (sale) "SALE" else "RENT"
        _pickupDate.value = pickup
        _returnDate.value = ret
        _notes.value = summary.notes.orEmpty()
        _collateralDetails.value = detail.collateralDetails.orEmpty()
        _depositAmount.value = summary.depositAmount.takeUnless { it.isNaN() } ?: 0.0
        _securityDeposit.value = detail.securityDeposit.takeUnless { it.isNaN() } ?: 0.0
        _discount.value = when {
            detail.discountValue > 0 -> detail.discountValue
            detail.discountAmount > 0 -> detail.discountAmount
            else -> 0.0
        }
        val discountTypeRaw = detail.discountType.orEmpty()
        _discountType.value = if (
            discountTypeRaw.equals("percentage", ignoreCase = true) ||
            discountTypeRaw.equals("percent", ignoreCase = true)
        ) {
            DiscountType.PERCENT
        } else {
            DiscountType.AMOUNT
        }
        _customer.value = customer
        _lines.value = mappedLines

        android.util.Log.i(
            "AnyRentCart",
            "Loaded order #${summary.orderNumber} id=${summary.id} " +
                "lines=${mappedLines.size} customer=${customer?.id} " +
                "deposit=${summary.depositAmount} security=${detail.securityDeposit}",
        )
        persistToDisk()
    }

    fun persistToDisk() {
        if (!persistEnabled || !::prefs.isInitialized) return
        val userId = SessionStore.userId ?: return
        val key = KEY_PREFIX + userId
        val hasDraft = _lines.value.isNotEmpty() ||
            _customer.value != null ||
            _editingOrderId.value != null
        val editor = prefs.edit()
        if (!hasDraft) {
            editor.remove(key).commit()
            return
        }
        editor.putString(key, toJson().toString()).commit()
    }

    private fun toJson(): JSONObject {
        val customer = _customer.value
        val customerJson = customer?.let {
            JSONObject()
                .put("id", it.id)
                .put("firstName", it.firstName)
                .put("lastName", it.lastName ?: JSONObject.NULL)
                .put("phone", it.phone ?: JSONObject.NULL)
                .put("email", it.email ?: JSONObject.NULL)
                .put("address", it.address ?: JSONObject.NULL)
        }
        val linesJson = JSONArray()
        _lines.value.forEach { line ->
            val options = JSONArray()
            line.product.pricingOptions.forEach { option ->
                options.put(
                    JSONObject()
                        .put("id", option.id ?: JSONObject.NULL)
                        .put("type", option.type)
                        .put("price", option.price)
                        .put("isDefault", option.isDefault),
                )
            }
            val product = JSONObject()
                .put("id", line.product.id)
                .put("name", line.product.name)
                .put("barcode", line.product.barcode ?: JSONObject.NULL)
                .put("rentPrice", line.product.rentPrice)
                .put("salePrice", line.product.salePrice ?: JSONObject.NULL)
                .put("stock", line.product.stock)
                .put("available", line.product.available)
                .put("renting", line.product.renting)
                .put("categoryId", line.product.categoryId ?: JSONObject.NULL)
                .put("categoryName", line.product.categoryName ?: JSONObject.NULL)
                .put("imageUrl", line.product.imageUrl ?: JSONObject.NULL)
                .put("deposit", line.product.deposit)
                .put("pricingType", line.product.pricingType)
                .put("note", line.product.note ?: JSONObject.NULL)
                .put("pricingOptions", options)
            linesJson.put(
                JSONObject()
                    .put("quantity", line.quantity)
                    .put("rentalDays", line.rentalDays)
                    .put("isSale", line.isSale)
                    .put("pricingType", line.pricingType)
                    .put("unitPriceOverride", line.unitPriceOverride ?: JSONObject.NULL)
                    .put("product", product),
            )
        }
        return JSONObject()
            .put("editingOrderId", _editingOrderId.value ?: JSONObject.NULL)
            .put("orderType", _orderType.value)
            .put("pickup", _pickupDate.value.toString())
            .put("return", _returnDate.value.toString())
            .put("notes", _notes.value)
            .put("discount", _discount.value)
            .put("discountType", _discountType.value.name)
            .put("deposit", _depositAmount.value)
            .put("security", _securityDeposit.value)
            .put("collateral", _collateralDetails.value)
            .put("customer", customerJson ?: JSONObject.NULL)
            .put("lines", linesJson)
    }

    private fun applyJson(json: JSONObject) {
        _editingOrderId.value = json.optInt("editingOrderId", 0).takeIf { it > 0 }
        _orderType.value = json.optString("orderType").ifBlank { "RENT" }
        _pickupDate.value = runCatching { LocalDate.parse(json.optString("pickup")) }.getOrDefault(LocalDate.now())
        _returnDate.value = runCatching { LocalDate.parse(json.optString("return")) }.getOrDefault(LocalDate.now().plusDays(1))
        _notes.value = json.optString("notes")
        _discount.value = json.optDouble("discount", 0.0)
        _discountType.value = runCatching {
            DiscountType.valueOf(json.optString("discountType"))
        }.getOrDefault(DiscountType.AMOUNT)
        _depositAmount.value = json.optDouble("deposit", 0.0)
        _securityDeposit.value = json.optDouble("security", 0.0)
        _collateralDetails.value = json.optString("collateral")
        _customer.value = json.optJSONObject("customer")?.let { c ->
            Customer(
                id = c.optInt("id"),
                firstName = c.optString("firstName"),
                lastName = c.optString("lastName").takeIf { it.isNotBlank() && it != "null" },
                phone = c.optString("phone").takeIf { it.isNotBlank() && it != "null" },
                email = c.optString("email").takeIf { it.isNotBlank() && it != "null" },
                address = c.optString("address").takeIf { it.isNotBlank() && it != "null" },
            )
        }
        val linesArray = json.optJSONArray("lines") ?: JSONArray()
        _lines.value = (0 until linesArray.length()).mapNotNull { index ->
            val line = linesArray.optJSONObject(index) ?: return@mapNotNull null
            val productJson = line.optJSONObject("product") ?: return@mapNotNull null
            val optionsArray = productJson.optJSONArray("pricingOptions") ?: JSONArray()
            val options = (0 until optionsArray.length()).mapNotNull { optionIndex ->
                val option = optionsArray.optJSONObject(optionIndex) ?: return@mapNotNull null
                PricingOption(
                    id = option.optInt("id", 0).takeIf { it > 0 },
                    type = option.optString("type"),
                    price = option.optDouble("price", 0.0),
                    isDefault = option.optBoolean("isDefault"),
                )
            }
            val salePrice = if (productJson.isNull("salePrice")) null else productJson.optDouble("salePrice")
            val product = Product(
                id = productJson.optInt("id"),
                name = productJson.optString("name"),
                barcode = productJson.optString("barcode").takeIf { it.isNotBlank() && it != "null" },
                rentPrice = productJson.optDouble("rentPrice", 0.0),
                salePrice = salePrice,
                stock = productJson.optInt("stock"),
                available = productJson.optInt("available"),
                renting = productJson.optInt("renting"),
                categoryId = productJson.optInt("categoryId", 0).takeIf { it > 0 },
                categoryName = productJson.optString("categoryName").takeIf { it.isNotBlank() && it != "null" },
                imageUrl = productJson.optString("imageUrl").takeIf { it.isNotBlank() && it != "null" },
                deposit = productJson.optDouble("deposit", 0.0),
                pricingType = productJson.optString("pricingType").ifBlank { "FIXED" },
                pricingOptions = options,
                note = productJson.optString("note").takeIf { it.isNotBlank() && it != "null" },
            )
            val override = if (line.isNull("unitPriceOverride")) null else line.optDouble("unitPriceOverride")
            CartLine(
                product = product,
                quantity = line.optInt("quantity", 1).coerceAtLeast(1),
                rentalDays = line.optInt("rentalDays", 1).coerceAtLeast(1),
                isSale = line.optBoolean("isSale"),
                pricingType = line.optString("pricingType").ifBlank { product.pricingType },
                unitPriceOverride = override,
            )
        }
    }

    private fun parseOrderDate(raw: String?): LocalDate? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        return runCatching { LocalDate.parse(trimmed.take(10)) }.getOrNull()
            ?: runCatching {
                java.time.OffsetDateTime.parse(trimmed).toLocalDate()
            }.getOrNull()
            ?: runCatching {
                java.time.Instant.parse(trimmed).atZone(java.time.ZoneOffset.UTC).toLocalDate()
            }.getOrNull()
            ?: runCatching {
                // "2024-01-15 00:00:00" style
                LocalDate.parse(trimmed.take(10).replace(' ', 'T').take(10))
            }.getOrNull()
    }

    fun isoPickup(): String = _pickupDate.value.atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
    fun isoReturn(): String = _returnDate.value.atTime(23, 59).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
}
