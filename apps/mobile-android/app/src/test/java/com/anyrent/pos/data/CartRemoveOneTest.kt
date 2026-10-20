package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #1099 — the − of the Home row stepper (iOS `ProductsCartBridge.removeOne`, #1084) */
class CartRemoveOneTest {
    private fun product(id: Int) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = 100.0, salePrice = 200.0, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = 0.0,
    )

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun removeOneLowersTheQuantityThenDropsTheLine() {
        CartStore.addProduct(product(7), quantity = 2)
        CartStore.removeOne(7)
        assertEquals(1, CartStore.lines.value.single().quantity)
        CartStore.removeOne(7)
        assertTrue(CartStore.lines.value.isEmpty())
        CartStore.removeOne(7) // nothing left: no crash
        assertTrue(CartStore.lines.value.isEmpty())
    }

    @Test
    fun removeOnlyTouchesThatProductAndItsLastLine() {
        CartStore.addProduct(product(1))
        CartStore.addProduct(product(2), quantity = 3)
        CartStore.addProduct(product(2))
        CartStore.removeOne(2)
        val lines2 = CartStore.lines.value.filter { it.product.id == 2 }
        assertEquals(listOf(3), lines2.map { it.quantity })
        assertEquals(1, CartStore.lines.value.first { it.product.id == 1 }.quantity)
    }
}
