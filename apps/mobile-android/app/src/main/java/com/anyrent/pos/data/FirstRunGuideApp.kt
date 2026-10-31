package com.anyrent.pos.data

import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.domain.guide.FirstRunGuideContext
import com.anyrent.pos.domain.guide.FirstRunGuideSource
import com.anyrent.pos.domain.guide.FirstRunGuideStep
import com.anyrent.pos.domain.guide.FirstRunGuideStorage
import com.anyrent.pos.domain.guide.FirstRunGuideTracker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.withContext

/** #1393: the first-run guide of the app: reads over the two existing lists, marks kept with the session prefs */
object FirstRunGuideApp {
    private object Source : FirstRunGuideSource {
        /** No branch filter: a shop with an order at any branch has started */
        override suspend fun orderTotal(): Int? = withContext(Dispatchers.IO) {
            ApiClient.get().searchOrders(page = 1, limit = 1, outletId = null).getOrNull()?.total
        }

        override suspend fun customerTotal(): Int? = withContext(Dispatchers.IO) {
            ApiClient.get().searchCustomers(page = 1, limit = 1).getOrNull()?.total
        }
    }

    private object Storage : FirstRunGuideStorage {
        override fun get(key: String): Boolean = SessionStore.guideMark(key)
        override fun set(key: String, value: Boolean) = SessionStore.setGuideMark(key, value)
    }

    val tracker = FirstRunGuideTracker(Source, Storage) {
        FirstRunGuideContext(
            role = SessionStore.role,
            merchantId = SessionStore.merchantId,
            newProducts = FeatureFlags.isOn(MobileFeature.NEW_PRODUCTS),
            newCustomers = FeatureFlags.isOn(MobileFeature.NEW_CUSTOMERS),
        )
    }

    /** Cài đặt asks Home to run a step once its tab is in front */
    val pendingStep = MutableStateFlow<FirstRunGuideStep?>(null)
}
