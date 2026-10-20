package com.anyrent.pos.push

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** #1124: a tapped `BOOKING_REQUEST` push opens that request's detail once the user is signed in */
object BookingPush {
    const val EXTRA_BOOKING_REQUEST_ID = "openBookingRequestId"

    private val _pendingRequestId = MutableStateFlow<Int?>(null)
    val pendingRequestId: StateFlow<Int?> = _pendingRequestId.asStateFlow()

    fun requestOpen(id: Int) {
        _pendingRequestId.value = id
    }

    fun consume(): Int? {
        val id = _pendingRequestId.value ?: return null
        _pendingRequestId.value = null
        return id
    }
}
