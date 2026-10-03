package com.anyrent.pos.data.repository

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.appconfig.AppConfig
import com.anyrent.pos.domain.appconfig.AppConfigCache
import com.anyrent.pos.domain.appconfig.AppConfigRepository
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.domain.appconfig.PlatformConfig
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Loads the app config; a failed call falls back to the last good one so the app never blocks on it (#370) */
class DefaultAppConfigRepository(
    private val fetch: () -> Result<AppConfig> = { ApiClient.get().appConfig() },
    private val cache: AppConfigCache = SessionStoreAppConfigCache,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AppConfigRepository {
    override suspend fun load(): AppConfig? = withContext(ioDispatcher) {
        fetch().fold(
            onSuccess = { config -> config.also { cache.write(it) } },
            onFailure = { cache.read() },
        )
    }
}

/** Cache in `SessionStore` (SharedPreferences) as a small JSON document */
object SessionStoreAppConfigCache : AppConfigCache {
    override fun read(): AppConfig? = runCatching { SessionStore.appConfigJson?.let(::decode) }.getOrNull()

    override fun write(config: AppConfig) {
        runCatching { SessionStore.appConfigJson = encode(config) }
    }

    fun encode(config: AppConfig): String = JSONObject()
        .put("ios", platform(config.ios))
        .put("android", platform(config.android))
        .put("features", JSONObject().apply { MobileFeature.entries.forEach { put(it.key, it in config.features) } })
        .toString()

    fun decode(json: String): AppConfig = appConfigFromJson(JSONObject(json))

    private fun platform(config: PlatformConfig): JSONObject = JSONObject()
        .put("minVersion", config.minVersion)
        .put("latestVersion", config.latestVersion ?: "")
        .put("storeUrl", config.storeUrl ?: "")
}

/** The `data` object of `GET /api/mobile/app-config` (also the cached form) */
internal fun appConfigFromJson(data: JSONObject): AppConfig {
    fun platform(key: String): PlatformConfig {
        val block = data.optJSONObject(key) ?: JSONObject()
        return PlatformConfig(
            minVersion = block.optString("minVersion").ifBlank { "0.0.0" },
            latestVersion = block.optString("latestVersion").takeIf { it.isNotBlank() && it != "null" },
            storeUrl = block.optString("storeUrl").takeIf { it.isNotBlank() && it != "null" },
        )
    }
    val features = data.optJSONObject("features") ?: JSONObject()
    return AppConfig(
        ios = platform("ios"),
        android = platform("android"),
        features = MobileFeature.entries.filter { features.optBoolean(it.key, false) }.toSet(),
    )
}
