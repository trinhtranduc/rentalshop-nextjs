package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
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
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * #448 — owner 2026-10-05: hand-over and return match iOS. iOS sends only the order update
 * (`PUT /api/orders/{id}`: status, papers / security deposit, fees) and records no payment; the API
 * works the balance out itself. The new-UI detail screen must not call `/api/payments/process`.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class HandOverReturnNoPaymentTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `hand-over sends only the PICKUPED update`() = runTest(dispatcher) {
        val source = RecordingSource()
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        var done: Boolean? = null

        vm.handOver(HandOverFields(securityDeposit = 500.0, collateralDetails = "CCCD")) { done = it }
        advanceUntilIdle()

        assertEquals(true, done)
        assertEquals(listOf("handOver:CCCD:500.0"), source.writes)
    }

    @Test
    fun `return with new fees saves them then sends RETURNED`() = runTest(dispatcher) {
        val source = RecordingSource()
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()
        var done: Boolean? = null

        vm.takeReturn(lateFee = 20.0, damageFee = 5.0, onError = {}) { done = it }
        advanceUntilIdle()

        assertEquals(true, done)
        assertEquals(listOf("fees:20.0:5.0", "status:RETURNED"), source.writes)
    }

    @Test
    fun `return with unchanged fees sends only RETURNED`() = runTest(dispatcher) {
        val source = RecordingSource()
        val vm = OrderDetailV2ViewModel(7, source)
        advanceUntilIdle()

        vm.takeReturn(lateFee = 0.0, damageFee = 0.0, onError = {}) {}
        advanceUntilIdle()

        assertEquals(listOf("status:RETURNED"), source.writes)
    }

    @Test
    fun `new-UI detail screen records no payment`() {
        val dir = listOf("src/main/java/com/anyrent/pos/ui/orders/v2", "app/src/main/java/com/anyrent/pos/ui/orders/v2")
            .map(::File).first { it.exists() }
        listOf("OrderDetailV2Screen.kt", "OrderDetailV2Sheets.kt").forEach { name ->
            val code = File(dir, name).readText()
            listOf("PaymentViewModel", "paymentVm", "processPayment", "MethodPicker", "PaymentMethod").forEach {
                assertFalse("$name still uses $it", code.contains(it))
            }
        }
    }

    private class RecordingSource : OrderDetailSource {
        val writes = mutableListOf<String>()

        override suspend fun load(id: Int): Result<OrderDetail> = Result.success(
            OrderDetail(
                summary = OrderSummary(
                    id = id, orderNumber = "ORD-1-7", orderType = "RENT", status = "PICKUPED",
                    totalAmount = 100.0, depositAmount = 0.0, customerName = null, customerPhone = null,
                    pickupPlanAt = null, returnPlanAt = null, createdAt = null, notes = null,
                ),
                items = emptyList(),
                customerId = null,
                payments = emptyList(),
            ),
        )

        override suspend fun changeStatus(id: Int, status: String): Result<Unit> {
            writes += "status:$status"
            return Result.success(Unit)
        }

        override suspend fun handOver(id: Int, fields: HandOverFields): Result<Unit> {
            writes += "handOver:${fields.collateralDetails}:${fields.securityDeposit}"
            return Result.success(Unit)
        }

        override suspend fun setReadyToDeliver(id: Int, ready: Boolean) = Result.success(Unit)

        override suspend fun saveFees(id: Int, lateFee: Double, damageFee: Double): Result<Unit> {
            writes += "fees:$lateFee:$damageFee"
            return Result.success(Unit)
        }

        override suspend fun saveNotes(
            id: Int,
            notes: String,
            original: List<String>,
            kept: List<String>,
            newImages: List<ByteArray>,
        ) = Result.success(Unit)
    }
}
