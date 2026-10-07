package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.ui.orders.v2.OrderDetailSource
import com.anyrent.pos.ui.orders.v2.OrderDetailV2ViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #372 — a rejected status change shows its message and reloads the order */
@OptIn(ExperimentalCoroutinesApi::class)
class OrderDetailV2ViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `invalid order status shows the message and reloads to the real status`() = runTest(dispatcher) {
        val source = FakeSource(
            statusResult = Result.failure(AppError.Http(400, "Not allowed", "INVALID_ORDER_STATUS")),
        )
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        source.status = "PICKUPED" // changed on another device
        var done: Boolean? = null

        vm.changeStatus("PICKUPED") { done = it }
        advanceUntilIdle()

        assertEquals(false, done)
        assertEquals("INVALID_ORDER_STATUS", vm.state.value.statusError?.code)
        assertEquals("Not allowed", vm.state.value.statusError?.message)
        assertEquals(2, source.loads)
        assertEquals("PICKUPED", vm.state.value.detail?.summary?.status)
        assertFalse(vm.state.value.busy)

        vm.dismissStatusError()
        assertNull(vm.state.value.statusError)
    }

    @Test
    fun `network failure shows the message without reloading`() = runTest(dispatcher) {
        val source = FakeSource(statusResult = Result.failure(AppError.Network("offline")))
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()

        vm.changeStatus("PICKUPED")
        advanceUntilIdle()

        assertEquals("offline", vm.state.value.statusError?.message)
        assertEquals(1, source.loads)
    }

    @Test
    fun `success reloads without an error`() = runTest(dispatcher) {
        val source = FakeSource(statusResult = Result.success(Unit))
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        var done: Boolean? = null

        vm.changeStatus("PICKUPED") { done = it }
        advanceUntilIdle()

        assertTrue(done == true)
        assertNull(vm.state.value.statusError)
        assertEquals(2, source.loads)
    }

    private class FakeSource(private val statusResult: Result<Unit>) : OrderDetailSource {
        var loads = 0
        var status = "RESERVED"

        override suspend fun load(id: Int): Result<OrderDetail> {
            loads++
            return Result.success(
                OrderDetail(
                    summary = OrderSummary(
                        id = id, orderNumber = "ORD-1-7", orderType = "RENT", status = status,
                        totalAmount = 100.0, depositAmount = 0.0, customerName = null, customerPhone = null,
                        pickupPlanAt = null, returnPlanAt = null, createdAt = null, notes = null,
                    ),
                    items = emptyList(),
                    customerId = null,
                    payments = emptyList(),
                ),
            )
        }

        override suspend fun changeStatus(id: Int, status: String) = statusResult

        override suspend fun handOver(id: Int, fields: HandOverFields) = statusResult

        override suspend fun setReadyToDeliver(id: Int, ready: Boolean) = Result.success(Unit)

        override suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double) = Result.success(Unit)

        override suspend fun saveNotes(
            id: Int,
            notes: String,
            original: List<String>,
            kept: List<String>,
            newImages: List<ByteArray>,
        ) = Result.success(Unit)
    }
}
