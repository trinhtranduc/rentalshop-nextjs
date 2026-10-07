package com.anyrent.pos.ui.appconfig

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.domain.appconfig.AppConfigRepository
import com.anyrent.pos.domain.appconfig.MobileFeature
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AppConfigUiState {
    data object Loading : AppConfigUiState
    /** `storeUrl` is where the update button goes (null hides it) */
    data class Ready(val updateRequired: Boolean, val storeUrl: String?) : AppConfigUiState
}

/**
 * Checks the app config at launch and on resume (#370). Never blocks on a failure: the cached config is used,
 * and without one the app simply continues.
 */
class AppConfigViewModel(
    private val repository: AppConfigRepository,
    private val currentVersion: String,
    private val onFeatures: (Set<MobileFeature>) -> Unit = FeatureFlags::update,
) : ViewModel() {
    private val _state = MutableStateFlow<AppConfigUiState>(AppConfigUiState.Loading)
    val state: StateFlow<AppConfigUiState> = _state.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            val config = runCatching { repository.load() }.getOrNull()
            if (config == null) {
                if (_state.value is AppConfigUiState.Loading) {
                    _state.value = AppConfigUiState.Ready(updateRequired = false, storeUrl = null)
                }
                return@launch
            }
            onFeatures(config.features)
            _state.value = AppConfigUiState.Ready(
                updateRequired = config.updateRequired(currentVersion),
                storeUrl = config.android.storeUrl,
            )
        }
    }

    class Factory(
        private val repository: AppConfigRepository,
        private val currentVersion: String,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            AppConfigViewModel(repository, currentVersion) as T
    }
}
