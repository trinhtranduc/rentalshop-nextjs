package com.anyrent.pos.ui.settings.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.RefreshPolicy
import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsPlan
import com.anyrent.pos.domain.settings.SettingsRows
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant

/** Plan and the totals next to Khách hàng / Người dùng (#388); kept across tab switches so they do not flash (#674) */
data class SettingsV2Data(
    val plan: SettingsPlan? = null,
    val counts: Map<SettingsItem, Int> = emptyMap(),
)

/** Server reads of the settings tab; replaceable in tests */
interface SettingsV2Source {
    suspend fun plan(): SettingsPlan?
    suspend fun count(item: SettingsItem): Int?
    suspend fun refreshOverlap()
}

object ApiSettingsV2Source : SettingsV2Source {
    override suspend fun plan(): SettingsPlan? = withContext(Dispatchers.IO) {
        runCatching {
            SettingsRows.planFromJson(ApiClient.get().authedGet("/api/subscriptions/status").optJSONObject("data") ?: JSONObject())
        }.getOrNull()
    }

    override suspend fun count(item: SettingsItem): Int? = withContext(Dispatchers.IO) {
        val path = SettingsRows.countPath(item) ?: return@withContext null
        runCatching { SettingsRows.listTotal(ApiClient.get().authedGet(path)) }.getOrNull()
    }

    override suspend fun refreshOverlap() {
        withContext(Dispatchers.IO) { ApiClient.get().refreshAllowOverlappingOrders() }
    }
}

/**
 * #674: plan, counts and the overlap switch are read on the first show and then at most every 10 minutes (or when
 * the role changes), not on every show. A failed read keeps the last value.
 */
class SettingsV2ViewModel(
    private val source: SettingsV2Source = ApiSettingsV2Source,
    private val now: () -> Instant = Instant::now,
) : ViewModel() {
    private val _data = MutableStateFlow(SettingsV2Data())
    val data: StateFlow<SettingsV2Data> = _data.asStateFlow()

    private var fetchedAt: Instant? = null
    private var fetchedRole: String? = null

    fun onShown(role: String?, canEditOverlap: Boolean, items: List<SettingsItem>) {
        val fresh = role == fetchedRole &&
            !RefreshPolicy.shouldReload(dirty = false, lastLoadedAt = fetchedAt, now = now(), ttl = RefreshPolicy.SUMMARY_TTL)
        if (fresh) return
        fetchedRole = role
        fetchedAt = now()
        viewModelScope.launch {
            if (canEditOverlap) launch { source.refreshOverlap() }
            if (role != "ADMIN") {
                launch { source.plan()?.let { plan -> _data.update { it.copy(plan = plan) } } }
            }
            items.filter { SettingsRows.countPath(it) != null }.forEach { item ->
                launch { source.count(item)?.let { total -> _data.update { it.copy(counts = it.counts + (item to total)) } } }
            }
        }
    }

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = SettingsV2ViewModel() as T
    }
}
