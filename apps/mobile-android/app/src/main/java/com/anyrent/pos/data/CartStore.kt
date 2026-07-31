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

    val subtotal: Double
        get() {
            val days = rentalDaysInclusive()
            return _lines.value.sumOf { line ->
                if (_orderType.value == "SALE") line.unitPrice * line.quantity
                else line.unitPrice * line.quantity * days
            }
        }

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
        _lines.update { it.map { line -> line.copy(rentalDays = days) } }
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

    fun updateRentalDays(productId: Int, days: Int) {
        val safe = days.coerceAtLeast(1)
        _lines.update { list ->
            list.map { if (it.product.id == productId) it.copy(rentalDays = safe) else it }
        }
    }

    fun remove(productId: Int) {
        _lines.update { it.filterNot { line -> line.product.id == productId } }
    }

    fun clear() {
        _lines.value = emptyList()
        _customer.value = null
        _notes.value = ""
        _discount.value = 0.0
        _depositAmount.value = 0.0
        _securityDeposit.value = 0.0
        _collateralDetails.value = ""
        _pickupDate.value = LocalDate.now()
        _returnDate.value = LocalDate.now().plusDays(1)
    }

    fun isoPickup(): String = _pickupDate.value.atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
    fun isoReturn(): String = _returnDate.value.atTime(23, 59).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
}
