package com.anyrent.pos.ui.appconfig

import com.anyrent.pos.data.repository.DefaultAppConfigRepository
import com.anyrent.pos.domain.appconfig.AppConfig
import com.anyrent.pos.domain.appconfig.AppConfigCache
import com.anyrent.pos.domain.appconfig.AppConfigRepository
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.domain.appconfig.PlatformConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/** #370 — the forced update shows only below the minimum; a failed check never blocks the app */
@OptIn(ExperimentalCoroutinesApi::class)
class AppConfigViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private var features: Set<MobileFeature> = emptySet()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun viewModel(repository: AppConfigRepository, version: String = "0.1.3") =
        AppConfigViewModel(repository, version) { features = it }

    private fun repo(config: AppConfig?) = object : AppConfigRepository {
        override suspend fun load(): AppConfig? = config
    }

    @Test
    fun `below the minimum - update required, store link kept`() = runTest(dispatcher) {
        val vm = viewModel(repo(AppConfig(android = PlatformConfig(minVersion = "0.2.0", storeUrl = "https://store"))))
        vm.refresh(); advanceUntilIdle()
        assertEquals(AppConfigUiState.Ready(updateRequired = true, storeUrl = "https://store"), vm.state.value)
    }

    @Test
    fun `at or above the minimum - app opens and flags are applied`() = runTest(dispatcher) {
        val vm = viewModel(repo(AppConfig(android = PlatformConfig(minVersion = "0.1.3"), features = setOf(MobileFeature.NEW_ORDERS))))
        vm.refresh(); advanceUntilIdle()
        assertEquals(AppConfigUiState.Ready(updateRequired = false, storeUrl = null), vm.state.value)
        assertEquals(setOf(MobileFeature.NEW_ORDERS), features)
    }

    @Test
    fun `no config at all - the app opens`() = runTest(dispatcher) {
        val vm = viewModel(repo(null))
        vm.refresh(); advanceUntilIdle()
        assertEquals(AppConfigUiState.Ready(updateRequired = false, storeUrl = null), vm.state.value)
    }

    @Test
    fun `a failed call falls back to the cached config`() = runTest(dispatcher) {
        val cached = AppConfig(android = PlatformConfig(minVersion = "0.2.0"))
        val cache = object : AppConfigCache {
            override fun read() = cached
            override fun write(config: AppConfig) = Unit
        }
        val repository = DefaultAppConfigRepository(fetch = { Result.failure(RuntimeException("offline")) }, cache = cache, ioDispatcher = dispatcher)
        val vm = viewModel(repository)
        vm.refresh(); advanceUntilIdle()
        assertEquals(AppConfigUiState.Ready(updateRequired = true, storeUrl = null), vm.state.value)
    }
}
