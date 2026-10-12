package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/** #888 — a cart line keeps its product cost after the draft is saved and restored (iOS `CartItem` is Codable) */
class CartCostPersistTest {
    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun product(id: Int, cost: Double?) =
        Product(
            id = id, name = "Áo dài $id", barcode = null, rentPrice = 300_000.0, salePrice = 1_800_000.0, stock = 3,
            available = 3, renting = 0, categoryId = null, categoryName = null, imageUrl = null, costPrice = cost,
        )

    @Test
    fun `cost survives a save and restore, a line without cost stays without`() {
        CartStore.addProduct(product(1, 800_000.0))
        CartStore.addProduct(product(2, null))
        val saved = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(saved)
        val lines = CartStore.lines.value.associateBy { it.product.id }
        assertEquals(800_000.0, lines.getValue(1).product.costPrice!!, 0.0)
        assertNull(lines.getValue(2).product.costPrice)
    }

    /** #893 (owner): swiping a cart line removes it; the draft and totals follow */
    @Test
    fun `removing a line updates the lines and the saved draft`() {
        CartStore.addProduct(product(1, 800_000.0))
        CartStore.addProduct(product(2, null))
        CartStore.remove(1)
        assertEquals(listOf(2), CartStore.lines.value.map { it.product.id })
        val saved = CartStore.draftJson()
        CartStore.clear(persistToDisk = false)
        CartStore.applyDraftJson(saved)
        assertEquals(listOf(2), CartStore.lines.value.map { it.product.id })
    }
}
