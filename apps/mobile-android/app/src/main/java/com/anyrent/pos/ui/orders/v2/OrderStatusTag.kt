package com.anyrent.pos.ui.orders.v2

import androidx.annotation.StringRes
import androidx.compose.ui.graphics.Color
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

    /** #888 (owner): every status badge uses the old app's solid colour with white text (iOS `OrderStatusBadge`) */
    fun colors(status: String): DS.Pill = when (OrdersBoardLogic.statusTag(status)) {
        RowTag.RESERVED -> DS.Pill(Color.White, Color(0xFFEF4444))
        RowTag.RENTING -> DS.Pill(Color.White, Color(0xFFF19920))
        RowTag.RETURNED, RowTag.COMPLETED -> DS.Pill(Color.White, Color(0xFF16A34A))
        else -> DS.Pill(Color.White, Color(0xFF991B1B))
    }
}
