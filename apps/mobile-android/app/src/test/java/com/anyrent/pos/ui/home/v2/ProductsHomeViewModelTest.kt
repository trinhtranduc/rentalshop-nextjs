package com.anyrent.pos.ui.home.v2

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.Product
import kotlinx.coroutines.CompletableDeferred
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

/** #373 — an older search never replaces a newer list; pages add without duplicates */
@OptIn(ExperimentalCoroutinesApi::class)
class ProductsHomeViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun product(id: Int) = Product(
        id = id, name = "P$id", barcode = null, rentPrice = 1.0, salePrice = null, stock = 1, available = 1,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null,
    )

    @Test
    fun `stale search is dropped and pages dedupe`() = runTest(dispatcher) {
        val calls = mutableListOf<Pair<String?, CompletableDeferred<ApiClient.PageResult<Product>>>>()
        val vm = ProductsHomeViewModel(ProductsPageSource { page, query ->
            val answer = CompletableDeferred<ApiClient.PageResult<Product>>()
            calls += (query + "#" + page) to answer
            answer.await()
        })
        vm.setQuery("ao")
        advanceUntilIdle()
        vm.setQuery("vest")
        advanceUntilIdle()
        // The first call was cancelled; answering it changes nothing
        calls[0].second.complete(ApiClient.PageResult(listOf(product(1)), hasMore = false, total = 1))
        calls[1].second.complete(ApiClient.PageResult(listOf(product(2)), hasMore = true, total = 3))
        advanceUntilIdle()
        assertEquals(listOf(2), vm.state.value.products.map { it.id })

        vm.loadMore()
        advanceUntilIdle()
        assertEquals("vest#2", calls.last().first)
        calls.last().second.complete(ApiClient.PageResult(listOf(product(2), product(3)), hasMore = false, total = 3))
        advanceUntilIdle()
        assertEquals(listOf(2, 3), vm.state.value.products.map { it.id })
        assertFalse(vm.state.value.hasMore)
    }

    /** #677 — an order change refreshes the loaded rows' stock in place, once per change */
    @Test
    fun `order change refreshes stock in place`() = runTest(dispatcher) {
        var answers = mapOf(1 to listOf(product(1), product(2)), 2 to listOf(product(3)))
        val calls = mutableListOf<Int>()
        val vm = ProductsHomeViewModel(
            source = ProductsPageSource { page, _ ->
                calls += page
                ApiClient.PageResult(answers.getValue(page), hasMore = page == 1, total = 3)
            },
            changes = { 0L },
        )
        vm.reload()
        advanceUntilIdle()
        vm.loadMore()
        advanceUntilIdle()
        assertEquals(listOf(1, 2, 3), vm.state.value.products.map { it.id })

        vm.onOrdersVersion(0L) // nothing changed
        advanceUntilIdle()
        assertEquals(listOf(1, 2), calls)

        // Product 2 is now out today; a product not on screen is ignored
        answers = mapOf(1 to listOf(product(9), product(2).copy(available = 0)), 2 to listOf(product(3)))
        vm.onOrdersVersion(1L)
        advanceUntilIdle()
        assertEquals(listOf(1, 2, 1, 2), calls)
        assertEquals(listOf(1, 2, 3), vm.state.value.products.map { it.id })
        assertEquals(listOf(1, 0, 1), vm.state.value.products.map { it.available })
        assertFalse(vm.state.value.loading || vm.state.value.refreshing)

        vm.onOrdersVersion(1L) // same change: no second refresh
        advanceUntilIdle()
        assertEquals(4, calls.size)
    }
}
