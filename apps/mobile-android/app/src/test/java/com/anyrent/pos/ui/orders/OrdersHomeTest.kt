package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.ApiClient.PageResult
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.repository.todayWorkFromJson
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRepository
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import com.anyrent.pos.ui.orders.v2.DateBasis
import com.anyrent.pos.ui.orders.v2.DateRangeChoice
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.OrdersHomeViewModel
import com.anyrent.pos.ui.orders.v2.OrdersQuery
import com.anyrent.pos.ui.orders.v2.OrdersSection
import com.anyrent.pos.ui.orders.v2.OrdersSort
import com.anyrent.pos.ui.orders.v2.PayLine
import com.anyrent.pos.ui.orders.v2.RentOrdersFilter
import com.anyrent.pos.ui.orders.v2.RowTag
import com.anyrent.pos.ui.orders.v2.RowTagStyle
import com.anyrent.pos.ui.orders.v2.RowMoneyText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

/** #371 — orders tab: today's work, late days, sale day groups, stale search; #401 — board texts */
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
         "isReadyToDeliver":false,"productNames":"Áo dài","totalAmount":800000,"amountDue":500000,"refundDue":0,"lateDays":$lateDays,
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
        assertEquals("Áo dài đỏ ×2", first.row.productNames)
        assertEquals(800000.0, first.row.totalAmount, 0.0)
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
        data class Call(val query: OrdersQuery, val answer: CompletableDeferred<Result<PageResult<OrderSummary>>>) {
            val q get() = query.q
            val orderType get() = query.orderType
            val page get() = query.page
        }
        val calls = mutableListOf<Call>()
        override suspend fun load(query: OrdersQuery): Result<PageResult<OrderSummary>> {
            val call = Call(query, CompletableDeferred())
            calls += call
            return call.answer.await()
        }
    }

    private fun repo(result: Result<TodayWork>) = object : TodayWorkRepository {
        override suspend fun load() = result
    }

    private fun page(vararg ids: Int) = Result.success(PageResult(ids.map { order(it) }, hasMore = false, total = ids.size))

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

    // --- Board texts (#401) ---

    private fun work(id: Int, kind: WorkKind) = OrdersRow.Work(TodayWorkRow(id = id, orderNumber = "ORD-1-$id"), kind)

    private fun listOrder(
        status: String,
        type: String = "RENT",
        created: String = "2026-10-02T03:00:00Z",
        updated: String = "2026-10-02T03:00:00Z",
        returns: String = "2026-10-05T02:00:00Z",
        pickup: String = "2026-10-04T02:00:00Z",
    ) = OrderSummary(
        id = 1, orderNumber = "ORD-1-0062", orderType = type, status = status, totalAmount = 380000.0,
        depositAmount = 0.0, customerName = "Tâm", customerPhone = null, pickupPlanAt = pickup,
        returnPlanAt = returns, createdAt = created, notes = null, updatedAt = updated,
    )

    @Test
    fun `band counts and badge`() {
        val sections = listOf(
            OrdersSection(SectionKind.LATE, listOf(work(1, WorkKind.HAND_OVER), work(2, WorkKind.TAKE_BACK), work(3, WorkKind.TAKE_BACK))),
            OrdersSection(SectionKind.TODAY, listOf(work(4, WorkKind.HAND_OVER), work(5, WorkKind.HAND_OVER))),
            OrdersSection(SectionKind.TOMORROW, listOf(work(6, WorkKind.TAKE_BACK))),
        )
        assertEquals(1 to 2, OrdersBoardLogic.bandCounts(sections[0].rows))
        assertEquals("late + today, not tomorrow", 5, OrdersBoardLogic.badgeCount(sections))
    }

    @Test
    fun `pay line choice`() {
        assertEquals(PayLine.Due(600000.0), OrdersBoardLogic.payLine(600000.0, 0.0))
        assertEquals(PayLine.Refund(200000.0), OrdersBoardLogic.payLine(0.0, 200000.0))
        assertEquals("a refund wins", PayLine.Refund(200000.0), OrdersBoardLogic.payLine(50000.0, 200000.0))
        // #458: a fully paid order shows no pay line
        assertNull(OrdersBoardLogic.payLine(0.0, 0.0))
    }

    @Test
    fun `overview drill-down lists build the orders tab rows with late days (#458)`() {
        fun summary(id: Int, returnPlanAt: String) = OrderSummary(
            id = id, orderNumber = "ORD-19-000$id", orderType = "RENT", status = "PICKUPED", totalAmount = 300000.0,
            depositAmount = 0.0, customerName = "Huy", customerPhone = null, pickupPlanAt = "2026-10-01T02:00:00Z",
            returnPlanAt = returnPlanAt, createdAt = "2026-10-01T03:00:00Z", notes = null,
        )
        val now = Instant.parse("2026-10-05T03:00:00Z")
        val rows = OrdersHomeLogic.orderRows(
            listOf(summary(1, "2026-10-03T02:00:00Z"), summary(2, "2026-10-08T02:00:00Z")),
            now,
            vietnam,
        )
        assertEquals("keeps the API order", listOf(1, 2), rows.map { it.orderId })
        assertEquals(listOf(2, 0), rows.map { it.lateDays })
    }

    @Test
    fun `short number`() {
        assertEquals("0053", OrdersBoardLogic.shortNumber("ORD-1-0053"))
        assertEquals("0001", OrdersBoardLogic.shortNumber("ORD-001-20250115-0001"))
        assertEquals("ORD00112345", OrdersBoardLogic.shortNumber("ORD00112345"))
        assertEquals("702293", OrdersBoardLogic.shortNumber("702293"))
    }

    /** #496: a "Việc cần làm" row reads like a list row: no created day, the task of its kind */
    @Test
    fun `work row date lines`() {
        val row = TodayWorkRow(
            id = 1, orderNumber = "ORD-1-0057",
            pickupPlanAt = Instant.parse("2026-10-02T17:30:00Z"), // 03/10 00:30 in Vietnam
            returnPlanAt = Instant.parse("2026-10-05T02:00:00Z"),
        )
        assertEquals(
            OrderRowDates.Lines("#0057", "Giao T7 03/10 · trả T2 05/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(row, WorkKind.HAND_OVER, isLate = true)),
        )
        assertEquals(
            OrderRowDates.Lines("#0057", "Trả T2 05/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(row, WorkKind.TAKE_BACK, isLate = false)),
        )
        assertEquals(
            OrderRowDates.Lines("#0057", "Hạn trả T2 05/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(row, WorkKind.TAKE_BACK, isLate = true)),
        )
    }

    @Test
    fun `work rows have no call phone, late or not (#468)`() {
        val row = TodayWorkRow(id = 1, orderNumber = "ORD-1-0001", customerName = "Huy", customerPhone = "0901 234 567", lateDays = 2)
        assertNull(OrdersBoardLogic.workCallPhone(row, isLate = true))
        assertNull(OrdersBoardLogic.workCallPhone(row, isLate = false))
    }

    @Test
    fun `status tag is 14sp bold, notes are 12sp regular (#468)`() {
        with(RowTagStyle.STATUS) {
            assertEquals(14.sp, fontSize)
            assertEquals(FontWeight.Bold, weight)
            assertEquals(8.dp, horizontal)
            assertEquals(3.dp, vertical)
            assertEquals(7.dp, radius)
        }
        with(RowTagStyle.NOTE) {
            assertEquals(12.sp, fontSize)
            assertEquals(FontWeight.Normal, weight)
            assertEquals(6.dp, horizontal)
            assertEquals(2.dp, vertical)
            assertEquals(6.dp, radius)
        }
    }

    @Test
    fun `row total stays bold, pay line is regular (#468)`() {
        assertEquals(FontWeight.Bold, RowMoneyText.totalWeight)
        assertEquals(FontWeight.Normal, RowMoneyText.payWeight)
    }

    /** #496: list rows map every date of the order; late only matters to a rented-out order */
    @Test
    fun `list row date lines`() {
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo T6 02/10", "Giao CN 04/10 · trả T2 05/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("RESERVED"), 0)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo T6 02/10", "Hạn trả T2 05/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("PICKUPED"), 2)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo T6 02/10", "Bán T6 02/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("COMPLETED", type = "SALE"), 0)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo T6 02/10", "Huỷ T7 03/10"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("CANCELLED", updated = "2026-10-03T03:00:00Z"), 0)),
        )
        assertEquals(RowTag.RENTING, OrdersBoardLogic.statusTag("PICKUPED"))
        assertEquals(RowTag.CANCELLED, OrdersBoardLogic.statusTag("CANCELLED"))
    }

    @Test
    fun `sale day summary leaves cancelled out`() {
        val rows = listOf(
            OrdersRow.Order(listOrder("COMPLETED", type = "SALE"), 0),
            OrdersRow.Order(listOrder("CANCELLED", type = "SALE"), 0),
        )
        assertEquals(1 to 380000.0, OrdersBoardLogic.saleDaySummary(rows))
    }

    @Test
    fun `date range presets and query`() {
        val now = Instant.parse("2026-10-03T18:30:00Z") // 04/10 01:30 in Vietnam
        assertNull(OrdersBoardLogic.dayBounds(DateRangeChoice.Any, now, vietnam))
        assertEquals("2026-10-04" to "2026-10-04", OrdersBoardLogic.dayBounds(DateRangeChoice.Today, now, vietnam)?.let { it.first.toString() to it.second.toString() })
        assertEquals("2026-10-04" to "2026-10-10", OrdersBoardLogic.dayBounds(DateRangeChoice.Next7Days, now, vietnam)?.let { it.first.toString() to it.second.toString() })
        assertEquals("2026-10-01" to "2026-10-31", OrdersBoardLogic.dayBounds(DateRangeChoice.ThisMonth, now, vietnam)?.let { it.first.toString() to it.second.toString() })
        assertEquals(OrdersQuery(orderType = "RENT"), OrdersBoardLogic.rentQuery(RentOrdersFilter(), 1, now, vietnam))
        val query = OrdersBoardLogic.rentQuery(
            RentOrdersFilter(status = "PICKUPED", sort = OrdersSort.RETURN, basis = DateBasis.PICKUP_PLAN, range = DateRangeChoice.Today),
            2, now, vietnam,
        )
        assertEquals(
            OrdersQuery(orderType = "RENT", status = "PICKUPED", sortBy = "returnPlanAt", startDate = "2026-10-04", endDate = "2026-10-04", dateField = "pickupPlanAt", page = 2),
            query,
        )
    }

    @Test
    fun `status chip reloads the rent list`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders)
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        vm.selectStatus("CANCELLED"); advanceUntilIdle()
        assertEquals(listOf(null, "CANCELLED"), orders.calls.map { it.query.status })
        orders.calls[1].answer.complete(page(3))
        advanceUntilIdle()
        assertEquals(1, vm.state.value.total)
    }

    // --- #674: segment cache, dirty flag, quiet refresh ---

    private class Clock(var now: Instant = Instant.parse("2026-10-08T03:00:00Z"))

    private fun ids(vm: OrdersHomeViewModel) = vm.state.value.sections.flatMap { it.rows }.map { it.orderId }

    private fun pageOf(ids: List<Int>, hasMore: Boolean = false) =
        Result.success(PageResult(ids.map { order(it) }, hasMore = hasMore, total = ids.size))

    @Test
    fun `segment switch shows the cached list without reloading (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val clock = Clock()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, now = { clock.now }, changes = { version })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1, 2)); advanceUntilIdle()
        vm.select(OrdersSegment.SALE); advanceUntilIdle()
        orders.calls[1].answer.complete(page(7)); advanceUntilIdle()
        clock.now = clock.now.plusSeconds(60)

        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        assertEquals(listOf(1, 2), ids(vm))
        assertFalse(vm.state.value.loading)
        assertEquals(2, vm.state.value.total)
        assertEquals("fresh and clean: no request", 2, orders.calls.size)
    }

    @Test
    fun `dirty segment shows the cache then refreshes quietly (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, changes = { version })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1, 2)); advanceUntilIdle()
        vm.select(OrdersSegment.SALE); advanceUntilIdle()
        orders.calls[1].answer.complete(page(7)); advanceUntilIdle()

        version++ // an order changed
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        assertEquals("cached rows stay while the refresh runs", listOf(1, 2), ids(vm))
        assertFalse("no spinner", vm.state.value.loading)
        assertEquals(3, orders.calls.size)
        assertEquals("RENT", orders.calls[2].orderType)
        orders.calls[2].answer.complete(page(3, 1, 2)); advanceUntilIdle()
        assertEquals(listOf(3, 1, 2), ids(vm))
        assertFalse(vm.isDirty)
    }

    @Test
    fun `re-show reloads only when dirty or stale (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val clock = Clock()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, now = { clock.now }, changes = { version })
        vm.select(OrdersSegment.RENT)
        vm.onShown(); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1)); advanceUntilIdle()

        vm.onShown(); advanceUntilIdle()
        assertEquals("view and back: no reload", 1, orders.calls.size)

        clock.now = clock.now.plusSeconds(5 * 60 - 1)
        vm.onShown(); advanceUntilIdle()
        assertEquals(1, orders.calls.size)

        clock.now = clock.now.plusSeconds(2)
        vm.onShown(); advanceUntilIdle()
        assertEquals("5 minutes old: reload", 2, orders.calls.size)
        assertEquals("quiet: rows stay", listOf(1), ids(vm))
        assertFalse(vm.state.value.loading)
        orders.calls[1].answer.complete(page(1, 4)); advanceUntilIdle()

        version++
        vm.onShown(); advanceUntilIdle()
        assertEquals("orders changed: reload", 3, orders.calls.size)
    }

    @Test
    fun `quiet refresh failure keeps the rows (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, changes = { version })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1, 2)); advanceUntilIdle()
        version++
        vm.refreshIfNeeded(); advanceUntilIdle()
        orders.calls[1].answer.complete(Result.failure(AppError.Network("offline"))); advanceUntilIdle()
        assertEquals(listOf(1, 2), ids(vm))
        assertNull(vm.state.value.error)
        assertTrue("still dirty: the next show tries again", vm.isDirty)
    }

    @Test
    fun `change during a load leaves the list dirty (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, changes = { version })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        version++ // an order changed while the request was in flight
        orders.calls[0].answer.complete(page(1)); advanceUntilIdle()
        assertTrue(vm.isDirty)
        assertTrue(vm.needsRefresh)
    }

    @Test
    fun `quiet refresh keeps every loaded page (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        var version = 0L
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, changes = { version })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        orders.calls[0].answer.complete(pageOf((1..20).toList(), hasMore = true)); advanceUntilIdle()
        vm.loadMore(); advanceUntilIdle()
        assertEquals(2, orders.calls[1].page)
        orders.calls[1].answer.complete(pageOf((21..30).toList())); advanceUntilIdle()

        version++
        vm.refreshIfNeeded(); advanceUntilIdle()
        assertEquals(1, orders.calls[2].page)
        assertEquals("both pages in one request", 40, orders.calls[2].query.limit)
        assertEquals("rows stay while it runs", 30, ids(vm).size)
    }

    @Test
    fun `filter change still shows the spinner (#674)`() = runTest(dispatcher) {
        val orders = FakeOrders()
        val vm = OrdersHomeViewModel(repo(Result.success(TodayWork())), orders, changes = { 0L })
        vm.select(OrdersSegment.RENT); advanceUntilIdle()
        orders.calls[0].answer.complete(page(1)); advanceUntilIdle()
        vm.selectStatus("RESERVED"); advanceUntilIdle()
        assertTrue(vm.state.value.loading)
        assertTrue(vm.state.value.sections.isEmpty())
    }
}
