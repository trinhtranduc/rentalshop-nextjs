package com.anyrent.pos.data

import com.anyrent.pos.domain.products.CartProblem
import com.anyrent.pos.domain.products.CartV2Logic
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/** #448 — the new cart starts with no rental dates, like iOS (`Cart.pickupPlanAt == nil`) */
class CartDatesChosenTest {
    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun clearedCartHasNoDatesChosen() {
        assertFalse(CartStore.datesChosen.value)
    }

    @Test
    fun pickingDatesMarksThemChosenAndClearResets() {
        val day = LocalDate.of(2026, 10, 5)
        CartStore.setPickup(day)
        CartStore.setReturn(day)
        assertTrue(CartStore.datesChosen.value)
        CartStore.clear(persistToDisk = false)
        assertFalse(CartStore.datesChosen.value)
    }

    @Test
    fun rentWithoutDatesListsEveryProblemInIosOrder() {
        assertEquals(
            listOf(CartProblem.EMPTY, CartProblem.NO_CUSTOMER, CartProblem.NO_PICKUP, CartProblem.NO_RETURN),
            CartV2Logic.problems(itemCount = 0, hasCustomer = false, isSale = false, datesChosen = false),
        )
    }

    @Test
    fun saleNeedsNoDates() {
        assertEquals(
            emptyList<CartProblem>(),
            CartV2Logic.problems(itemCount = 1, hasCustomer = true, isSale = true, datesChosen = false),
        )
    }

    @Test
    fun rentWithDatesAndCustomerIsValid() {
        assertEquals(
            emptyList<CartProblem>(),
            CartV2Logic.problems(itemCount = 2, hasCustomer = true, isSale = false, datesChosen = true),
        )
    }
}
