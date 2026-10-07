package com.anyrent.pos.ui.common

import androidx.annotation.StringRes
import androidx.compose.ui.graphics.Color
import com.anyrent.pos.R

/**
 * One place for how an order status reads and looks (#370). Unknown values (a status added on the server later)
 * get a neutral badge and their raw text instead of breaking the screen.
 */
object OrderStatusStyle {
    @StringRes
    fun labelRes(status: String): Int? = when (status.uppercase()) {
        "RESERVED" -> R.string.status_reserved
        "PICKUPED", "PICKED_UP" -> R.string.status_pickuped
        "RETURNED" -> R.string.status_returned
        "COMPLETED" -> R.string.status_completed
        "CANCELLED" -> R.string.status_cancelled
        else -> null
    }

    /** Badge colors used by the current screens (unchanged look) */
    fun badgeColor(status: String): Color = when (status.uppercase()) {
        "RESERVED" -> Color(0xFFE83F48)
        "PICKUPED", "PICKED_UP" -> Color(0xFFE88A19)
        "RETURNED", "COMPLETED" -> Color(0xFF23844A)
        "CANCELLED" -> Color(0xFF8E2930)
        else -> UnknownStatusColor
    }

    val UnknownStatusColor = Color(0xFF6B7280)
}
