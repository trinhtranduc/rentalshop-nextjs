package com.anyrent.pos.ui.payment

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentKind
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentPurpose
import com.anyrent.pos.domain.payment.PaymentQr
import com.anyrent.pos.domain.payment.PaymentReceipt
import com.anyrent.pos.domain.payment.PaymentRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PaymentViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `submit is single flight and reuses one reference`() = runTest(dispatcher) {
        val repository = FakePaymentRepository()
        val viewModel = PaymentViewModel(repository) { "fixed-reference" }
        viewModel.setOrder(reservedOrder())

        viewModel.submit {}
        viewModel.submit {}
        advanceUntilIdle()

        assertEquals(1, repository.processCalls)
        assertEquals("fixed-reference", repository.references.single())
        assertFalse(viewModel.state.value.submitting)
    }

    @Test
    fun `failure keeps action available and reports error`() = runTest(dispatcher) {
        val repository = FakePaymentRepository(error = IllegalStateException("Payment failed"))
        val viewModel = PaymentViewModel(repository)
        viewModel.setOrder(reservedOrder())

        viewModel.submit {}
        advanceUntilIdle()

        assertTrue(viewModel.state.value.action != null)
        assertEquals("Payment failed", viewModel.state.value.error)
        assertFalse(viewModel.state.value.submitting)
    }

    private fun reservedOrder() = OrderDetail(
        summary = OrderSummary(
            id = 8,
            orderNumber = "ORD-8",
            orderType = "RENT",
            status = "RESERVED",
            totalAmount = 1_000.0,
            depositAmount = 200.0,
            customerName = null,
            customerPhone = null,
            pickupPlanAt = null,
            returnPlanAt = null,
            createdAt = null,
            notes = null,
        ),
        items = emptyList(),
        customerId = null,
        payments = emptyList(),
        securityDeposit = 100.0,
    )
}

private class FakePaymentRepository(
    private val error: Throwable? = null,
) : PaymentRepository {
    var processCalls = 0
    val references = mutableListOf<String>()

    override suspend fun processPayment(
        orderId: Int,
        action: PaymentAction,
        method: PaymentMethod,
        reference: String,
    ): PaymentReceipt {
        processCalls++
        references += reference
        delay(10)
        error?.let { throw it }
        return PaymentReceipt(
            id = 1,
            amount = action.amount,
            method = method,
            kind = PaymentKind.COLLECT,
            status = "COMPLETED",
            reference = reference,
        )
    }

    override suspend fun getPaymentQr(orderId: Int): PaymentQr =
        error("Not used")
}
