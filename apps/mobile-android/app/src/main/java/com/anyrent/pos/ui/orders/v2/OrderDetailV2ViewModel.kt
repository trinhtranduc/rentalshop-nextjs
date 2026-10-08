package com.anyrent.pos.ui.orders.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.orders.StatusErrorOutcome
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Order reads and writes of the detail screen; replaceable in tests */
interface OrderDetailSource {
    suspend fun load(id: Int): Result<OrderDetail>
    suspend fun changeStatus(id: Int, status: String): Result<Unit>
    /** RESERVED → PICKUPED with the optional papers / security deposit of the sheet (#427) */
    suspend fun handOver(id: Int, fields: HandOverFields): Result<Unit>
    suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double): Result<Unit>
    /** "Sẵn sàng giao" (#470): the same `PUT /api/orders/{id}` the old detail sends */
    suspend fun setReadyToDeliver(id: Int, ready: Boolean): Result<Unit>
    suspend fun saveNotes(
        id: Int,
        notes: String,
        original: List<String>,
        kept: List<String>,
        newImages: List<ByteArray>,
    ): Result<Unit>
}

object ApiOrderDetailSource : OrderDetailSource {
    override suspend fun load(id: Int) = withContext(Dispatchers.IO) { ApiClient.get().getOrder(id) }

    override suspend fun changeStatus(id: Int, status: String) =
        withContext(Dispatchers.IO) { ApiClient.get().updateOrderStatus(id, status).map { } }

    override suspend fun handOver(id: Int, fields: HandOverFields) =
        withContext(Dispatchers.IO) { ApiClient.get().updateOrderStatus(id, "PICKUPED", fields).map { } }

    override suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double) =
        withContext(Dispatchers.IO) { ApiParity.updateOrderFees(id, lateFee, damageFee) }

    override suspend fun setReadyToDeliver(id: Int, ready: Boolean) =
        withContext(Dispatchers.IO) { ApiParity.setReadyToDeliver(id, ready) }

    override suspend fun saveNotes(
        id: Int,
        notes: String,
        original: List<String>,
        kept: List<String>,
        newImages: List<ByteArray>,
    ) = withContext(Dispatchers.IO) {
        ApiParity.updateOrderDetails(
            id = id,
            notes = notes,
            noteImages = newImages,
            existingNoteImageUrls = original,
            keptNoteImageUrls = kept,
            maxNoteImages = OrderDetailLogic.MAX_NOTE_PHOTOS,
        )
    }
}

data class OrderDetailUiState(
    val loading: Boolean = true,
    val detail: OrderDetail? = null,
    val loadError: String? = null,
    val busy: Boolean = false,
    /** A rejected status change; the screen shows it, the order has been reloaded when [StatusErrorOutcome.reload] */
    val statusError: StatusErrorOutcome? = null,
    /** The "Sẵn sàng giao" switch is saving (#470) */
    val savingReady: Boolean = false,
)

class OrderDetailV2ViewModel(
    private val orderId: Int,
    private val source: OrderDetailSource,
    /** #674: tells Orders, Calendar and Overview that an order changed */
    private val ordersChanged: () -> Unit = OrdersChanged::notifyChanged,
) : ViewModel() {
    private val _state = MutableStateFlow(OrderDetailUiState())
    val state: StateFlow<OrderDetailUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch { reload() }
    }

    private suspend fun reload(): OrderDetail? {
        _state.update { it.copy(loading = it.detail == null, loadError = null) }
        val result = source.load(orderId)
        _state.update {
            it.copy(
                loading = false,
                detail = result.getOrNull() ?: it.detail,
                loadError = result.exceptionOrNull()?.let { e -> AppError.from(e).message },
            )
        }
        return result.getOrNull()
    }

    /** PUT status; [onDone] gets true on success. A 4xx shows its message and reloads the order. */
    fun changeStatus(status: String, onDone: (Boolean) -> Unit = {}) =
        runStatusChange(onDone) { source.changeStatus(orderId, status) }

    /** Hand-over: papers and deposit are optional; empty fields still hand the order over (#427) */
    fun handOver(fields: HandOverFields, onDone: (Boolean) -> Unit = {}) =
        runStatusChange(onDone) { source.handOver(orderId, fields) }

    private fun runStatusChange(onDone: (Boolean) -> Unit, call: suspend () -> Result<Unit>) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            val result = call()
            if (result.isSuccess) ordersChanged()
            val failure = result.exceptionOrNull()?.let(OrderDetailLogic::statusError)
            _state.update { it.copy(busy = false, statusError = failure) }
            if (failure == null || failure.reload) reload()
            onDone(failure == null)
        }
    }

    /**
     * Return (board Nhan-tra): saves the fees when they changed, then RETURNED. Like iOS, no payment is
     * recorded; the API works the balance out (owner 2026-10-05, #448).
     */
    fun takeReturn(lateFee: Double, damageFee: Double, onError: (Throwable) -> Unit, onDone: (Boolean) -> Unit = {}) {
        if (_state.value.busy) return
        val current = _state.value.detail
        viewModelScope.launch {
            if (current == null || lateFee != current.lateFee || damageFee != current.damageFee) {
                saveFees(lateFee, damageFee).exceptionOrNull()?.let {
                    onError(it)
                    return@launch
                }
            }
            changeStatus("RETURNED", onDone)
        }
    }

    /** Saves fees set in the return sheet and returns the reloaded order (for the payment amount) */
    suspend fun saveFees(lateFee: Double, damageFee: Double): Result<OrderDetail> {
        _state.update { it.copy(busy = true) }
        val saved = source.saveFees(orderId, lateFee, damageFee)
        if (saved.isSuccess) ordersChanged()
        val detail = if (saved.isSuccess) reload() else null
        _state.update { it.copy(busy = false) }
        saved.exceptionOrNull()?.let { return Result.failure(it) }
        return detail?.let { Result.success(it) } ?: Result.failure(AppError.Unknown("Could not reload order"))
    }

    fun saveNotes(
        notes: String,
        kept: List<String>,
        newImages: List<ByteArray>,
        onDone: (String?) -> Unit,
    ) {
        val original = _state.value.detail?.notesImages.orEmpty()
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            val result = source.saveNotes(orderId, notes, original, kept, newImages)
            _state.update { it.copy(busy = false) }
            if (result.isSuccess) {
                ordersChanged()
                reload()
            }
            onDone(result.exceptionOrNull()?.let { AppError.from(it).message })
        }
    }

    /**
     * "Sẵn sàng giao" (#470): saves at once, then reloads so the orders list shows or hides "Chưa soạn đồ".
     * [onDone] gets null on success or the error message; the switch then falls back to the order's value.
     */
    fun setReadyToDeliver(ready: Boolean, onDone: (String?) -> Unit) {
        if (_state.value.savingReady) return
        _state.update { it.copy(savingReady = true) }
        viewModelScope.launch {
            val result = source.setReadyToDeliver(orderId, ready)
            if (result.isSuccess) {
                ordersChanged()
                reload()
            }
            _state.update { it.copy(savingReady = false) }
            onDone(result.exceptionOrNull()?.let { AppError.from(it).message })
        }
    }

    fun dismissStatusError() = _state.update { it.copy(statusError = null) }

    /** Extend (board Gia-han) saved by its sheet: signal it (#674) and show the new dates */
    fun extended() {
        ordersChanged()
        load()
    }

    /** The order was deleted from the screen (#674) */
    fun deleted() = ordersChanged()

    class Factory(
        private val orderId: Int,
        private val source: OrderDetailSource = ApiOrderDetailSource,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            OrderDetailV2ViewModel(orderId, source) as T
    }
}
