package com.anyrent.pos.ui.orders.v2

import androidx.annotation.StringRes
import com.anyrent.pos.R
import com.anyrent.pos.ui.theme.DS

/**
 * #482 — one status tag for the order list rows and the order detail header (board CT-gon): the same text
 * (Đã đặt / Đang thuê / Đã trả / Hoàn thành / Đã huỷ) and colours everywhere (iOS `OrdersHomeLogic.statusTag`).
 */
object OrderStatusTag {
    @StringRes
    fun labelRes(status: String): Int = when (OrdersBoardLogic.statusTag(status)) {
        RowTag.RESERVED -> R.string.orders_v2_status_reserved
        RowTag.RENTING -> R.string.orders_v2_status_renting
        RowTag.RETURNED -> R.string.orders_v2_status_returned
        RowTag.COMPLETED -> R.string.orders_v2_status_completed
        else -> R.string.orders_v2_status_cancelled
    }

    fun colors(status: String): DS.Pill = when (OrdersBoardLogic.statusTag(status)) {
        RowTag.RESERVED -> DS.Status.HandOver
        RowTag.RENTING -> DS.Status.Return
        RowTag.RETURNED, RowTag.COMPLETED -> DS.Status.Done
        else -> DS.Status.Cancelled
    }
}
