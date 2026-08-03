package com.anyrent.shared.model

/** Shared domain enums — keep in sync with backend order system. */
enum class SharedOrderType { RENT, SALE }

enum class SharedOrderStatus {
    RESERVED,
    PICKUPED,
    RETURNED,
    COMPLETED,
    CANCELLED,
}

object OrderStatusFlow {
    fun next(type: SharedOrderType, status: SharedOrderStatus): List<SharedOrderStatus> =
        when {
            status == SharedOrderStatus.CANCELLED ||
                status == SharedOrderStatus.RETURNED ||
                status == SharedOrderStatus.COMPLETED -> emptyList()
            type == SharedOrderType.SALE && status == SharedOrderStatus.RESERVED ->
                listOf(SharedOrderStatus.COMPLETED, SharedOrderStatus.CANCELLED)
            type == SharedOrderType.RENT && status == SharedOrderStatus.RESERVED ->
                listOf(SharedOrderStatus.PICKUPED, SharedOrderStatus.CANCELLED)
            type == SharedOrderType.RENT && status == SharedOrderStatus.PICKUPED ->
                listOf(SharedOrderStatus.RETURNED, SharedOrderStatus.CANCELLED)
            else -> listOf(SharedOrderStatus.CANCELLED)
        }
}
