package com.anyrent.pos.domain.guide

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1394: which bubble a screen owes, in the order of the tab "★ Cầm tay: đơn đầu tiên"; same cases as iOS `FirstRunCoachTests` */
class FirstRunCoachTest {
    private val empty = CoachCart(hasCustomer = false, isSale = false, hasDates = false, isEditing = false)
    private val withCustomer = empty.copy(hasCustomer = true)
    private val ready = withCustomer.copy(hasDates = true)

    @Test
    fun `no bubble without a run`() {
        CoachScreen.entries.forEach { assertNull(FirstRunCoachRules.next(null, it, emptySet(), empty)) }
    }

    @Test
    fun `there are six bubbles on four screens`() {
        assertEquals(6, CoachBubble.entries.size)
        assertEquals(6, CoachBubble.entries.map { it.anchor }.toSet().size)
        assertEquals(listOf(1, 2, 2, 2, 3, 3), CoachBubble.entries.map { it.step })
        assertEquals(CoachScreen.entries.toSet(), CoachBubble.entries.map { it.screen }.toSet())
    }

    @Test
    fun `product row only has the form`() {
        assertEquals(CoachBubble.PRODUCT_NAME, FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.PRODUCT_FORM, emptySet()))
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.CART, emptySet(), empty))
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.CUSTOMER_PICKER, emptySet()))
    }

    @Test
    fun `order run walks the cart`() {
        val run = CoachRun.ORDER
        assertEquals(CoachBubble.CART_CUSTOMER, FirstRunCoachRules.next(run, CoachScreen.CART, emptySet(), empty))
        assertEquals(CoachBubble.PICKER_NEW, FirstRunCoachRules.next(run, CoachScreen.CUSTOMER_PICKER, setOf(CoachBubble.CART_CUSTOMER)))
        assertEquals(CoachBubble.NEW_CUSTOMER_FIELDS, FirstRunCoachRules.next(run, CoachScreen.NEW_CUSTOMER, setOf(CoachBubble.PICKER_NEW)))
        assertEquals(CoachBubble.CART_DATES, FirstRunCoachRules.next(run, CoachScreen.CART, setOf(CoachBubble.CART_CUSTOMER), withCustomer))
        assertEquals(CoachBubble.CART_CREATE, FirstRunCoachRules.next(run, CoachScreen.CART, setOf(CoachBubble.CART_DATES), ready))
        assertNull(FirstRunCoachRules.next(run, CoachScreen.PRODUCT_FORM, emptySet()))
    }

    @Test
    fun `both cart rows start the same run`() {
        assertEquals(CoachRun.PRODUCT, CoachRun.of(FirstRunGuideStep.PRODUCT))
        assertEquals(CoachRun.ORDER, CoachRun.of(FirstRunGuideStep.CUSTOMER))
        assertEquals(CoachRun.ORDER, CoachRun.of(FirstRunGuideStep.ORDER))
    }

    @Test
    fun `a sale skips the dates`() {
        val sale = withCustomer.copy(isSale = true)
        assertEquals(CoachBubble.CART_CREATE, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, setOf(CoachBubble.CART_CUSTOMER), sale))
    }

    @Test
    fun `a closed bubble does not come back`() {
        val shown = setOf(CoachBubble.CART_CUSTOMER)
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, shown, empty))
        assertEquals(CoachBubble.CART_DATES, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, shown, withCustomer))
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.PRODUCT_FORM, setOf(CoachBubble.PRODUCT_NAME)))
    }

    @Test
    fun `picker bubble only when the shop has no customer`() {
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CUSTOMER_PICKER, emptySet(), customersExist = true))
    }

    @Test
    fun `an order being edited gets no bubble`() {
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, emptySet(), empty.copy(isEditing = true)))
    }

    @Test
    fun `bubbles anchor on stable tags`() {
        assertEquals("cart.datesRow", CoachBubble.CART_DATES.anchor)
        assertEquals("cart.cta", CoachBubble.CART_CREATE.anchor)
        assertTrue(CoachBubble.CART_CREATE.prefersAbove)
        assertFalse(CoachBubble.CART_CUSTOMER.prefersAbove)
    }
}
