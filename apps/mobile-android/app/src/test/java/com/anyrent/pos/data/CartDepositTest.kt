package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/** #388 — auto deposit follows every item (iOS `Cart`), a typed deposit is kept */
class CartDepositTest {
    private fun product(id: Int, deposit: Double) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = 100.0, salePrice = 200.0, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = deposit,
    )

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun depositSumsEveryItemAndQuantity() {
        CartStore.addProduct(product(1, 200.0))
        assertEquals(200.0, CartStore.depositAmount.value, 0.0)
        CartStore.addProduct(product(2, 150.0))
        assertEquals(350.0, CartStore.depositAmount.value, 0.0)
        CartStore.addProduct(product(1, 200.0))
        assertEquals(550.0, CartStore.depositAmount.value, 0.0)
        CartStore.updateQuantity(2, 3)
        assertEquals(850.0, CartStore.depositAmount.value, 0.0)
        CartStore.remove(1)
        assertEquals(450.0, CartStore.depositAmount.value, 0.0)
        CartStore.updateQuantity(2, 0)
        assertEquals(0.0, CartStore.depositAmount.value, 0.0)
    }

    @Test
    fun typedDepositIsKeptUntilTheCartIsCleared() {
        CartStore.addProduct(product(1, 200.0))
        CartStore.setDeposit(50.0)
        CartStore.addProduct(product(2, 150.0))
        CartStore.updateQuantity(1, 4)
        CartStore.remove(2)
        assertEquals(50.0, CartStore.depositAmount.value, 0.0)
        CartStore.clear(persistToDisk = false)
        CartStore.addProduct(product(2, 150.0))
        assertEquals(150.0, CartStore.depositAmount.value, 0.0)
    }

    @Test
    fun saleCartAlsoFollowsItemsLikeIos() {
        CartStore.setOrderType("SALE")
        CartStore.addProduct(product(1, 200.0))
        assertEquals(200.0, CartStore.depositAmount.value, 0.0)
    }
}
