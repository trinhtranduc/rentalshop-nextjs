package com.anyrent.pos.data

import android.content.Context
import android.content.SharedPreferences
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.deposit.DepositMode
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.domain.deposit.DepositStageDraft
import com.anyrent.pos.domain.deposit.DepositStagePreview
import com.anyrent.pos.domain.deposit.DepositTemplate
import com.anyrent.pos.domain.deposit.PaymentPlanRequest
import com.anyrent.pos.domain.orders.EditOrderSheet
import com.anyrent.pos.domain.orders.OrderPlanDays
import com.anyrent.pos.domain.products.BlockPricing
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.domain.products.PricingMode
import com.anyrent.pos.domain.products.PricingTypes
import com.anyrent.pos.domain.products.ProductPricing
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * POS cart. Draft state is written to SharedPreferences per user so killing
 * the app does not lose an unfinished order. Logout clears memory only.
 */
object CartStore {
    enum class DiscountType { AMOUNT, PERCENT }

    /** #1079: at most this many carts are open at once (iOS `CartStore.maxCarts`) */
    const val MAX_CARTS = 10

    /** What the cart bar and "Chọn giỏ" show for one cart; `customerName` is null while no customer is chosen ("Giỏ k") */
    data class CartSummary(
        val number: Int,
        val customerName: String?,
        val avatar: String,
        val itemCount: Int,
        val total: Double,
        val isSale: Boolean,
        /** "19/10/26 → 21/10/26" for a rental cart with both days chosen, else null */
        val dates: String?,
        /** The order number while this cart edits an order */
        val editOrderNumber: String?,
    )

    /** One open cart. The one in use lives in the flows below; the others keep a snapshot (`json`) and its summary. */
    private class Slot(var number: Int, var json: JSONObject? = null, var summary: CartSummary? = null)

    private const val PREFS = "anyrent.cart"
    private const val KEY_PREFIX = "draftCart."
    private const val MULTI_KEY_PREFIX = "draftCarts."

    private val slots = mutableListOf(Slot(1))
    private var activeIdx = 0
    /** Number of the cart in use when an order edit opened its own cart; closing the edit cart returns there */
    private var returnNumber: Int? = null
    /** Bumped on every change to the carts, so the cart bar recomposes */
    private val _revision = MutableStateFlow(0)
    val revision: StateFlow<Int> = _revision.asStateFlow()

    private lateinit var prefs: SharedPreferences
    /// Off until this user's disk snapshot is loaded so an empty in-memory cart
    /// cannot wipe the saved draft on cold start.
    private var persistEnabled = false

    /** Non-null when cart was loaded from an existing order (iOS `cart.orderId`). */
    private val _editingOrderId = MutableStateFlow<Int?>(null)
    val editingOrderId: StateFlow<Int?> = _editingOrderId.asStateFlow()

    /** #676: the order as it was loaded for edit (number, dates, lines, paid); null for a new order (iOS `editOriginal`) */
    private val _editOriginal = MutableStateFlow<EditOrderSheet.Original?>(null)
    val editOriginal: StateFlow<EditOrderSheet.Original?> = _editOriginal.asStateFlow()

    /** #1124: the online booking this cart confirms (`POST /api/orders` `bookingRequestId`); null for any other cart */
    private val _bookingRequestId = MutableStateFlow<Int?>(null)
    val bookingRequestId: StateFlow<Int?> = _bookingRequestId.asStateFlow()

    /** #1124: the booking's outlet; its order goes there, not to the chosen branch */
    private val _bookingOutletId = MutableStateFlow<Int?>(null)
    val bookingOutletId: StateFlow<Int?> = _bookingOutletId.asStateFlow()

    private val _lines = MutableStateFlow<List<CartLine>>(emptyList())
    val lines: StateFlow<List<CartLine>> = _lines.asStateFlow()

    private val _customer = MutableStateFlow<Customer?>(null)
    val customer: StateFlow<Customer?> = _customer.asStateFlow()

    private val _orderType = MutableStateFlow("RENT")
    val orderType: StateFlow<String> = _orderType.asStateFlow()

    private val _pickupDate = MutableStateFlow(ShopTime.today())
    val pickupDate: StateFlow<LocalDate> = _pickupDate.asStateFlow()

    private val _returnDate = MutableStateFlow(ShopTime.today().plusDays(1))
    val returnDate: StateFlow<LocalDate> = _returnDate.asStateFlow()

    /**
     * The user picked rental dates (or they came from an order / saved draft). The new cart shows
     * "Chọn ngày thuê" and blocks the review until then, like iOS `Cart.pickupPlanAt == nil` (#448).
     * The old cart ignores it and keeps showing the default today → tomorrow.
     */
    private val _datesChosen = MutableStateFlow(false)
    val datesChosen: StateFlow<Boolean> = _datesChosen.asStateFlow()

    private val _notes = MutableStateFlow("")
    val notes: StateFlow<String> = _notes.asStateFlow()

    /**
     * #480: note photos picked in the cart note editor (cache files, at most MAX_NOTE_PHOTOS), compressed to ~180KB
     * and sent as `notesImages` when the order is created. Memory only: not in the saved draft, so they are gone
     * after an app restart. Cleared (and the files deleted) with the cart.
     */
    private val _noteImageFiles = MutableStateFlow<List<File>>(emptyList())
    val noteImageFiles: StateFlow<List<File>> = _noteImageFiles.asStateFlow()

    private val _discount = MutableStateFlow(0.0)
    val discount: StateFlow<Double> = _discount.asStateFlow()

    private val _discountType = MutableStateFlow(DiscountType.AMOUNT)
    val discountType: StateFlow<DiscountType> = _discountType.asStateFlow()

    private val _depositAmount = MutableStateFlow(0.0)
    val depositAmount: StateFlow<Double> = _depositAmount.asStateFlow()

    /**
     * The user typed the deposit, or it came from an order being edited: item changes keep it (iOS
     * `Cart.isDepositManuallyOverridden`). Otherwise the deposit follows the items (#388).
     */
    private var depositManual = false

    // --- #1199 "Thu cọc theo giai đoạn" (kept in memory only, except the edit flag: a new cart starts from the shop's default template)

    /** The stages of this new order; null until the cart seeds them from the shop's template */
    private val _depositStages = MutableStateFlow<List<DepositStageDraft>?>(null)
    val depositStages: StateFlow<List<DepositStageDraft>?> = _depositStages.asStateFlow()

    private val _depositTemplateId = MutableStateFlow<String?>(null)
    val depositTemplateId: StateFlow<String?> = _depositTemplateId.asStateFlow()

    /** "Thu ngay giai đoạn 1" with the method in [collectMethod], or the order is created without collecting */
    private val _collectFirstStageNow = MutableStateFlow(true)
    val collectFirstStageNow: StateFlow<Boolean> = _collectFirstStageNow.asStateFlow()

    private val _collectMethod = MutableStateFlow("CASH")
    val collectMethod: StateFlow<String> = _collectMethod.asStateFlow()

    /** The order being edited has a deposit plan: the cart's own "Cọc" is not used (saved with the draft) */
    private val _editHasDepositPlan = MutableStateFlow(false)
    val editHasDepositPlan: StateFlow<Boolean> = _editHasDepositPlan.asStateFlow()

    /** #1199: the stages of the new order start from a template (null clears them) */
    fun setDepositTemplate(template: DepositTemplate?) {
        _depositTemplateId.value = template?.id
        _depositStages.value = template?.items?.map(DepositStageDraft::from)
    }

    /** #1199: the owner typed another amount for a stage of this order (null = back to its percentage) */
    fun setDepositStageAmount(index: Int, amount: Double?) {
        val stages = _depositStages.value ?: return
        if (index !in stages.indices) return
        _depositStages.value = stages.toMutableList().also { it[index] = it[index].copy(amountOverride = amount) }
    }

    /** #1199: "Thu ngay giai đoạn 1": the method, or null to create the order without collecting */
    fun setCollectFirstStage(method: String?) {
        _collectFirstStageNow.value = method != null
        if (method != null) _collectMethod.value = method
    }

    /** A new rental in a shop on "Thu cọc theo giai đoạn" (an order being edited keeps the plan it has) */
    val isStagedRental: Boolean
        get() = _orderType.value == "RENT" && !isEditing && DepositModeStore.current == DepositMode.STAGED && _depositStages.value != null

    /** Stages with amounts for the order total as it is now; empty when the cart has no stages */
    fun stagedPreview(restLabel: String): List<DepositStagePreview> {
        val drafts = _depositStages.value ?: return emptyList()
        val createdKey = ShopTime.today().toString()
        val pickupKey = _pickupDate.value.toString()
        return DepositPlanMath.stages(drafts, totalAmount, createdKey, pickupKey, SessionStore.currency, restLabel)
    }

    /** What is paid with the order: stage 1, or nothing when "tạo đơn không thu ngay" */
    fun stagedCollectNow(restLabel: String = ""): Double {
        if (!_collectFirstStageNow.value) return 0.0
        val first = stagedPreview(restLabel).firstOrNull() ?: return 0.0
        return if (first.isRest) 0.0 else first.amount
    }

    /** `paymentPlan` of POST /api/orders; null unless this is a staged rental */
    fun paymentPlanRequest(reference: String, canEditStages: Boolean = !PermissionManager.role.isStaffLike): JSONObject? {
        val drafts = _depositStages.value
        if (!isStagedRental || drafts == null) return null
        val collect = stagedCollectNow().takeIf { it > 0 }?.let { _collectMethod.value to reference }
        return PaymentPlanRequest.body(drafts, _depositTemplateId.value, canEditStages, collect)
    }

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
        val multi = prefs.getString(MULTI_KEY_PREFIX + userId, null)
        val legacy = prefs.getString(KEY_PREFIX + userId, null)
        persistEnabled = false
        runCatching {
            when {
                multi != null -> applyCartsJson(JSONObject(multi))
                legacy != null -> applyLegacyDraftJson(JSONObject(legacy))
            }
        }.onFailure { android.util.Log.w("AnyRentCart", "Draft cart restore failed: ${it.message}") }
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
        _datesChosen.value = true
        syncRentalDays()
        persist()
    }
    fun setReturn(date: LocalDate) {
        _returnDate.value = if (date.isBefore(_pickupDate.value)) _pickupDate.value else date
        _datesChosen.value = true
        syncRentalDays()
        persist()
    }
    fun setNotes(value: String) {
        _notes.value = value
        persist()
    }

    /** #480: photos of the cart note (replaces the previous set; extra photos past the limit are dropped) */
    fun setNoteImageFiles(files: List<File>) {
        _noteImageFiles.value = files.take(com.anyrent.pos.domain.orders.OrderDetailLogic.MAX_NOTE_PHOTOS)
    }

    private fun dropNoteImages() {
        _noteImageFiles.value.forEach { runCatching { it.delete() } }
        _noteImageFiles.value = emptyList()
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
        depositManual = true
        persist()
    }

    /** iOS `Cart.depositAmount`: Σ item deposit × quantity */
    fun autoDeposit(lines: List<CartLine>): Double = lines.sumOf { it.product.deposit * it.quantity }

    private fun refreshAutoDeposit() {
        if (!depositManual) _depositAmount.value = autoDeposit(_lines.value)
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
                if (line.pricingType.equals("DAILY", ignoreCase = true) || line.blockTable != null) {
                    line.copy(rentalDays = days)
                } else line
            }
        }
    }

    /**
     * #951 (owner 2026-10-13): every add is a new line, even for a product already in the cart, so one unit can be
     * paid and another free. Earlier lines of the product still take its fresh prices (#473).
     */
    fun addProduct(product: Product, quantity: Int = 1) {
        val sale = _orderType.value == "SALE"
        val days = rentalDaysInclusive()
        _lines.update { current ->
            current.map { if (it.product.id == product.id) CartV2Logic.withFreshPricing(it, product) else it } +
                // #1189: a product whose default is its day-block table starts on it (iOS takes the default option's type)
                CartLine(
                    product = product, quantity = quantity, rentalDays = days, isSale = sale,
                    pricingType = if (ProductPricing.defaultMode(product) == PricingMode.BLOCK) "BLOCK" else product.pricingType,
                )
        }
        refreshAutoDeposit()
        persist()
    }

    /** #473 — lines of [product] take its current prices when it has both and they do not offer both yet */
    fun refreshPricing(product: Product) {
        val before = _lines.value
        val after = before.map { if (it.product.id == product.id) CartV2Logic.withFreshPricing(it, product) else it }
        if (after == before) return
        _lines.value = after
        persist()
    }

    /** #1189: see [CartV2Logic.refreshBlockTable] */
    fun refreshBlockTable(product: Product) {
        _lines.update { list -> list.map { CartV2Logic.refreshBlockTable(it, product) } }
        persist()
    }

    fun updateQuantity(lineId: String, quantity: Int) {
        if (quantity <= 0) {
            remove(lineId)
            return
        }
        _lines.update { list ->
            list.map { if (it.lineId == lineId) it.copy(quantity = quantity) else it }
        }
        refreshAutoDeposit()
        persist()
    }

    fun updateUnitPrice(lineId: String, price: Double) {
        _lines.update { list ->
            list.map {
                // #1189: a block line takes its price from the table
                if (it.lineId == lineId && it.blockTable == null) it.copy(unitPriceOverride = price.coerceAtLeast(0.0)) else it
            }
        }
        persist()
    }

    /** #684: the line's note from the "Ghi chú món" sheet; blank clears it */
    fun updateNote(lineId: String, note: String?) {
        val clean = com.anyrent.pos.domain.products.CartV2Logic.noteText(note)
        _lines.update { list -> list.map { if (it.lineId == lineId) it.copy(note = clean) else it } }
        persist()
    }

    fun updateRentalDays(lineId: String, days: Int) {
        val safe = days.coerceAtLeast(1)
        _lines.update { list ->
            list.map { if (it.lineId == lineId) it.copy(rentalDays = safe) else it }
        }
        persist()
    }

    /**
     * #482 "Áp dụng" of the pricing sheet: pricing type (rent) and the line price for this order only.
     * #951: 0 is a price (a free line); null (empty box) drops the typed price.
     */
    fun applyLinePricing(lineId: String, type: String?, price: Double?) {
        _lines.update { list ->
            list.map { line ->
                if (line.lineId != lineId) line
                else com.anyrent.pos.domain.products.CartV2Logic.applyPricing(line, type, price, rentalDaysInclusive())
            }
        }
        persist()
    }

    fun setPricingType(lineId: String, type: String) {
        val normalized = if (type.equals("DAILY", ignoreCase = true)) "DAILY" else "FIXED"
        _lines.update { list ->
            list.map { line ->
                if (line.lineId != lineId) return@map line
                // iOS CartItem.applyPricingOption: switching FIXED/DAILY also moves the
                // unit price to that option's catalog price so totals refresh.
                // When the catalog has that price, drop the override instead of pinning it:
                // CartLine.unitPrice then gives the same rent price, and a later switch to
                // SALE uses the sale price instead of this rent price (#373).
                // A mode the product has no price for has no price: the cart asks for one (#473, owner 2026-10-05;
                // iOS `selectPricingType`). #951: no 0 marker any more (0 is a price), the override is dropped and
                // CartV2Logic.hasPrice reads the catalog.
                line.copy(
                    pricingType = normalized,
                    rentalDays = rentalDaysInclusive(),
                    unitPriceOverride = null,
                )
            }
        }
        persist()
    }

    /** #1099 (iOS `ProductsCartBridge.removeOne`): the − of the Home row: one unit less on the product's last line; the line goes at 0 */
    fun removeOne(productId: Int) {
        val line = _lines.value.lastOrNull { it.product.id == productId } ?: return
        updateQuantity(line.lineId, line.quantity - 1)
    }

    fun remove(lineId: String) {
        _lines.update { it.filterNot { line -> line.lineId == lineId } }
        refreshAutoDeposit()
        persist()
    }

    /**
     * #677 "Huỷ sửa": leave edit mode with an empty cart (the saved draft too). Returns the order that was being
     * edited, to show again; null (and nothing cleared) when the cart was not editing (iOS `EditOrderSheetLogic.cancelEdit`).
     */
    fun cancelEdit(persistToDisk: Boolean = true): Int? {
        val orderId = _editingOrderId.value ?: return null
        clear(persistToDisk)
        return orderId
    }

    /**
     * The cart in use is done (order created, "Xoá giỏ", edit cancelled): it closes and the next one is used; with one
     * cart it is just emptied. `persistToDisk = false` is a logout / test reset: every cart is dropped from memory.
     */
    fun clear(persistToDisk: Boolean = true) {
        if (!persistToDisk) {
            resetAll()
            persistEnabled = false
            return
        }
        closeActiveCart()
        persist()
    }

    /** Every cart is dropped (outlet switch, logout) */
    fun clearAll(persistToDisk: Boolean = true) {
        resetAll()
        if (persistToDisk) persist() else persistEnabled = false
    }

    private fun resetAll() {
        slots.clear()
        slots.add(Slot(1))
        activeIdx = 0
        returnNumber = null
        resetActiveState()
        bump()
    }

    private fun resetActiveState() {
        dropNoteImages()
        _editingOrderId.value = null
        _editOriginal.value = null
        _bookingRequestId.value = null
        _bookingOutletId.value = null
        _lines.value = emptyList()
        _customer.value = null
        _notes.value = ""
        _discount.value = 0.0
        _discountType.value = DiscountType.AMOUNT
        _depositAmount.value = 0.0
        depositManual = false
        _depositStages.value = null
        _depositTemplateId.value = null
        _collectFirstStageNow.value = true
        _collectMethod.value = "CASH"
        _editHasDepositPlan.value = false
        _securityDeposit.value = 0.0
        _collateralDetails.value = ""
        _pickupDate.value = ShopTime.today()
        _returnDate.value = ShopTime.today().plusDays(1)
        _datesChosen.value = false
        _orderType.value = "RENT"
    }

    private fun closeActiveCart() {
        if (slots.size > 1) {
            // #1124: a booking cart opened beside a draft returns there too
            val wasEdit = isEditing || _bookingRequestId.value != null
            slots.removeAt(activeIdx)
            activeIdx = minOf(activeIdx, slots.size - 1)
            if (wasEdit) {
                val back = slots.indexOfFirst { it.number == returnNumber }
                if (back >= 0) activeIdx = back
            }
            returnNumber = null
            loadSlot(slots[activeIdx])
        } else {
            resetActiveState()
            slots[0].number = 1
        }
        bump()
    }

    // MARK: - Several carts (#1079)

    val cartCount: Int get() = slots.size
    val activeIndex: Int get() = activeIdx

    private fun bump() = _revision.update { it + 1 }

    private fun hasDraftContent() = _lines.value.isNotEmpty() || _customer.value != null || _editingOrderId.value != null ||
        _bookingRequestId.value != null

    /** Summaries of every cart, the one in use read live */
    fun cartSummaries(): List<CartSummary> = slots.mapIndexed { index, slot ->
        if (index == activeIdx) liveSummary(slot.number) else slot.summary ?: liveSummary(slot.number)
    }

    private fun liveSummary(number: Int): CartSummary {
        val customer = _customer.value
        val name = customer?.displayName
        val sale = _orderType.value == "SALE"
        val dates = if (!sale && _datesChosen.value) {
            "${_pickupDate.value.format(SHORT_DAY)} → ${_returnDate.value.format(SHORT_DAY)}"
        } else {
            null
        }
        return CartSummary(
            number = number,
            customerName = name,
            avatar = avatarText(customer, number),
            itemCount = itemCount,
            total = totalAmount,
            isSale = sale,
            dates = dates,
            editOrderNumber = if (isEditing) _editOriginal.value?.orderNumber?.takeIf { it.isNotBlank() } else null,
        )
    }

    private val SHORT_DAY: java.time.format.DateTimeFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yy")

    /** First letters of the first and last word of the customer name, else the cart number (iOS `avatarText`) */
    private fun avatarText(customer: Customer?, number: Int): String {
        val words = customer?.displayName?.trim()?.split(Regex("\\s+"))?.filter { it.isNotBlank() }.orEmpty()
        val first = words.firstOrNull()?.firstOrNull() ?: return number.toString()
        val last = words.takeIf { it.size > 1 }?.last()?.firstOrNull() ?: return first.uppercase()
        return "$first$last".uppercase()
    }

    private fun nextNumber(): Int = (1..MAX_CARTS + 1).first { n -> slots.none { it.number == n } }

    /** The cart in use is parked (snapshot + summary) while another one takes over the flows */
    private fun captureActive() {
        val slot = slots[activeIdx]
        slot.json = toJson()
        slot.summary = liveSummary(slot.number)
    }

    private fun loadSlot(slot: Slot) {
        dropNoteImages()
        val json = slot.json
        if (json != null) applyJson(json) else resetActiveState()
        slot.json = null
        slot.summary = null
    }

    /** A new empty cart, used at once. False at the limit. */
    fun newCart(): Boolean {
        if (slots.size >= MAX_CARTS) return false
        captureActive()
        slots.add(Slot(nextNumber()))
        activeIdx = slots.size - 1
        resetActiveState()
        persist()
        return true
    }

    fun switchCart(index: Int) {
        if (index !in slots.indices || index == activeIdx) return
        captureActive()
        activeIdx = index
        loadSlot(slots[index])
        persist()
    }

    /** The cart at `index` is removed; with only one cart it is just emptied */
    fun deleteCart(index: Int) {
        if (index !in slots.indices) return
        if (slots.size == 1) {
            resetActiveState()
            slots[0].number = 1
        } else {
            slots.removeAt(index)
            when {
                index < activeIdx -> activeIdx -= 1
                index == activeIdx -> {
                    activeIdx = minOf(index, slots.size - 1)
                    loadSlot(slots[activeIdx])
                }
            }
        }
        persist()
    }

    /** All carts as one JSON (what is saved to disk); the cart in use is read from the flows and stays where it is */
    internal fun cartsJson(): JSONObject {
        val array = JSONArray()
        slots.forEachIndexed { index, slot ->
            val cart = if (index == activeIdx) toJson() else slot.json
            array.put(JSONObject().put("number", slot.number).put("cart", cart))
        }
        return JSONObject().put("active", activeIdx).put("carts", array)
    }

    /** Restore what `cartsJson` saved */
    internal fun applyCartsJson(json: JSONObject) {
        val array = json.optJSONArray("carts") ?: return
        val restored = mutableListOf<Slot>()
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val cart = item.optJSONObject("cart") ?: continue
            restored.add(Slot(item.optInt("number", i + 1), cart))
        }
        if (restored.isEmpty()) return
        val active = json.optInt("active", 0).coerceIn(0, restored.size - 1)
        // summaries for the parked carts come from loading each one once
        restored.forEachIndexed { index, slot ->
            if (index != active) {
                applyJson(slot.json!!)
                slot.summary = liveSummary(slot.number)
            }
        }
        slots.clear()
        slots.addAll(restored)
        activeIdx = active
        returnNumber = null
        loadSlot(slots[activeIdx])
        bump()
    }

    /** A draft saved before several carts existed becomes the first cart */
    internal fun applyLegacyDraftJson(json: JSONObject) {
        slots.clear()
        slots.add(Slot(1))
        activeIdx = 0
        returnNumber = null
        applyJson(json)
        bump()
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
        val pickup = parseOrderDate(summary.pickupPlanAt) ?: ShopTime.today()
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
                note = item.note,
                // #1189: a block line keeps its saved table, so a changed date prices it again; a hand-typed price stays a plain price
                savedBlockTable = item.pricingSnapshot?.takeIf { !it.overridden && item.pricingType.equals("BLOCK", true) }?.table,
                blockCurrency = item.pricingSnapshot?.currency,
            )
        }

        // #1079: a draft in the cart in use stays; the edit gets its own cart (an empty cart, or an edit, is replaced)
        if (hasDraftContent() && !isEditing) {
            if (slots.size >= MAX_CARTS) throw CartLimitException()
            returnNumber = slots[activeIdx].number
            captureActive()
            slots.add(Slot(nextNumber()))
            activeIdx = slots.size - 1
        }
        // Assign after building so collectors never see a cleared mid-load cart.
        dropNoteImages()
        _editingOrderId.value = summary.id
        _editOriginal.value = EditOrderSheet.Original(
            orderNumber = summary.orderNumber,
            pickup = if (sale) null else pickup,
            returnDate = if (sale) null else ret,
            lines = EditOrderSheet.lines(mappedLines, sale),
            paid = detail.payments.sumOf { it.amount },
            status = summary.status,
            payments = detail.payments.map { com.anyrent.pos.domain.orders.BalancePayment(it.amount, it.status, it.notes) },
        )
        _orderType.value = if (sale) "SALE" else "RENT"
        _pickupDate.value = pickup
        _returnDate.value = ret
        _datesChosen.value = true
        _notes.value = summary.notes.orEmpty()
        _collateralDetails.value = detail.collateralDetails.orEmpty()
        _depositAmount.value = summary.depositAmount.takeUnless { it.isNaN() } ?: 0.0
        depositManual = true
        _editHasDepositPlan.value = summary.hasDepositPlan == true // #1199
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

        // Logging only; no android.util.Log in JVM unit tests (#677)
        runCatching {
            android.util.Log.i(
                "AnyRentCart",
                "Loaded order #${summary.orderNumber} id=${summary.id} " +
                    "lines=${mappedLines.size} customer=${customer?.id} " +
                    "deposit=${summary.depositAmount} security=${detail.securityDeposit}",
            )
        }
        persistToDisk()
    }

    /**
     * #1124 "Xác nhận" of an online booking: a rent cart with the customer, the shop days, the note and the items at
     * the product's rent price (a product the app could not load keeps its line at 0). A draft in the cart in use
     * stays and the booking gets its own cart; creating the order returns there. False at the cart limit (nothing
     * changes). iOS `CartStore.startBookingCart` + `BookingCartBuilder`.
     */
    fun startBookingCart(
        prepare: com.anyrent.pos.domain.booking.BookingPrepare,
        products: Map<Int, Product>,
    ): Boolean {
        if (hasDraftContent() || _bookingRequestId.value != null) {
            if (slots.size >= MAX_CARTS) return false
            returnNumber = slots[activeIdx].number
            captureActive()
            slots.add(Slot(nextNumber()))
            activeIdx = slots.size - 1
        }
        resetActiveState()
        _orderType.value = "RENT"
        _customer.value = prepare.customer?.let {
            Customer(id = it.id, firstName = it.firstName, lastName = it.lastName, phone = it.phone, email = null, address = null)
        }
        val pickup = parseOrderDate(prepare.pickupPlanAt) ?: ShopTime.today()
        val ret = parseOrderDate(prepare.returnPlanAt)?.takeUnless { it.isBefore(pickup) } ?: pickup
        _pickupDate.value = pickup
        _returnDate.value = ret
        _datesChosen.value = true
        _notes.value = prepare.notes.orEmpty()
        _bookingRequestId.value = prepare.bookingRequestId.takeIf { it > 0 }
        _bookingOutletId.value = prepare.outletId
        val days = rentalDaysInclusive()
        _lines.value = prepare.items.map { item ->
            val product = products[item.productId] ?: Product(
                id = item.productId,
                name = item.productName.ifBlank { "Product #${item.productId}" },
                barcode = null, rentPrice = 0.0, salePrice = null, stock = 0, available = 0, renting = 0,
                categoryId = null, categoryName = null, imageUrl = null,
            )
            CartLine(product = product, quantity = item.quantity.coerceAtLeast(1), rentalDays = days, isSale = false)
        }
        syncRentalDays()
        refreshAutoDeposit()
        persistToDisk()
        return true
    }

    fun persistToDisk() {
        bump()
        if (!persistEnabled || !::prefs.isInitialized) return
        val userId = SessionStore.userId ?: return
        val key = MULTI_KEY_PREFIX + userId
        // One empty cart is the default; only drafts worth keeping are saved
        val hasDraft = slots.size > 1 || hasDraftContent()
        val editor = prefs.edit()
        if (!hasDraft) {
            editor.remove(key).remove(KEY_PREFIX + userId).commit()
            return
        }
        editor.putString(key, cartsJson().toString()).remove(KEY_PREFIX + userId).commit()
    }

    /** #888 the saved draft, for tests */
    internal fun draftJson(): JSONObject = toJson()

    /** #888 restore a saved draft, for tests */
    internal fun applyDraftJson(json: JSONObject) = applyJson(json)

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
                        .put("isDefault", option.isDefault)
                        .apply {
                            option.blockTable?.let { t ->
                                put("blockTiers", JSONArray(t.tiers)); put("blockStartDay", t.startDay)
                                put("blockExtraMode", t.extraMode); t.extraPrice?.let { e -> put("blockExtraPrice", e) }
                            }
                        },
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
                // #888: Giá vốn of the line survives a relaunch (iOS CartItem.costPrice)
                .put("costPrice", line.product.costPrice ?: JSONObject.NULL)
                .put("pricingType", line.product.pricingType)
                .put("note", line.product.note ?: JSONObject.NULL)
                .put("pricingOptions", options)
            linesJson.put(
                JSONObject()
                    .put("lineId", line.lineId)
                    .put("itemNote", line.note ?: JSONObject.NULL)
                    .put("quantity", line.quantity)
                    .put("rentalDays", line.rentalDays)
                    .put("isSale", line.isSale)
                    .put("pricingType", line.pricingType)
                    .put("unitPriceOverride", line.unitPriceOverride ?: JSONObject.NULL)
                    // #1189: the table of a line loaded from a saved order
                    .apply {
                        line.savedBlockTable?.let { t ->
                            put("savedBlock", BlockPricing.optionJson(t, false))
                            line.blockCurrency?.let { c -> put("blockCurrency", c) }
                        }
                    }
                    .put("product", product),
            )
        }
        return JSONObject()
            .put("editingOrderId", _editingOrderId.value ?: JSONObject.NULL)
            .put("editOriginal", _editOriginal.value?.let(::editOriginalJson) ?: JSONObject.NULL)
            .put("bookingRequestId", _bookingRequestId.value ?: JSONObject.NULL)
            .put("bookingOutletId", _bookingOutletId.value ?: JSONObject.NULL)
            .put("orderType", _orderType.value)
            .put("pickup", _pickupDate.value.toString())
            .put("return", _returnDate.value.toString())
            .put("datesChosen", _datesChosen.value)
            .put("notes", _notes.value)
            .put("discount", _discount.value)
            .put("discountType", _discountType.value.name)
            .put("deposit", _depositAmount.value)
            .put("depositManual", depositManual)
            .put("editHasDepositPlan", _editHasDepositPlan.value)
            .put("security", _securityDeposit.value)
            .put("collateral", _collateralDetails.value)
            .put("customer", customerJson ?: JSONObject.NULL)
            .put("lines", linesJson)
    }

    private fun applyJson(json: JSONObject) {
        _editingOrderId.value = json.optInt("editingOrderId", 0).takeIf { it > 0 }
        // A draft saved before #676 has no snapshot: no "Đã đổi" tags, title without a number
        _editOriginal.value = json.optJSONObject("editOriginal")?.takeIf { _editingOrderId.value != null }?.let(::parseEditOriginal)
        _bookingRequestId.value = json.optInt("bookingRequestId", 0).takeIf { it > 0 }
        _bookingOutletId.value = json.optInt("bookingOutletId", 0).takeIf { it > 0 }
        _orderType.value = json.optString("orderType").ifBlank { "RENT" }
        _pickupDate.value = runCatching { LocalDate.parse(json.optString("pickup")) }.getOrDefault(ShopTime.today())
        _returnDate.value = runCatching { LocalDate.parse(json.optString("return")) }.getOrDefault(ShopTime.today().plusDays(1))
        // A draft saved before #448 has no flag: keep its dates as chosen
        _datesChosen.value = !json.has("datesChosen") || json.optBoolean("datesChosen")
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
                    type = PricingTypes.normalizeOption(option.optString("type")),
                    price = option.optDouble("price", 0.0),
                    isDefault = option.optBoolean("isDefault"),
                    blockTable = BlockPricing.tableFrom(option),
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
                pricingType = PricingTypes.normalize(productJson.optString("pricingType")),
                pricingOptions = options,
                costPrice = if (!productJson.has("costPrice") || productJson.isNull("costPrice")) null else productJson.optDouble("costPrice"),
                note = productJson.optString("note").takeIf { it.isNotBlank() && it != "null" },
            )
            // #951: a draft saved before line ids used an override of 0 as "ask for a price"; 0 is a price now
            val savedLineId = line.optString("lineId").takeIf { line.has("lineId") && it.isNotBlank() && it != "null" }
            val override = (if (line.isNull("unitPriceOverride")) null else line.optDouble("unitPriceOverride"))
                ?.takeUnless { savedLineId == null && _editingOrderId.value == null && it == 0.0 }
            CartLine(
                lineId = savedLineId ?: java.util.UUID.randomUUID().toString(),
                product = product,
                quantity = line.optInt("quantity", 1).coerceAtLeast(1),
                rentalDays = line.optInt("rentalDays", 1).coerceAtLeast(1),
                isSale = line.optBoolean("isSale"),
                pricingType = PricingTypes.normalizeOption(line.optString("pricingType").ifBlank { product.pricingType }),
                note = line.optString("itemNote").takeIf { it.isNotBlank() && it != "null" },
                unitPriceOverride = override,
                savedBlockTable = line.optJSONObject("savedBlock")?.let { BlockPricing.tableFrom(it) },
                blockCurrency = line.optString("blockCurrency").takeIf { it.isNotBlank() && it != "null" },
            )
        }
        // A draft saved before #388 has no flag: keep its deposit when it differs from the items' sum
        depositManual = if (json.has("depositManual")) json.optBoolean("depositManual")
        else _depositAmount.value != autoDeposit(_lines.value)
        _editHasDepositPlan.value = json.optBoolean("editHasDepositPlan", false)
        _depositStages.value = null
        _depositTemplateId.value = null
    }

    private fun editOriginalJson(original: EditOrderSheet.Original): JSONObject {
        val lines = JSONArray()
        original.lines.forEach { line ->
            lines.put(
                JSONObject()
                    .put("productId", line.productId)
                    .put("quantity", line.quantity)
                    .put("unitPrice", line.unitPrice)
                    .put("pricingType", line.pricingType),
            )
        }
        return JSONObject()
            .put("orderNumber", original.orderNumber)
            .put("pickup", original.pickup?.toString() ?: JSONObject.NULL)
            .put("return", original.returnDate?.toString() ?: JSONObject.NULL)
            .put("paid", original.paid)
            .put("lines", lines)
            .put("status", original.status)
            .apply {
                original.payments?.let { payments ->
                    put("payments", JSONArray().apply {
                        payments.forEach { put(JSONObject().put("amount", it.amount).put("status", it.status ?: JSONObject.NULL).put("notes", it.notes ?: JSONObject.NULL)) }
                    })
                }
            }
    }

    private fun parseEditOriginal(json: JSONObject): EditOrderSheet.Original? = runCatching {
        val lines = json.optJSONArray("lines") ?: JSONArray()
        EditOrderSheet.Original(
            orderNumber = json.optString("orderNumber"),
            pickup = json.optString("pickup").takeIf { it.isNotBlank() && it != "null" }?.let(LocalDate::parse),
            returnDate = json.optString("return").takeIf { it.isNotBlank() && it != "null" }?.let(LocalDate::parse),
            lines = (0 until lines.length()).mapNotNull { index ->
                val line = lines.optJSONObject(index) ?: return@mapNotNull null
                EditOrderSheet.Line(
                    productId = line.optInt("productId"),
                    quantity = line.optInt("quantity"),
                    unitPrice = line.optDouble("unitPrice", 0.0),
                    pricingType = line.optString("pricingType"),
                )
            },
            paid = json.optDouble("paid", 0.0),
            status = json.optString("status"),
            payments = json.optJSONArray("payments")?.let { payments ->
                (0 until payments.length()).mapNotNull { index ->
                    val payment = payments.optJSONObject(index) ?: return@mapNotNull null
                    com.anyrent.pos.domain.orders.BalancePayment(
                        amount = payment.optDouble("amount", 0.0),
                        status = payment.optString("status").takeIf { !payment.isNull("status") },
                        notes = payment.optString("notes").takeIf { !payment.isNull("notes") },
                    )
                }
            },
        )
    }.getOrNull()

    /** Shop day (#602), the same zone the cart sends with `isoPickup` / `isoReturn` (#413) */
    private fun parseOrderDate(raw: String?): LocalDate? = OrderPlanDays.dayOf(raw)

    fun isoPickup(): String = OrderPlanDays.pickupInstant(_pickupDate.value)
    fun isoReturn(): String = OrderPlanDays.returnInstant(_returnDate.value)
}

/** #1079: all 10 carts are open, so an order cannot be opened for editing */
class CartLimitException : IllegalStateException("cart_limit")
