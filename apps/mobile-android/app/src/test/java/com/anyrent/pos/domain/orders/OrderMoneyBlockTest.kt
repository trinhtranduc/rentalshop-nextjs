package com.anyrent.pos.domain.orders

import com.anyrent.pos.domain.deposit.DepositPlanInfo
import com.anyrent.pos.domain.deposit.InstallmentSummary
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.money.ShopCurrency
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * #1435 the money block of a rental: which lines show in each of the 9 cases of the approved mockup (tab "odmoney"). Same
 * figures as the tab. Presentation only: every amount comes from [ShareMoneyRule] and [OrderDetailLogic].
 */
class OrderMoneyBlockTest {
    private val sub = 1_250_000.0
    private val off = 100_000.0
    private val total = 1_150_000.0

    private fun stage(key: String, amount: Double, status: String = "UPCOMING", paid: Double = 0.0, planned: Double = amount) = OrderInstallment(
        key, key, amount / total * 100, amount, plannedAmount = planned, remaining = if (paid > 0) 0.0 else amount,
        dueDateKey = "2026-11-01", status = status, paidAmount = paid,
    )

    private val oneUnpaid get() = listOf(stage("i1", 230_000.0, "PAID", 230_000.0), stage("i2", 345_000.0), stage("rest", 575_000.0))
    private val partCollected get() = listOf(
        stage("i1", 230_000.0, "PAID", 230_000.0),
        stage("i2", 100_000.0, "PARTIAL", 100_000.0, planned = 345_000.0),
        stage("rest", 820_000.0),
    )
    private val bothCollected get() = listOf(stage("i1", 230_000.0, "PAID", 230_000.0), stage("i2", 345_000.0, "PAID", 345_000.0), stage("rest", 575_000.0))
    private val allCollected get() = listOf(
        stage("i1", 230_000.0, "PAID", 230_000.0),
        stage("i2", 345_000.0, "PAID", 345_000.0),
        stage("rest", 575_000.0, "PAID", 575_000.0),
    )

    private fun block(
        status: String = "RESERVED",
        subtotal: Double = sub,
        discount: Double = off,
        deposit: Double = 0.0,
        collateral: Double = 0.0,
        late: Double = 0.0,
        damage: Double = 0.0,
        payments: List<BalancePayment> = emptyList(),
        stages: List<OrderInstallment>? = null,
        collateralShown: Boolean = status == "PICKUPED",
        cancelKept: Double? = null,
    ): OrderMoneyBlock {
        val info = stages?.let { list ->
            val collected = list.sumOf { it.paidAmount }
            val planned = list.sumOf { it.amount }
            DepositPlanInfo(
                installments = list,
                summary = InstallmentSummary(planned, collected, maxOf(0.0, planned - collected), Math.round(collected / total * 10_000) / 100.0),
                hasPlan = true,
            )
        } ?: DepositPlanInfo()
        return OrderDetailLogic.moneyBlock(status, subtotal, discount, total, deposit, collateral, late, damage, payments, info, collateralShown, cancelKept, ShopCurrency.VND)
    }

    private val head get() = listOf(OrderMoneyLine.Subtotal(sub), OrderMoneyLine.Discount(off), OrderMoneyLine.RentalTotal(total))

    @Test
    fun `case 1 no deposit, one item`() {
        val result = block(subtotal = total, discount = 0.0)
        assertEquals("No discount: Tạm tính stays, no Giảm giá", listOf(OrderMoneyLine.Subtotal(total), OrderMoneyLine.RentalTotal(total), OrderMoneyLine.CollectAtHandOver(total)), result.lines)
        assertNull(result.plan)
        assertTrue(result.hasLargeFigure)
    }

    @Test
    fun `case 2 single deposit`() {
        assertEquals(head + listOf(OrderMoneyLine.DepositPaid(230_000.0), OrderMoneyLine.CollectAtHandOver(920_000.0)), block(deposit = 230_000.0).lines)
    }

    @Test
    fun `case 3 staged, one unpaid`() {
        val result = block(deposit = 230_000.0, stages = oneUnpaid)
        assertEquals("No Đã cọc with stages", head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CollectAtHandOver(575_000.0)), result.lines)
        assertEquals("The uncollected last stage is in the amount due", listOf("i1", "i2"), result.plan?.shownKeys)
        assertEquals("Còn phải thu differs from the amount due: it shows", 920_000.0, result.plan?.remaining)
        assertEquals(230_000.0, result.plan?.collected)
        assertEquals(20.0, result.plan?.percent)
    }

    @Test
    fun `case 4 stages and money collateral`() {
        val result = block(deposit = 230_000.0, collateral = 300_000.0, stages = oneUnpaid)
        assertEquals(
            "One line, no Tiền thế chân and no Thu khi giao",
            head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CashAtHandOver(HandOverCashLines(575_000.0, 300_000.0, 875_000.0))),
            result.lines,
        )
        assertEquals(listOf("i1", "i2"), result.plan?.shownKeys)
        assertEquals(920_000.0, result.plan?.remaining)
    }

    @Test
    fun `case 5 rented with fees keeps the lines of Android`() {
        val result = block("PICKUPED", deposit = 230_000.0, collateral = 300_000.0, late = 100_000.0, damage = 50_000.0)
        assertEquals(
            "No Đã cọc on a rented order; Trả lại thế chân stays",
            head + listOf(OrderMoneyLine.LateFee(100_000.0), OrderMoneyLine.DamageFee(50_000.0), OrderMoneyLine.CollateralBack(300_000.0)),
            result.lines,
        )
        assertEquals("Khi nhận trả moves under the papers", OrderMoneyLine.GiveBackAtReturn(150_000.0), result.returnLine)
        assertTrue(result.hasLargeFigure)
    }

    @Test
    fun `a rented order keeps Da thanh toan truoc`() {
        val payments = listOf(BalancePayment(40_000.0, "COMPLETED", "RETURN_ADJUSTMENT"))
        val result = block("PICKUPED", late = 100_000.0, payments = payments)
        assertEquals(head + listOf(OrderMoneyLine.LateFee(100_000.0), OrderMoneyLine.SettledBefore(40_000.0)), result.lines)
        assertEquals(OrderMoneyLine.CollectAtReturn(60_000.0), result.returnLine)
    }

    @Test
    fun `case 6 returned with fees has no large figure`() {
        val result = block("RETURNED", deposit = 230_000.0, collateral = 300_000.0, late = 100_000.0, damage = 50_000.0)
        assertEquals(
            head + listOf(OrderMoneyLine.DepositPaid(230_000.0), OrderMoneyLine.CollateralMoney(300_000.0), OrderMoneyLine.LateFee(100_000.0), OrderMoneyLine.DamageFee(50_000.0)),
            result.lines,
        )
        assertNull(result.returnLine)
        assertFalse("A finished order has no large figure", result.hasLargeFigure)
    }

    @Test
    fun `case 7 part collected stage hides Con phai thu`() {
        val result = block(deposit = 330_000.0, stages = partCollected)
        assertEquals(head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CollectAtHandOver(820_000.0)), result.lines)
        assertEquals(listOf("i1", "i2"), result.plan?.shownKeys)
        assertNull("820.000 is the amount due: Còn phải thu hides", result.plan?.remaining)
    }

    @Test
    fun `case 8 all stages collected hides Con phai thu`() {
        val result = block(deposit = 575_000.0, stages = bothCollected)
        assertEquals(head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CollectAtHandOver(575_000.0)), result.lines)
        assertEquals(listOf("i1", "i2"), result.plan?.shownKeys)
        assertNull(result.plan?.remaining)
    }

    @Test
    fun `case 9 rented, all collected`() {
        val result = block("PICKUPED", deposit = 575_000.0, stages = allCollected)
        assertEquals("No amount due in the block", head + listOf(OrderMoneyLine.Stages), result.lines)
        assertEquals("After hand-over the last stage is a normal stage", listOf("i1", "i2", "rest"), result.plan?.shownKeys)
        assertEquals("There is no amount due to equal: Còn phải thu 0 shows, as drawn", 0.0, result.plan?.remaining)
        assertEquals("Android keeps its line", OrderMoneyLine.CollectAtReturn(0.0), result.returnLine)
        assertFalse("It is plain: a finished order has no large figure", result.hasLargeFigure)
    }

    @Test
    fun `PICKED_UP counts as a rented order`() {
        assertEquals(block("PICKUPED", late = 100_000.0), block("PICKED_UP", late = 100_000.0, collateralShown = true))
    }

    /** "Các đợt cộng số phải thu đúng bằng Tổng tiền thuê" of the tab */
    @Test
    fun `stages plus the amount due are the rental total`() {
        for ((stages, deposit) in listOf(oneUnpaid to 230_000.0, bothCollected to 575_000.0, partCollected to 330_000.0)) {
            val result = block(deposit = deposit, stages = stages)
            val shown = stages.filter { result.plan?.shownKeys?.contains(it.key) == true }.sumOf { it.amount }
            val due = (result.lines.last() as OrderMoneyLine.CollectAtHandOver).amount
            assertEquals(total, shown + due, 0.001)
        }
    }

    @Test
    fun `with collateral Con phai thu hides only when the rental part equals it`() {
        val result = block(deposit = 575_000.0, collateral = 300_000.0, stages = bothCollected)
        assertEquals(head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CashAtHandOver(HandOverCashLines(575_000.0, 300_000.0, 875_000.0))), result.lines)
        assertNull("575.000 is the rental part of the amount due", result.plan?.remaining)
    }

    @Test
    fun `a booked last stage shows again once collected`() {
        assertEquals(listOf("i1", "i2", "rest"), block(deposit = 1_150_000.0, stages = allCollected).plan?.shownKeys)
    }

    @Test
    fun `a pickup payment keeps its lines before the amount due`() {
        val payments = listOf(BalancePayment(100_000.0, "COMPLETED", "PICKUP"))
        assertEquals(
            "A PICKUP payment already taken: not the one line, as #1368",
            head + listOf(
                OrderMoneyLine.DepositPaid(230_000.0), OrderMoneyLine.CollateralMoney(300_000.0),
                OrderMoneyLine.AlreadyCollected(100_000.0), OrderMoneyLine.CollectAtHandOver(1_120_000.0),
            ),
            block(deposit = 230_000.0, collateral = 300_000.0, payments = payments).lines,
        )
    }

    @Test
    fun `a rented order without the collateral section keeps the return line in the block`() {
        val result = block("PICKUPED", collateral = 300_000.0, collateralShown = false)
        assertEquals(head + listOf(OrderMoneyLine.CollateralBack(300_000.0), OrderMoneyLine.GiveBackAtReturn(300_000.0)), result.lines)
        assertNull(result.returnLine)
    }

    @Test
    fun `a cancelled order keeps its lines and the rest stage`() {
        val staged = block("CANCELLED", deposit = 230_000.0, collateral = 300_000.0, stages = oneUnpaid, cancelKept = 100_000.0)
        assertEquals(
            "The kept lines read under the stages",
            head + listOf(OrderMoneyLine.Stages, OrderMoneyLine.CancelKept(100_000.0), OrderMoneyLine.CancelRefund(130_000.0), OrderMoneyLine.CollateralMoney(300_000.0)),
            staged.lines,
        )
        assertEquals("Only a booked order merges the last stage", listOf("i1", "i2", "rest"), staged.plan?.shownKeys)
        assertFalse(staged.hasLargeFigure)
        val single = block("CANCELLED", deposit = 230_000.0, cancelKept = 100_000.0)
        assertEquals(
            "No stages: as before",
            head + listOf(OrderMoneyLine.DepositPaid(230_000.0), OrderMoneyLine.CancelKept(100_000.0), OrderMoneyLine.CancelRefund(0.0)),
            single.lines,
        )
    }

    @Test
    fun `a booked order with nothing left keeps Thu khi giao`() {
        assertEquals(OrderMoneyLine.CollectAtHandOver(0.0), block(deposit = 1_150_000.0).lines.last())
    }
}
