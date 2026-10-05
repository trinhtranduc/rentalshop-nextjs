package com.anyrent.pos.domain.appconfig

/**
 * What `GET /api/mobile/app-config` tells the app (#370): the minimum version each platform must run and
 * which redesigned screens are switched on. The server only returns versions; the app compares them.
 */
data class PlatformConfig(
    val minVersion: String = "0.0.0",
    val latestVersion: String? = null,
    val storeUrl: String? = null,
)

data class AppConfig(
    val ios: PlatformConfig = PlatformConfig(),
    val android: PlatformConfig = PlatformConfig(),
    /** #456: every new screen is on unless a config says `false` for it */
    val features: Set<MobileFeature> = MobileFeature.entries.toSet(),
) {
    /** True when this Android build is older than the minimum the server asks for */
    fun updateRequired(currentVersion: String): Boolean =
        AppVersion.compare(currentVersion, android.minVersion) < 0
}

/**
 * New screens switched by the server (`MOBILE_FEATURES` on the API). On by default (#456); a config that says
 * `false` for a screen turns it off and shows the old one.
 */
enum class MobileFeature(val key: String) {
    NEW_ORDERS("newOrders"),
    NEW_ORDER_DETAIL("newOrderDetail"),
    NEW_PRODUCTS("newProducts"),
    NEW_CALENDAR("newCalendar"),
    NEW_OVERVIEW("newOverview"),
    NEW_SETTINGS("newSettings"),
    NEW_AUTH("newAuth"),
    NEW_CUSTOMERS("newCustomers"),
}

object AppVersion {
    /** Compares `x.y.z` versions; missing or non-numeric parts count as 0 (suffixes like `-beta` are ignored) */
    fun compare(a: String, b: String): Int {
        val left = parts(a)
        val right = parts(b)
        for (i in 0 until maxOf(left.size, right.size)) {
            val diff = left.getOrElse(i) { 0 }.compareTo(right.getOrElse(i) { 0 })
            if (diff != 0) return diff
        }
        return 0
    }

    private fun parts(version: String): List<Int> =
        version.trim().substringBefore('-').split('.').map { it.toIntOrNull() ?: 0 }
}

interface AppConfigRepository {
    /** Latest config from the API; on failure the cached one, or null when there is none */
    suspend fun load(): AppConfig?
}

/** Where the last good config is kept between launches */
interface AppConfigCache {
    fun read(): AppConfig?
    fun write(config: AppConfig)
}
