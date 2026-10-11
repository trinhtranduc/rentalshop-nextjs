package com.anyrent.pos.ui.overview

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.overview.v2.DrillDownOrdersViewModel
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

/** #674 — rented-out / not-picked-up lists: back from an order reloads only when dirty or stale, rows kept */
@OptIn(ExperimentalCoroutinesApi::class)
class DrillDownOrdersViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun order(id: Int) = OrderSummary(
        id = id, orderNumber = "ORD-1-$id", orderType = "RENT", status = "PICKUPED", totalAmount = 100.0,
        depositAmount = 0.0, customerName = "Lan", customerPhone = null, pickupPlanAt = null,
        returnPlanAt = null, createdAt = null, notes = null,
    )

    @Test
    fun `reloads only when dirty or stale, and a failure keeps the rows`() = runTest(dispatcher) {
        var now = Instant.parse("2026-10-08T03:00:00Z")
        var version = 0L
        var loads = 0
        var answer: Result<List<OrderSummary>> = Result.success(listOf(order(1)))
        val vm = DrillDownOrdersViewModel(loader = { loads++; answer }, now = { now }, changes = { version })

        vm.onShown(); advanceUntilIdle()
        assertEquals(1, loads)
        vm.onShown(); advanceUntilIdle()
        assertEquals("view and back: no reload", 1, loads)

        version++
        answer = Result.failure(AppError.Network("offline"))
        vm.onShown(); advanceUntilIdle()
        assertEquals(2, loads)
        assertEquals("rows kept", listOf(1), vm.state.value.orders?.map { it.id })

        answer = Result.success(listOf(order(1), order(2)))
        vm.onShown(); advanceUntilIdle()
        assertEquals("still dirty after the failure", 3, loads)
        assertEquals(listOf(1, 2), vm.state.value.orders?.map { it.id })

        now = now.plusSeconds(5 * 60)
        vm.onShown(); advanceUntilIdle()
        assertEquals("5 minutes old", 4, loads)
    }
}
