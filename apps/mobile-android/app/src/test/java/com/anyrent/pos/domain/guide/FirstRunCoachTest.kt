package com.anyrent.pos.domain.guide

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1394, #1412: which bubble a screen owes, Tiếp and the counter; same cases as iOS `FirstRunCoachTests` */
class FirstRunCoachTest {
    private val empty = CoachCart(hasCustomer = false, isSale = false, hasDates = false, isEditing = false)
    private val withCustomer = empty.copy(hasCustomer = true)
    private val ready = withCustomer.copy(hasDates = true)
    private val none = emptySet<CoachBubble>()

    @Test
    fun `nine bubbles in the owners order`() {
        assertEquals(CoachBubble.entries, CoachPlan().bubbles)
        assertEquals(
            listOf("PRODUCT_PHOTO", "PRODUCT_NAME", "PRODUCT_PRICE", "PRODUCT_SAVE", "CART_CUSTOMER", "NEW_CUSTOMER", "NEW_CUSTOMER_SAVE", "CART_DATES", "CART_CREATE"),
            CoachPlan().bubbles.map { it.name },
        )
    }

    @Test
    fun `totals for every shop`() {
        assertEquals(9, CoachPlan().bubbles.size)
        assertEquals(7, CoachPlan(customersExist = true).bubbles.size)
        assertEquals(8, CoachPlan(isSale = true).bubbles.size)
        assertEquals(6, CoachPlan(customersExist = true, isSale = true).bubbles.size)
    }

    @Test
    fun `counter is the position in the plan`() {
        assertEquals("1/9", CoachPlan().counter(CoachBubble.PRODUCT_PHOTO))
        assertEquals("9/9", CoachPlan().counter(CoachBubble.CART_CREATE))
        assertEquals("5/7", CoachPlan(customersExist = true).counter(CoachBubble.CART_CUSTOMER))
        assertEquals("6/7", CoachPlan(customersExist = true).counter(CoachBubble.CART_DATES))
        assertEquals("7/7", CoachPlan(customersExist = true).counter(CoachBubble.CART_CREATE))
        assertEquals("8/8", CoachPlan(isSale = true).counter(CoachBubble.CART_CREATE))
        assertEquals("6/6", CoachPlan(customersExist = true, isSale = true).counter(CoachBubble.CART_CREATE))
        assertNull(CoachPlan(customersExist = true).counter(CoachBubble.NEW_CUSTOMER))
        assertNull(CoachPlan(isSale = true).counter(CoachBubble.CART_DATES))
    }

    @Test
    fun `no bubble without a run`() {
        CoachScreen.entries.forEach { assertNull(FirstRunCoachRules.next(null, it, none, empty)) }
    }

    @Test
    fun `product form walks four bubbles as Tiep moves on`() {
        val passed = mutableSetOf<CoachBubble>()
        listOf(CoachBubble.PRODUCT_PHOTO, CoachBubble.PRODUCT_NAME, CoachBubble.PRODUCT_PRICE, CoachBubble.PRODUCT_SAVE).forEach {
            assertEquals(it, FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.PRODUCT_FORM, passed))
            passed += it
        }
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.PRODUCT_FORM, passed))
    }

    @Test
    fun `product run has only the form`() {
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.CART, none, empty))
        assertNull(FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.CUSTOMER_PICKER, none))
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.PRODUCT_FORM, none))
    }

    @Test
    fun `a row with no product opens the form so the run is the product run`() {
        assertEquals(CoachRun.PRODUCT, CoachRun.of(FirstRunGuideAction.OpenProductForm))
        assertEquals(CoachRun.ORDER, CoachRun.of(FirstRunGuideAction.OpenCart(addFirstProduct = true)))
    }

    @Test
    fun `order run walks the cart by its data`() {
        val run = CoachRun.ORDER
        assertEquals(CoachBubble.CART_CUSTOMER, FirstRunCoachRules.next(run, CoachScreen.CART, none, empty))
        assertEquals(CoachBubble.NEW_CUSTOMER, FirstRunCoachRules.next(run, CoachScreen.CUSTOMER_PICKER, none))
        assertEquals(CoachBubble.NEW_CUSTOMER, FirstRunCoachRules.next(run, CoachScreen.NEW_CUSTOMER, none))
        assertEquals(CoachBubble.NEW_CUSTOMER_SAVE, FirstRunCoachRules.next(run, CoachScreen.NEW_CUSTOMER, setOf(CoachBubble.NEW_CUSTOMER)))
        assertEquals(CoachBubble.CART_DATES, FirstRunCoachRules.next(run, CoachScreen.CART, none, withCustomer))
        assertEquals(CoachBubble.CART_CREATE, FirstRunCoachRules.next(run, CoachScreen.CART, none, ready))
    }

    @Test
    fun `a shop with customers has no creation bubbles`() {
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CUSTOMER_PICKER, none, customersExist = true))
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.NEW_CUSTOMER, none, customersExist = true))
        assertEquals(CoachBubble.CART_CUSTOMER, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, none, empty, customersExist = true))
    }

    @Test
    fun `a sale skips the dates`() {
        assertEquals(CoachBubble.CART_CREATE, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, none, withCustomer.copy(isSale = true)))
    }

    @Test
    fun `a missing control skips its bubble silently`() {
        assertEquals(CoachBubble.CART_CREATE, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, setOf(CoachBubble.CART_DATES), withCustomer))
        assertEquals(CoachBubble.CART_DATES, FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, setOf(CoachBubble.CART_CUSTOMER), empty))
        assertEquals(CoachBubble.PRODUCT_NAME, FirstRunCoachRules.next(CoachRun.PRODUCT, CoachScreen.PRODUCT_FORM, setOf(CoachBubble.PRODUCT_PHOTO)))
    }

    @Test
    fun `an order being edited or just created gets no bubble`() {
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, none, empty.copy(isEditing = true)))
        assertNull(FirstRunCoachRules.next(CoachRun.ORDER, CoachScreen.CART, none, empty.copy(isEmpty = true)))
    }

    @Test
    fun `Tiep acts only where there is a field to fill`() {
        listOf(CoachBubble.PRODUCT_PHOTO, CoachBubble.PRODUCT_NAME, CoachBubble.PRODUCT_PRICE).forEach {
            assertTrue(it.nextAdvances(CoachScreen.PRODUCT_FORM))
        }
        assertTrue(CoachBubble.NEW_CUSTOMER.nextAdvances(CoachScreen.NEW_CUSTOMER))
        assertFalse(CoachBubble.NEW_CUSTOMER.nextAdvances(CoachScreen.CUSTOMER_PICKER))
        listOf(CoachBubble.PRODUCT_SAVE, CoachBubble.CART_CUSTOMER, CoachBubble.NEW_CUSTOMER_SAVE, CoachBubble.CART_DATES, CoachBubble.CART_CREATE).forEach {
            assertFalse(it.nextAdvances(CoachScreen.CART))
        }
    }

    @Test
    fun `photo needs one`() {
        assertFalse(FirstRunCoachRules.photoIsValid(0))
        assertTrue(FirstRunCoachRules.photoIsValid(1))
    }

    @Test
    fun `price needs one of the two above zero`() {
        assertFalse(FirstRunCoachRules.priceIsValid(null, null))
        assertFalse(FirstRunCoachRules.priceIsValid(0.0, 0.0))
        assertTrue(FirstRunCoachRules.priceIsValid(1000.0, null))
        assertTrue(FirstRunCoachRules.priceIsValid(0.0, 500.0))
    }

    @Test
    fun `bubbles anchor on stable tags`() {
        assertEquals("customers.picker.new", CoachBubble.NEW_CUSTOMER.anchor(CoachScreen.CUSTOMER_PICKER))
        assertEquals("customers.new.fields", CoachBubble.NEW_CUSTOMER.anchor(CoachScreen.NEW_CUSTOMER))
        assertEquals("cart.datesRow", CoachBubble.CART_DATES.anchor(CoachScreen.CART))
        assertEquals("cart.cta", CoachBubble.CART_CREATE.anchor(CoachScreen.CART))
        assertTrue(CoachBubble.CART_CREATE.prefersAbove)
        assertFalse(CoachBubble.CART_CUSTOMER.prefersAbove)
    }
}
