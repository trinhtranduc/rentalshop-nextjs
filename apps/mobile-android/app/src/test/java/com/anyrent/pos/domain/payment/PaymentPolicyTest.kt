package com.anyrent.pos.domain.payment

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.PaymentEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PaymentPolicyTest {
    @Test
    fun `reserved rent collects remaining total plus security deposit`() {
        val order = order(
            type = "RENT",
            status = "RESERVED",
            total = 1_000_000.0,
            deposit = 200_000.0,
            security = 500_000.0,
        )

        val action = PaymentPolicy.actionFor(order)!!

        assertEquals(PaymentPurpose.PICKUP, action.purpose)
        assertEquals(PaymentKind.COLLECT, action.kind)
        assertEquals(1_300_000.0, action.amount, 0.0)
    }

    @Test
    fun `picked up rent refunds unused security deposit`() {
        val order = order(
            type = "RENT",
            status = "PICKUPED",
            security = 500_000.0,
            damage = 100_000.0,
            late = 50_000.0,
        )

        val action = PaymentPolicy.actionFor(order)!!

        assertEquals(PaymentKind.REFUND, action.kind)
        assertEquals(350_000.0, action.amount, 0.0)
    }

    @Test
    fun `sale subtracts completed ledger payments`() {
        val order = order(
            type = "SALE",
            status = "COMPLETED",
            total = 900_000.0,
            payments = listOf(
                PaymentEntry(1, 300_000.0, "CASH", "COMPLETED", "SALE"),
                PaymentEntry(2, 200_000.0, "CASH", "FAILED", "SALE"),
            ),
        )

        assertEquals(600_000.0, PaymentPolicy.actionFor(order)!!.amount, 0.0)
    }

    @Test
    fun `cancelled or settled order has no payment action`() {
        assertNull(PaymentPolicy.actionFor(order(type = "SALE", status = "CANCELLED")))
        assertNull(
            PaymentPolicy.actionFor(
                order(
                    type = "SALE",
                    status = "COMPLETED",
                    total = 100.0,
                    payments = listOf(
                        PaymentEntry(1, 100.0, "CASH", "COMPLETED", "SALE"),
                    ),
                ),
            ),
        )
    }

    private fun order(
        type: String,
        status: String,
        total: Double = 0.0,
        deposit: Double = 0.0,
        security: Double = 0.0,
        damage: Double = 0.0,
        late: Double = 0.0,
        payments: List<PaymentEntry> = emptyList(),
    ) = OrderDetail(
        summary = OrderSummary(
            id = 7,
            orderNumber = "ORD-7",
            orderType = type,
            status = status,
            totalAmount = total,
            depositAmount = deposit,
            customerName = null,
            customerPhone = null,
            pickupPlanAt = null,
            returnPlanAt = null,
            createdAt = null,
            notes = null,
        ),
        items = emptyList(),
        customerId = null,
        payments = payments,
        securityDeposit = security,
        damageFee = damage,
        lateFee = late,
    )
}
