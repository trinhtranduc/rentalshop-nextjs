package com.anyrent.pos.data

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.Product
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * In-memory POS cart — mirrors iOS Cart (dates, discount, deposit, notes, collateral).
 */
object CartStore {
    enum class DiscountType { AMOUNT, PERCENT }

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

    fun rentalDaysInclusive(): Int {
        val days = ChronoUnit.DAYS.between(_pickupDate.value, _returnDate.value) + 1
        return days.toInt().coerceAtLeast(1)
    }

    fun setOrderType(type: String) {
        val sale = type.equals("SALE", ignoreCase = true)
        _orderType.value = if (sale) "SALE" else "RENT"
        _lines.update { list -> list.map { it.copy(isSale = sale, rentalDays = rentalDaysInclusive()) } }
    }

    fun setCustomer(customer: Customer?) { _customer.value = customer }
    fun setPickup(date: LocalDate) {
        _pickupDate.value = date
        if (_returnDate.value.isBefore(date)) _returnDate.value = date.plusDays(1)
        syncRentalDays()
    }
    fun setReturn(date: LocalDate) {
        _returnDate.value = if (date.isBefore(_pickupDate.value)) _pickupDate.value else date
        syncRentalDays()
    }
    fun setNotes(value: String) { _notes.value = value }
    fun setDiscount(value: Double) { _discount.value = value }
    fun setDiscountType(type: DiscountType) { _discountType.value = type }
    fun setDeposit(value: Double) { _depositAmount.value = value }
    fun setSecurityDeposit(value: Double) { _securityDeposit.value = value }
    fun setCollateral(value: String) { _collateralDetails.value = value }

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
    }

    fun updateQuantity(productId: Int, quantity: Int) {
        if (quantity <= 0) {
            remove(productId)
            return
        }
        _lines.update { list ->
            list.map { if (it.product.id == productId) it.copy(quantity = quantity) else it }
        }
    }

    fun updateUnitPrice(productId: Int, price: Double) {
        _lines.update { list ->
            list.map {
                if (it.product.id == productId) it.copy(unitPriceOverride = price.coerceAtLeast(0.0)) else it
            }
        }
    }

    fun updateRentalDays(productId: Int, days: Int) {
        val safe = days.coerceAtLeast(1)
        _lines.update { list ->
            list.map { if (it.product.id == productId) it.copy(rentalDays = safe) else it }
        }
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
    }

    fun remove(productId: Int) {
        _lines.update { it.filterNot { line -> line.product.id == productId } }
    }

    fun clear() {
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
