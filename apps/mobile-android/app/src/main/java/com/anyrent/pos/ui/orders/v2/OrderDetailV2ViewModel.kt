package com.anyrent.pos.ui.orders.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.OrderPhotoUploader
import com.anyrent.pos.data.OrderPhotos
import com.anyrent.pos.data.failedCount
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.orders.OrderPhotoField
import com.anyrent.pos.domain.orders.OrderPhotoLogic
import com.anyrent.pos.domain.orders.StatusErrorOutcome
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/** Order reads and writes of the detail screen; replaceable in tests */
interface OrderDetailSource {
    suspend fun load(id: Int): Result<OrderDetail>
    suspend fun changeStatus(id: Int, status: String): Result<Unit>
    /** #1199 cancelling an order with deposit stages: the shop keeps [keptAmount] of what was collected (0 = refund all) */
    suspend fun cancel(id: Int, keptAmount: Double, note: String?): Result<Unit> = changeStatus(id, "CANCELLED")
    /** RESERVED → PICKUPED with the optional papers / security deposit of the sheet (#427) */
    suspend fun handOver(id: Int, fields: HandOverFields): Result<Unit>
    suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double): Result<Unit>
    /** #1279: papers and collateral after pick-up, status unchanged */
    suspend fun saveCollateral(id: Int, fields: HandOverFields): Result<Unit> =
        Result.failure(UnsupportedOperationException())
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

    override suspend fun cancel(id: Int, keptAmount: Double, note: String?) =
        withContext(Dispatchers.IO) { ApiClient.get().updateOrderStatus(id, "CANCELLED", cancelKeptAmount = keptAmount, cancelNote = note).map { } }

    override suspend fun handOver(id: Int, fields: HandOverFields) =
        withContext(Dispatchers.IO) { ApiClient.get().updateOrderStatus(id, "PICKUPED", fields).map { } }

    override suspend fun saveCollateral(id: Int, fields: HandOverFields) =
        withContext(Dispatchers.IO) { ApiClient.get().updateOrderCollateral(id, fields) }

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
    /** #1418 photos chosen in the hand-over sheet, kept when a confirm fails so nothing has to be taken again */
    val pickupDraft: List<ByteArray> = emptyList(),
    /** Photos being compressed for the sheet */
    val pickupCompressing: Int = 0,
    /** Photos of this order waiting on the device (faded on the detail) */
    val pickupWaiting: List<File> = emptyList(),
    /** A failed upload: how many photos the warning under the status names */
    val pickupFailedCount: Int? = null,
)

class OrderDetailV2ViewModel(
    private val orderId: Int,
    private val source: OrderDetailSource,
    private val photos: OrderPhotoUploader? = OrderPhotos.uploader,
    /** #674: tells Orders, Calendar and Overview that an order changed */
    private val ordersChanged: () -> Unit = OrdersChanged::notifyChanged,
) : ViewModel() {
    private val _state = MutableStateFlow(OrderDetailUiState())
    val state: StateFlow<OrderDetailUiState> = _state.asStateFlow()

    init {
        load()
        // #1418 an upload moved on: redraw; once it is through, read the order for the new photos
        photos?.let { uploader ->
            viewModelScope.launch {
                uploader.changes.collect { change ->
                    if (change.orderId != orderId) return@collect
                    syncPhotos()
                    if (change.finished) reload()
                }
            }
        }
    }

    private fun syncPhotos() {
        val uploader = photos ?: return
        val waiting = uploader.pending(orderId, OrderPhotoField.PICKUP)?.files.orEmpty()
        val failed = uploader.state(orderId, OrderPhotoField.PICKUP).failedCount(waiting.size)
        _state.update { it.copy(pickupWaiting = waiting, pickupFailedCount = failed) }
    }

    /** Opening the order and "Thử lại": photos left from a failed upload or a relaunch go out */
    fun retryPickupPhotos() {
        photos?.resume(orderId, OrderPhotoField.PICKUP)
        syncPhotos()
    }

    fun pickupPhotoCompressing(count: Int) = _state.update { it.copy(pickupCompressing = it.pickupCompressing + count) }

    /** The sheet's photos; [count] compressions finished */
    fun addPickupDraft(bytes: List<ByteArray>, count: Int) = _state.update {
        val room = OrderPhotoLogic.MAX_PHOTOS - it.pickupDraft.size
        it.copy(pickupDraft = it.pickupDraft + bytes.take(room), pickupCompressing = (it.pickupCompressing - count).coerceAtLeast(0))
    }

    fun removePickupDraft(index: Int) = _state.update {
        it.copy(pickupDraft = it.pickupDraft.filterIndexed { i, _ -> i != index })
    }

    fun clearPickupDraft() = _state.update { it.copy(pickupDraft = emptyList()) }

    /** "Thêm" on the detail: queued at once, like the photos of the sheet */
    fun addPickupPhotosNow(bytes: List<ByteArray>) {
        val baseline = _state.value.detail?.pickupNotesImages?.size ?: return
        val room = OrderPhotoLogic.MAX_PHOTOS - baseline
        if (room <= 0) return
        photos?.add(orderId, OrderPhotoField.PICKUP, baseline, bytes.take(room))
        syncPhotos()
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
        if (result.isSuccess) retryPickupPhotos()
        return result.getOrNull()
    }

    /** PUT status; [onDone] gets true on success. A 4xx shows its message and reloads the order. */
    fun changeStatus(status: String, onDone: (Boolean) -> Unit = {}) =
        runStatusChange(onDone) { source.changeStatus(orderId, status) }

    /** #1199: cancel keeping part of the money collected (owner / outlet admin); 0 = refund everything, as before */
    fun cancel(keptAmount: Double, note: String?, onDone: (Boolean) -> Unit = {}) =
        runStatusChange(onDone) { source.cancel(orderId, keptAmount, note) }

    /** #1199: a stage was collected, voided or the plan edited: tell the lists and reload; [onReloaded] gets the fresh order */
    fun depositChanged(onReloaded: (OrderDetail?) -> Unit = {}) {
        ordersChanged()
        reloadThen(onReloaded)
    }

    /** Reload the order, then run [onReloaded] with it (null when the reload failed) */
    fun reloadThen(onReloaded: (OrderDetail?) -> Unit) {
        viewModelScope.launch { onReloaded(reload()) }
    }

    /** Hand-over: papers and deposit are optional; empty fields still hand the order over (#427) */
    fun handOver(fields: HandOverFields, onDone: (Boolean) -> Unit = {}) {
        val baseline = _state.value.detail?.pickupNotesImages?.size ?: 0
        runStatusChange(onDone) {
            source.handOver(orderId, fields).onSuccess {
                // #1418 the status went through; the photos follow on their own and cannot undo it
                val chosen = _state.value.pickupDraft
                if (chosen.isNotEmpty()) photos?.add(orderId, OrderPhotoField.PICKUP, baseline, chosen)
                clearPickupDraft()
                syncPhotos()
            }
        }
    }

    /** #1279: edit papers and collateral of a picked-up order; the money at return is read again from the reloaded order */
    fun saveCollateral(fields: HandOverFields, onDone: (Boolean) -> Unit = {}) =
        runStatusChange(onDone) { source.saveCollateral(orderId, fields) }

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
