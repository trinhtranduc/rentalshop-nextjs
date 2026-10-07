package com.anyrent.pos.data

import com.anyrent.pos.domain.appconfig.MobileFeature
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Redesigned screens switched on from the server (`features` of the app config, #370).
 * #456: every new screen is on until a config says `false` for it (first launch has no cached config, and a
 * failed fetch without a cache keeps these defaults). Screens read [isOn] or collect [enabled].
 */
object FeatureFlags {
    /** Flags before any config is known: all new screens on */
    val DEFAULT: Set<MobileFeature> = MobileFeature.entries.toSet()

    private val _enabled = MutableStateFlow(DEFAULT)
    val enabled: StateFlow<Set<MobileFeature>> = _enabled.asStateFlow()

    fun isOn(feature: MobileFeature): Boolean = feature in _enabled.value

    fun update(features: Set<MobileFeature>) {
        _enabled.value = features
    }
}
