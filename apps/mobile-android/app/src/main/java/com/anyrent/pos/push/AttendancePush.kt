package com.anyrent.pos.push

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** #910: a `SHIFT_CHANGED` notification (push or inbox row) opens "Ca và công của tôi" */
object AttendancePush {
    const val TYPE_SHIFT_CHANGED = "SHIFT_CHANGED"
    const val EXTRA_OPEN_MY_SHIFTS = "openMyShifts"

    fun isShiftChanged(type: String?): Boolean = type.equals(TYPE_SHIFT_CHANGED, ignoreCase = true)

    private val _pendingOpenMyShifts = MutableStateFlow(false)
    val pendingOpenMyShifts: StateFlow<Boolean> = _pendingOpenMyShifts.asStateFlow()

    fun requestOpenMyShifts() {
        _pendingOpenMyShifts.value = true
    }

    fun consume(): Boolean {
        if (!_pendingOpenMyShifts.value) return false
        _pendingOpenMyShifts.value = false
        return true
    }
}
