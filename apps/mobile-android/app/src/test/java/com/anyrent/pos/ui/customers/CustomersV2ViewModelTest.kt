package com.anyrent.pos.ui.customers

import com.anyrent.pos.domain.customers.CustomerRow
import com.anyrent.pos.domain.customers.CustomersPage
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.customers.v2.CustomersListViewModel
import com.anyrent.pos.ui.customers.v2.CustomersSource
import com.anyrent.pos.ui.customers.v2.NewCustomerFlow
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #387 — an older search answer never replaces a newer list; a known phone is offered instead of a duplicate */
@OptIn(ExperimentalCoroutinesApi::class)
class CustomersV2ViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun row(id: Int, phone: String? = null) = CustomerRow(id, "C$id", null, phone, null, null, 0, null)

    private class HeldSource : CustomersSource {
        val calls = mutableListOf<Pair<String?, CompletableDeferred<CustomersPage>>>()
        val created = mutableListOf<JSONObject>()
        var pages: Map<String, List<CustomerRow>> = emptyMap()
        var hold = true
        var createError: Exception? = null

        override suspend fun list(page: Int, query: String?): CustomersPage {
            if (!hold) return CustomersPage(pages[query].orEmpty(), pages[query].orEmpty().size, false)
            val answer = CompletableDeferred<CustomersPage>()
            calls += "$query#$page" to answer
            return answer.await()
        }

        override suspend fun create(payload: JSONObject): CustomerRow {
            created += payload
            createError?.let { throw it }
            return CustomerRow(99, payload.getString("firstName"), payload.optString("lastName"), payload.optString("phone"), null, null, 0, null)
        }
    }

    @Test
    fun `stale search is dropped and pages dedupe`() = runTest(dispatcher) {
        val source = HeldSource()
        val vm = CustomersListViewModel(source, debounceMs = 0)
        advanceUntilIdle()
        source.calls[0].second.complete(CustomersPage(listOf(row(1)), 1, false))
        vm.setQuery("lan")
        advanceUntilIdle()
        vm.setQuery("minh")
        advanceUntilIdle()
        // "lan" was cancelled; answering it changes nothing
        source.calls[1].second.complete(CustomersPage(listOf(row(5)), 9, true))
        source.calls[2].second.complete(CustomersPage(listOf(row(2)), 3, true))
        advanceUntilIdle()
        assertEquals(listOf(2), vm.state.value.rows.map { it.id })
        assertEquals(3, vm.state.value.total)

        vm.loadMore()
        advanceUntilIdle()
        assertEquals("minh#2", source.calls.last().first)
        source.calls.last().second.complete(CustomersPage(listOf(row(2), row(3)), 3, false))
        advanceUntilIdle()
        assertEquals(listOf(2, 3), vm.state.value.rows.map { it.id })
    }

    @Test
    fun `typing is debounced`() = runTest(dispatcher) {
        val source = HeldSource()
        val vm = CustomersListViewModel(source, debounceMs = 300)
        advanceUntilIdle()
        vm.setQuery("l")
        vm.setQuery("la")
        vm.setQuery("lan")
        advanceUntilIdle()
        assertEquals(listOf("null#1", "lan#1"), source.calls.map { it.first })
    }

    @Test
    fun `a known phone is offered instead of creating`() = runTest(dispatcher) {
        val source = HeldSource().apply { hold = false; pages = mapOf("0901234567" to listOf(row(7, "0901 234 567"))) }
        val outcome = NewCustomerFlow(source).submit("Lan B", "0901 234 567", null)
        assertEquals(7, (outcome as NewCustomerFlow.Outcome.Existing).row.id)
        assertTrue(source.created.isEmpty())
    }

    @Test
    fun `a free phone creates with the split name`() = runTest(dispatcher) {
        val source = HeldSource().apply { hold = false }
        val outcome = NewCustomerFlow(source).submit("Nguyễn Thị Lan", "0909", "VIP")
        assertEquals("Nguyễn", (outcome as NewCustomerFlow.Outcome.Created).row.firstName)
        assertEquals("Thị Lan", source.created.single().getString("lastName"))
        assertEquals("VIP", source.created.single().getString("notes"))
    }

    @Test
    fun `a 409 falls back to the existing customer`() = runTest(dispatcher) {
        val source = HeldSource().apply {
            hold = false
            createError = AppError.Http(409, "duplicate", "CUSTOMER_DUPLICATE")
            pages = mapOf("+84 901" to listOf(row(4, "+84 901")))
        }
        val outcome = NewCustomerFlow(source).submit("Lan", "+84 901", null)
        assertEquals(4, (outcome as NewCustomerFlow.Outcome.Existing).row.id)
    }
}
