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
        val vm = ProductsHomeViewModel { page, query ->
            val answer = CompletableDeferred<ApiClient.PageResult<Product>>()
            calls += (query + "#" + page) to answer
            answer.await()
        }
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
}
