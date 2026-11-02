package com.anyrent.pos.domain.orders

/** The existing multipart field of `PUT /api/orders/{id}` (#1418) */
enum class OrderPhotoField(val apiName: String) {
    PICKUP("pickupNotesImages"),
}

sealed interface OrderPhotoDecision {
    /** A lost reply: the earlier request went through. There is no idempotency key, so never send again */
    data object AlreadyUploaded : OrderPhotoDecision
    /** The order already holds the limit */
    data object NoRoom : OrderPhotoDecision
    data class Send(val count: Int) : OrderPhotoDecision
}

/** #1418 condition photos of an order: same rule as iOS `OrderPhotoLogic` */
object OrderPhotoLogic {
    /** Owner's limit; the API allows 5 per field. */
    const val MAX_PHOTOS = 3

    fun canAdd(count: Int): Boolean = count < MAX_PHOTOS

    fun countLabel(count: Int): String = "$count/$MAX_PHOTOS"

    /**
     * A multipart PUT is all or nothing, so our own lost request shows as growth of at least [pending].
     * Smaller growth came from another device: our photos are still unsent.
     */
    fun decide(serverCount: Int, baseline: Int, pending: Int): OrderPhotoDecision {
        if (serverCount - baseline >= pending) return OrderPhotoDecision.AlreadyUploaded
        val room = MAX_PHOTOS - serverCount
        return if (room > 0) OrderPhotoDecision.Send(minOf(pending, room)) else OrderPhotoDecision.NoRoom
    }

    /** #1419 the return sheet only shows the hand-over photos; with none it stays as it was */
    fun returnSheetShowsPhotos(serverCount: Int, waiting: Int): Boolean = serverCount + waiting > 0

    /** "Thêm" on the order detail: only while the goods are out, and not when the block would be new on the screen */
    fun canAddLater(status: String?, serverCount: Int, pendingCount: Int, canUpdateOrders: Boolean): Boolean =
        status.equals("PICKUPED", ignoreCase = true) && canUpdateOrders && pendingCount == 0 &&
            serverCount > 0 && canAdd(serverCount)
}
