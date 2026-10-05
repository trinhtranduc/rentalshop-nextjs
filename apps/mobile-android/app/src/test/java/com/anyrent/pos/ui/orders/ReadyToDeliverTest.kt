package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.HandOverFields
import com.anyrent.pos.domain.orders.OrderDetailLogic
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

/** #470 — "Sẵn sàng giao" on the new detail: visibility, payload, save and reload */
@OptIn(ExperimentalCoroutinesApi::class)
class ReadyToDeliverTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `shows only for reserved rentals with orders update`() {
        assertTrue(OrderDetailLogic.showsReadyToDeliver("RENT", "RESERVED", canUpdateOrders = true))
        assertTrue(OrderDetailLogic.showsReadyToDeliver("rent", "reserved", canUpdateOrders = true))
        listOf("PICKUPED", "PICKED_UP", "RETURNED", "CANCELLED", "COMPLETED").forEach {
            assertFalse(it, OrderDetailLogic.showsReadyToDeliver("RENT", it, canUpdateOrders = true))
        }
        listOf("RESERVED", "COMPLETED", "CANCELLED").forEach {
            assertFalse(it, OrderDetailLogic.showsReadyToDeliver("SALE", it, canUpdateOrders = true))
        }
        assertFalse(OrderDetailLogic.showsReadyToDeliver("RENT", "RESERVED", canUpdateOrders = false))
    }

    /** Same body as the old detail (OrderDetailActions → ApiParity.setReadyToDeliver) */
    @Test
    fun `toggle sends only the flag`() {
        assertEquals("""{"isReadyToDeliver":true}""", OrderDetailLogic.readyToDeliverBody(true).toString())
        assertEquals("""{"isReadyToDeliver":false}""", OrderDetailLogic.readyToDeliverBody(false).toString())
    }

    @Test
    fun `success saves the new value and reloads the order`() = runTest(dispatcher) {
        val source = Source(Result.success(Unit))
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        var error: String? = "unset"

        vm.setReadyToDeliver(true) { error = it }
        assertTrue(vm.state.value.savingReady)
        advanceUntilIdle()

        assertEquals(listOf(7 to true), source.writes)
        assertNull(error)
        assertEquals(2, source.loads)
        assertTrue(vm.state.value.detail!!.summary.isReadyToDeliver)
        assertFalse(vm.state.value.savingReady)
    }

    @Test
    fun `failure reports the message and keeps the order`() = runTest(dispatcher) {
        val source = Source(Result.failure(AppError.Network("offline")))
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        var error: String? = null

        vm.setReadyToDeliver(true) { error = it }
        advanceUntilIdle()

        assertEquals("offline", error)
        assertEquals(1, source.loads)
        assertFalse(vm.state.value.detail!!.summary.isReadyToDeliver)
        assertFalse(vm.state.value.savingReady)
    }

    @Test
    fun `a second toggle while saving is ignored`() = runTest(dispatcher) {
        val source = Source(Result.success(Unit))
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()

        vm.setReadyToDeliver(true) {}
        vm.setReadyToDeliver(false) {}
        advanceUntilIdle()

        assertEquals(listOf(7 to true), source.writes)
    }

    private class Source(private val result: Result<Unit>) : OrderDetailSource {
        var loads = 0
        var ready = false
        val writes = mutableListOf<Pair<Int, Boolean>>()

        override suspend fun load(id: Int): Result<OrderDetail> {
            loads++
            return Result.success(
                OrderDetail(
                    summary = OrderSummary(
                        id = id, orderNumber = "ORD-1-7", orderType = "RENT", status = "RESERVED",
                        totalAmount = 100.0, depositAmount = 0.0, customerName = null, customerPhone = null,
                        pickupPlanAt = null, returnPlanAt = null, createdAt = null, notes = null,
                        isReadyToDeliver = ready,
                    ),
                    items = emptyList(),
                    customerId = null,
                    payments = emptyList(),
                ),
            )
        }

        override suspend fun setReadyToDeliver(id: Int, ready: Boolean): Result<Unit> {
            writes += id to ready
            if (result.isSuccess) this.ready = ready
            return result
        }

        override suspend fun changeStatus(id: Int, status: String) = Result.success(Unit)

        override suspend fun handOver(id: Int, fields: HandOverFields) = Result.success(Unit)

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
