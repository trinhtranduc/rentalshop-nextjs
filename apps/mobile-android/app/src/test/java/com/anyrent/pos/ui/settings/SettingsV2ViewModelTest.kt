package com.anyrent.pos.ui.settings

import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsPlan
import com.anyrent.pos.ui.settings.v2.SettingsV2Source
import com.anyrent.pos.ui.settings.v2.SettingsV2ViewModel
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
import java.time.Instant

/** #674 — settings plan, counts and overlap: first show, then at most every 10 minutes or on a role change */
@OptIn(ExperimentalCoroutinesApi::class)
class SettingsV2ViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private class FakeSource : SettingsV2Source {
        var plans = 0
        var counts = 0
        var overlaps = 0
        var planAnswer: SettingsPlan? = SettingsPlan("Pro", isTrial = false, isExpired = false, daysRemaining = 30)
        override suspend fun plan(): SettingsPlan? { plans++; return planAnswer }
        override suspend fun count(item: SettingsItem): Int? { counts++; return 12 }
        override suspend fun refreshOverlap() { overlaps++ }
    }

    @Test
    fun `no refetch on every show, again after 10 minutes, a failure keeps the value`() = runTest(dispatcher) {
        val source = FakeSource()
        var now = Instant.parse("2026-10-08T03:00:00Z")
        val vm = SettingsV2ViewModel(source) { now }
        val items = SettingsItem.values().toList()

        vm.onShown("MERCHANT", canEditOverlap = true, items = items); advanceUntilIdle()
        assertEquals(1, source.plans)
        assertEquals(1, source.overlaps)
        val countCalls = source.counts
        assertEquals("Pro", vm.data.value.plan?.name)

        now = now.plusSeconds(9 * 60)
        vm.onShown("MERCHANT", canEditOverlap = true, items = items); advanceUntilIdle()
        assertEquals("within 10 minutes: nothing", 1, source.plans)
        assertEquals(1, source.overlaps)
        assertEquals(countCalls, source.counts)

        now = now.plusSeconds(60)
        source.planAnswer = null // failed read
        vm.onShown("MERCHANT", canEditOverlap = true, items = items); advanceUntilIdle()
        assertEquals(2, source.plans)
        assertEquals(2, source.overlaps)
        assertEquals("kept, no flash", "Pro", vm.data.value.plan?.name)
    }

    @Test
    fun `role change reads again`() = runTest(dispatcher) {
        val source = FakeSource()
        val vm = SettingsV2ViewModel(source) { Instant.parse("2026-10-08T03:00:00Z") }
        vm.onShown("OUTLET_STAFF", canEditOverlap = false, items = emptyList()); advanceUntilIdle()
        vm.onShown("MERCHANT", canEditOverlap = true, items = emptyList()); advanceUntilIdle()
        assertEquals(2, source.plans)
        assertEquals(1, source.overlaps)
    }
}
