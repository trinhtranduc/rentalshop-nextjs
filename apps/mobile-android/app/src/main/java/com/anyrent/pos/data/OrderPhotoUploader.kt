package com.anyrent.pos.data

import android.content.Context
import com.anyrent.pos.domain.orders.OrderPhotoDecision
import com.anyrent.pos.domain.orders.OrderPhotoField
import com.anyrent.pos.domain.orders.OrderPhotoLogic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import java.io.File
import java.util.concurrent.ConcurrentHashMap

enum class OrderPhotoUploadState { IDLE, UPLOADING, FAILED }

/** How many photos the warning under the status names. Null while a retry runs, so there is one way to start one. */
fun OrderPhotoUploadState.failedCount(waiting: Int): Int? =
    waiting.takeIf { this == OrderPhotoUploadState.FAILED && it > 0 }

/** #1418 sends the queued condition photos of an order. It outlives the detail screen, which only shows its state. */
class OrderPhotoUploader(
    private val queue: OrderPhotoQueue,
    private val scopeKey: () -> String?,
    private val loadServerCount: suspend (Int, OrderPhotoField) -> Int?,
    private val send: suspend (Int, OrderPhotoField, List<ByteArray>) -> Boolean,
    private val coroutines: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) {
    data class Change(val orderId: Int, val finished: Boolean)

    private val states = ConcurrentHashMap<String, OrderPhotoUploadState>()
    private val _changes = MutableSharedFlow<Change>(extraBufferCapacity = 16)
    val changes: SharedFlow<Change> = _changes.asSharedFlow()

    private fun key(scope: String, orderId: Int, field: OrderPhotoField) = "$scope/$orderId/${field.apiName}"

    /** What the current login has waiting for this order */
    fun pending(orderId: Int, field: OrderPhotoField): OrderPhotoQueue.Entry? =
        scopeKey()?.let { queue.entry(it, orderId, field) }

    fun state(orderId: Int, field: OrderPhotoField): OrderPhotoUploadState =
        scopeKey()?.let { states[key(it, orderId, field)] } ?: OrderPhotoUploadState.IDLE

    /** Keeps the photos on disk, then starts sending. False when they could not be saved */
    fun add(orderId: Int, field: OrderPhotoField, baseline: Int, photos: List<ByteArray>): Boolean {
        val scope = scopeKey() ?: return false
        if (photos.isEmpty()) return false
        runCatching { queue.enqueue(scope, orderId, field, baseline, photos) }.onFailure { return false }
        resume(orderId, field)
        return true
    }

    /** Opening the order and "Thử lại" both land here. The order is read first: see [OrderPhotoLogic.decide]. */
    fun resume(orderId: Int, field: OrderPhotoField) {
        val scope = scopeKey() ?: return
        val entry = queue.entry(scope, orderId, field) ?: return
        val stateKey = key(scope, orderId, field)
        // Atomic: two callers cannot both start
        val previous = states.put(stateKey, OrderPhotoUploadState.UPLOADING)
        if (previous == OrderPhotoUploadState.UPLOADING) return
        _changes.tryEmit(Change(orderId, finished = false))
        coroutines.launch {
            val serverCount = runCatching { loadServerCount(orderId, field) }.getOrNull()
            if (serverCount == null) {
                fail(stateKey, orderId)
                return@launch
            }
            when (val decision = OrderPhotoLogic.decide(serverCount, entry.baseline, entry.files.size)) {
                OrderPhotoDecision.AlreadyUploaded, OrderPhotoDecision.NoRoom -> finish(entry, stateKey)
                is OrderPhotoDecision.Send -> {
                    val sent = runCatching {
                        send(orderId, field, entry.files.take(decision.count).map(File::readBytes))
                    }.getOrDefault(false)
                    if (sent) finish(entry, stateKey) else fail(stateKey, orderId)
                }
            }
        }
    }

    private fun finish(entry: OrderPhotoQueue.Entry, stateKey: String) {
        queue.remove(entry.scope, entry.orderId, entry.field)
        states.remove(stateKey)
        _changes.tryEmit(Change(entry.orderId, finished = true))
    }

    private fun fail(stateKey: String, orderId: Int) {
        states[stateKey] = OrderPhotoUploadState.FAILED
        _changes.tryEmit(Change(orderId, finished = false))
    }
}

/** The app's uploader; null in unit tests of other screens */
object OrderPhotos {
    @Volatile
    var uploader: OrderPhotoUploader? = null
        private set

    fun init(context: Context) {
        if (uploader != null) return
        uploader = OrderPhotoUploader(
            queue = OrderPhotoQueue(File(context.filesDir, "order-photos")),
            scopeKey = {
                SessionStore.userId?.takeIf { SessionStore.accessToken != null }
                    ?.let { OrderPhotoQueue.scope(it, SessionStore.merchantId) }
            },
            loadServerCount = { orderId, field ->
                ApiClient.get().getOrder(orderId).getOrNull()?.let { detail ->
                    when (field) {
                        OrderPhotoField.PICKUP -> detail.pickupNotesImages.size
                    }
                }
            },
            send = { orderId, field, photos ->
                ApiParity.uploadOrderPhotos(orderId, field, photos).isSuccess
            },
        )
    }
}
