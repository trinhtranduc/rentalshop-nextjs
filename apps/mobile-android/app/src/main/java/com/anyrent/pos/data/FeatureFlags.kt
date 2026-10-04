package com.anyrent.pos.data

import com.anyrent.pos.domain.appconfig.MobileFeature
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Redesigned screens switched on from the server (`features` of the app config, #370).
 * Everything is off until a config says otherwise; screens read [isOn] or collect [enabled].
 */
object FeatureFlags {
    private val _enabled = MutableStateFlow<Set<MobileFeature>>(emptySet())
    val enabled: StateFlow<Set<MobileFeature>> = _enabled.asStateFlow()

    fun isOn(feature: MobileFeature): Boolean = feature in _enabled.value

    fun update(features: Set<MobileFeature>) {
        _enabled.value = features
    }
}
