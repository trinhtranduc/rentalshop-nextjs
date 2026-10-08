package com.anyrent.pos.ui.navigation

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * #674: the one app-wide "orders changed" signal (iOS: `.orderDidCreateOrUpdate` via `OrdersChangeSignal.post()`).
 * A version counter, bumped after every order mutation: Giao đồ, Nhận trả, extend, edit, cancel, delete, note change
 * and create from the cart. Orders, Calendar, Overview and the rented-out / not-picked-up lists compare it with the
 * version they last loaded ([com.anyrent.pos.domain.RefreshTracker]) and reload quietly when it moved.
 */
object OrdersChanged {
    private val _version = MutableStateFlow(0L)
    val version: StateFlow<Long> = _version.asStateFlow()

    fun notifyChanged() {
        _version.update { it + 1 }
    }
}
