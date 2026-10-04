package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.ApiClient.PageResult
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.repository.todayWorkFromJson
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import com.anyrent.pos.ui.orders.v2.OrdersHomeViewModel
import com.anyrent.pos.ui.orders.v2.OrdersPageLoader
import com.anyrent.pos.ui.orders.v2.OrdersRow
import com.anyrent.pos.ui.orders.v2.OrdersSegment
import com.anyrent.pos.ui.orders.v2.SectionKind
import com.anyrent.pos.ui.orders.v2.WorkKind
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #371 — orders tab: today's work, late days, sale day groups, stale search */
@OptIn(ExperimentalCoroutinesApi::class)
class OrdersHomeTest {
    private val dispatcher = StandardTestDispatcher()
    private val vietnam = ZoneId.of("Asia/Ho_Chi_Minh")
    private val utc = ZoneId.of("UTC")

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun row(id: Int, lateDays: Int = 0) = """
        {"id":$id,"orderNumber":"ORD-1-$id","customerName":"Lan","customerPhone":"0901234099",
         "pickupPlanAt":"2026-10-03T02:00:00.000Z","returnPlanAt":"2026-10-05T02:00:00.000Z",
         "isReadyToDeliver":false,"productNames":"Áo dài","amountDue":500000,"refundDue":0,"lateDays":$lateDays,
         "items":[{"name":"Áo dài đỏ","quantity":2}]}
    """.trimIndent()

    private fun order(id: Int, type: String = "RENT", status: String = "RESERVED", createdAt: String = "2026-10-03T02:00:00Z") =
        OrderSummary(
            id = id, orderNumber = "ORD-1-$id", orderType = type, status = status, totalAmount = 100.0,
            depositAmount = 0.0, customerName = "Lan", customerPhone = null, pickupPlanAt = null,
            returnPlanAt = null, createdAt = createdAt, notes = null,
        )

    // --- Parsing and sections ---

    @Test
    fun `late first, then today, then tomorrow`() {
        val work = todayWorkFromJson(JSONObject("""
            {"pickupsToday":{"count":1,"orders":[${row(1)}]},
             "returnsToday":{"count":0,"orders":[]},
             "overdueReturns":{"count":1,"orders":[${row(2, lateDays = 1)}]},
             "noShows":{"count":1,"orders":[${row(3, lateDays = 4)}]},
             "tomorrowPickups":{"count":0,"orders":[]},
             "tomorrowReturns":{"count":1,"orders":[${row(4)}]}}
        """.trimIndent()))
        val sections = OrdersHomeLogic.todaySections(work)
        assertEquals(listOf(SectionKind.LATE, SectionKind.TODAY, SectionKind.TOMORROW), sections.map { it.kind })
        assertEquals(listOf(3, 2), sections[0].rows.map { it.orderId })
        val first = sections[0].rows[0] as OrdersRow.Work
        assertEquals(WorkKind.HAND_OVER, first.kind)
        assertEquals("Áo dài đỏ x2", first.row.productNames)
        assertEquals(500000.0, first.row.amountDue, 0.0)
        assertEquals(Instant.parse("2026-10-03T02:00:00Z"), first.row.pickupPlanAt)
    }

    @Test
    fun `older API without tomorrow hides the group`() {
        val work = todayWorkFromJson(JSONObject("""
            {"pickupsToday":{"count":0,"orders":[]},"returnsToday":{"count":1,"orders":[${row(5)}]},
             "overdueReturns":{"count":0,"orders":[]},"noShows":{"count":0,"orders":[]},"tomorrowPickups":null}
        """.trimIndent()))
        assertNull(work.tomorrowPickups)
        val sections = OrdersHomeLogic.todaySections(work)
        assertEquals(listOf(SectionKind.TODAY), sections.map { it.kind })
    }

    @Test
    fun `row without items keeps product names`() {
        val work = todayWorkFromJson(JSONObject("""
            {"pickupsToday":{"orders":[{"id":9,"orderNumber":"ORD-1-9","productNames":"Vest, Áo dài","customerPhone":null}]}}
        """.trimIndent()))
        val parsed = work.pickupsToday.single()
        assertEquals("Vest, Áo dài", parsed.productNames)
        assertNull(parsed.customerPhone)
        assertEquals(0, parsed.lateDays)
    }

    // --- Late days ---

    @Test
    fun `late days use civil days of the zone`() {
        val now = Instant.parse("2026-10-04T01:00:00Z")
        val pickup = Instant.parse("2026-10-03T18:00:00Z") // 04/10 01:00 in Vietnam, 03/10 in UTC
        assertEquals(0, OrdersHomeLogic.lateDays("RENT", "RESERVED", pickup, null, now, vietnam))
        assertEquals(1, OrdersHomeLogic.lateDays("RENT", "RESERVED", pickup, null, now, utc))
    }

    @Test
    fun `late only for open rent steps`() {
        val now = Instant.parse("2026-10-04T05:00:00Z")
        val past = Instant.parse("2026-10-01T05:00:00Z")
        val future = Instant.parse("2026-10-06T05:00:00Z")
        assertEquals(3, OrdersHomeLogic.lateDays("RENT", "PICKUPED", past, past, now, vietnam))
        assertEquals(0, OrdersHomeLogic.lateDays("RENT", "PICKUPED", past, future, now, vietnam))
        assertEquals(0, OrdersHomeLogic.lateDays("RENT", "RETURNED", past, past, now, vietnam))
        assertEquals(0, OrdersHomeLogic.lateDays("RENT", "CANCELLED", past, past, now, vietnam))
        assertEquals(0, OrdersHomeLogic.lateDays("SALE", "RESERVED", past, null, now, vietnam))
    }

    // --- Sale day groups ---

    @Test
    fun `sale groups split at the Vietnam midnight`() {
        val rows = listOf("2026-10-03T17:30:00Z", "2026-10-03T16:30:00Z", "2026-10-02T05:00:00Z")
            .mapIndexed { index, at -> OrdersRow.Order(order(index, "SALE", "COMPLETED", at), 0) }
        assertEquals(3, OrdersHomeLogic.saleSections(rows, vietnam).size)
        val utcGroups = OrdersHomeLogic.saleSections(rows, utc)
        assertEquals(listOf(2, 1), utcGroups.map { it.rows.size })
    }

    // --- View model ---

    private class FakeOrders : OrdersPageLoader {
        data class Call(val q: String?, val orderType: String?, val page: Int, val answer: CompletableDeferred<Result<PageResult<OrderSummary>>>)
        val calls = mutableListOf<Call>()
        override suspend fun load(q: String?, orderType: String?, status: String?, sortBy: String, page: Int): Result<PageResult<OrderSummary>> {
            val call = Call(q, orderType, page, CompletableDeferred())
            calls += call
            return call.answer.await()
        }
    }

    private fun repo(result: Result<TodayWork>) = object : TodayWorkRepository {
        override suspend fun load() = result
    }

    private fun page(vararg ids: Int) = Result.success(PageResult(ids.map { order(it) }, hasMore = false))

    @Test
    fun `stale search answer is dropped`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, searchDelayMs = 300)
        vm.onQueryChange("la"); advanceTimeBy(301)
        vm.onQueryChange("lan"); advanceTimeBy(301)
        assertEquals(listOf("la", "lan"), orders.calls.map { it.q })
        assertNull("search covers rent and sale", orders.calls.last().orderType)
        orders.calls[1].answer.complete(page(30))
        orders.calls[0].answer.complete(page(20))
        advanceUntilIdle()
        assertEquals(listOf(30), vm.state.value.sections.flatMap { it.rows }.map { it.orderId })
    }

    @Test
    fun `typing waits for the pause`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, searchDelayMs = 300)
        vm.onQueryChange("la"); advanceTimeBy(100)
        vm.onQueryChange("lan"); advanceTimeBy(100)
        vm.onQueryChange("l") // below the minimum: no search
        advanceUntilIdle()
        assertTrue(orders.calls.isEmpty())
    }

    @Test
    fun `forbidden today falls back to the rent list`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.failure(AppError.Http(403, "Forbidden"))), orders)
        vm.onShown(); advanceUntilIdle()
        assertFalse(vm.state.value.todayAvailable)
        assertEquals(OrdersSegment.RENT, vm.state.value.segment)
        assertEquals("RENT", orders.calls.single().orderType)
    }

    @Test
    fun `switching segment drops the old list`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders)
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        vm.select(OrdersSegment.SALE); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1, 2)) // late rent answer
        advanceUntilIdle()
        assertTrue(vm.state.value.sections.isEmpty())
        assertTrue(vm.state.value.loading)
        orders.calls[1].answer.complete(page(7))
        advanceUntilIdle()
        assertEquals(listOf(7), vm.state.value.sections.flatMap { it.rows }.map { it.orderId })
        assertEquals("SALE", orders.calls[1].orderType)
        assertEquals(1, orders.calls[1].page)
    }

    @Test
    fun `today work loads into sections`() = runTest(dispatcher) {
        val work = TodayWork(pickupsToday = listOf(TodayWorkRow(id = 1, orderNumber = "ORD-1-1")))
        val vm = OrdersHomeViewModel(repo(Result.success(work)), FakeOrders())
        vm.onShown(); advanceUntilIdle()
        assertEquals(listOf(SectionKind.TODAY), vm.state.value.sections.map { it.kind })
        assertFalse(vm.state.value.loading)
    }
}
