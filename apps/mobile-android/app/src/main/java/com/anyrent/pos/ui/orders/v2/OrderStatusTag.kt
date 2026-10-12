package com.anyrent.pos.ui.orders.v2

import android.content.Context
import android.content.SharedPreferences
import androidx.annotation.StringRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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

    /** #888: colours of the chosen palette (Đậm = old app colours, default; Nhạt = pastel) */
    fun colors(status: String, palette: OrderStatusPalette = OrderStatusColors.palette): DS.Pill =
        when (palette) {
            OrderStatusPalette.BOLD -> when (OrdersBoardLogic.statusTag(status)) {
                RowTag.RESERVED -> DS.Pill(Color.White, Color(0xFFEF4444))
                RowTag.RENTING -> DS.Pill(Color.White, Color(0xFFF19920))
                RowTag.RETURNED, RowTag.COMPLETED -> DS.Pill(Color.White, Color(0xFF16A34A))
                else -> DS.Pill(Color.White, Color(0xFF991B1B))
            }
            OrderStatusPalette.LIGHT -> when (OrdersBoardLogic.statusTag(status)) {
                RowTag.RESERVED -> DS.Status.HandOver
                RowTag.RENTING -> DS.Status.Return
                RowTag.RETURNED, RowTag.COMPLETED -> DS.Status.Done
                else -> DS.Status.Cancelled
            }
        }
}

/** #888 (owner): order status badge colours; BOLD (default) = old app, solid fill and white text (iOS `OrderStatusPalette`) */
enum class OrderStatusPalette(val stored: String) {
    BOLD("bold"), LIGHT("light");

    companion object {
        fun fromStored(value: String?): OrderStatusPalette = entries.firstOrNull { it.stored == value } ?: BOLD
    }
}

/** The palette chosen in Cài đặt, stored on this device; Compose redraws badges when it changes */
object OrderStatusColors {
    private const val PREFS = "anyrent.ui"
    private const val KEY = "orderStatusPalette"
    private var prefs: SharedPreferences? = null

    var palette: OrderStatusPalette by mutableStateOf(OrderStatusPalette.BOLD)
        private set

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        palette = OrderStatusPalette.fromStored(prefs?.getString(KEY, null))
    }

    fun choose(value: OrderStatusPalette) {
        palette = value
        prefs?.edit()?.putString(KEY, value.stored)?.apply()
    }
}
