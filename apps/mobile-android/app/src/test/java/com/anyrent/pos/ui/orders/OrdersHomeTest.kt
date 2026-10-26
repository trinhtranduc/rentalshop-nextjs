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
import com.anyrent.pos.ui.orders.v2.DateRangeChoice
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.OrdersHomeViewModel
import com.anyrent.pos.ui.orders.v2.OrdersQuery
import com.anyrent.pos.ui.orders.v2.OrdersSection
import com.anyrent.pos.ui.orders.v2.SortDate
import com.anyrent.pos.ui.orders.v2.SortDirection
import com.anyrent.pos.ui.orders.v2.PayLine
import com.anyrent.pos.ui.orders.v2.ProductOrdersSort
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
import org.junit.Assert.assertNotEquals
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

    // --- Deposit stages in To do (#1231) ---

    private fun stage(orderId: Int, key: String, label: String, due: String, late: Int = 0) = """
        {"orderId":$orderId,"orderNumber":"10$orderId","customerName":"Hoa","key":"$key","label":"$label",
         "amount":4800000,"remaining":4800000,"dueDateKey":"$due","lateDays":$late}
    """.trimIndent()

    private fun workWithStages() = todayWorkFromJson(JSONObject("""
        {"pickupsToday":{"count":1,"orders":[${row(1)}]},
         "returnsToday":{"count":0,"orders":[]},
         "overdueReturns":{"count":1,"orders":[${row(2, lateDays = 1)}]},
         "noShows":{"count":0,"orders":[]},
         "installmentsDue":{"count":1,"orders":[${stage(11, "i2", "Cọc 2", "2026-10-04")}]},
         "installmentsOverdue":{"count":2,"orders":[
            ${stage(12, "i1", "Cọc 1", "2026-10-03", late = 1)},
            ${stage(13, "i2", "Cọc 2", "2026-10-01", late = 3)}]},
         "installmentsDueTomorrow":{"count":1,"orders":[${stage(14, "i2", "Cọc 2", "2026-10-05")}]}}
    """.trimIndent()))

    @Test
    fun `stages due today and late are rows and tomorrow's is not (#1231)`() {
        val sections = OrdersHomeLogic.todaySections(workWithStages())
        assertEquals(listOf(SectionKind.LATE, SectionKind.TODAY), sections.map { it.kind })
        assertEquals(13, sections[0].rows.first().orderId)
        assertEquals(setOf(13, 2, 12), sections[0].rows.map { it.orderId }.toSet())
        assertEquals(listOf(1, 11), sections[1].rows.map { it.orderId })
        assertFalse(sections.flatMap { it.rows }.any { it.orderId == 14 })
        val first = sections[0].rows[0] as OrdersRow.Work
        assertEquals(WorkKind.COLLECT, first.kind)
        assertEquals("Cọc 2", first.row.stageLabel)
        assertEquals(4800000.0, first.row.amountDue, 0.0)
        assertEquals(3, first.row.lateDays)
    }

    @Test
    fun `two stages of one order keep distinct row keys (#1231)`() {
        val work = todayWorkFromJson(JSONObject("""
            {"pickupsToday":{"count":0,"orders":[]},"returnsToday":{"count":0,"orders":[]},
             "overdueReturns":{"count":0,"orders":[]},"noShows":{"count":0,"orders":[]},
             "installmentsOverdue":{"count":2,"orders":[
                ${stage(12, "i1", "Cọc 1", "2026-10-03", late = 1)}, ${stage(12, "i2", "Cọc 2", "2026-10-02", late = 2)}]}}
        """.trimIndent()))
        val keys = OrdersHomeLogic.todaySections(work)[0].rows.map { it.key }
        assertEquals(2, keys.toSet().size)
    }

    @Test
    fun `stage rows count in the band and the badge (#1231)`() {
        val sections = OrdersHomeLogic.todaySections(workWithStages())
        assertEquals(2, OrdersBoardLogic.collectCount(sections[0].rows))
        assertEquals(1, OrdersBoardLogic.collectCount(sections[1].rows))
        assertEquals(5, OrdersBoardLogic.badgeCount(sections))
    }

    @Test
    fun `no stage groups leave To do as before (#1231)`() {
        val work = todayWorkFromJson(JSONObject("""
            {"pickupsToday":{"count":1,"orders":[${row(1)}]},"returnsToday":{"count":0,"orders":[]},
             "overdueReturns":{"count":0,"orders":[]},"noShows":{"count":0,"orders":[]}}
        """.trimIndent()))
        val sections = OrdersHomeLogic.todaySections(work)
        assertEquals(listOf(SectionKind.TODAY), sections.map { it.kind })
        assertEquals(1, OrdersBoardLogic.badgeCount(sections))
    }

    @Test
    fun `stage chips are the label with the order code, then the late days (#1231)`() {
        val sections = OrdersHomeLogic.todaySections(workWithStages())
        val late = sections[0].rows[0] as OrdersRow.Work
        val chips = OrdersBoardLogic.workChips(late.row, late.kind)
        assertEquals(listOf(OrdersBoardLogic.WorkChipKind.STAGE, OrdersBoardLogic.WorkChipKind.LATE), chips.map { it.kind })
        assertEquals("Cọc 2", chips[0].label)
        assertEquals("1013", chips[0].code)
        val today = sections[1].rows[1] as OrdersRow.Work
        assertEquals(listOf(OrdersBoardLogic.WorkChipKind.STAGE), OrdersBoardLogic.workChips(today.row, today.kind).map { it.kind })
        assertFalse(OrdersBoardLogic.notPreparedApplies(WorkKind.COLLECT, false))
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
            OrderRowDates.Lines("#0057", "Lấy 03/10/26 · trả 05/10/26"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(row, WorkKind.HAND_OVER, isLate = true)),
        )
        assertEquals(
            OrderRowDates.Lines("#0057", "Trả 05/10/26"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(row, WorkKind.TAKE_BACK, isLate = false)),
        )
        assertEquals(
            OrderRowDates.Lines("#0057", "Hạn trả 05/10/26"),
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
        assertEquals(FontWeight.Medium, RowMoneyText.totalWeight)
        assertEquals(FontWeight.Normal, RowMoneyText.payWeight)
    }

    /** #496: list rows map every date of the order; late only matters to a rented-out order */
    @Test
    fun `list row date lines`() {
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo 02/10/26 10:00", "Lấy 04/10/26 · trả 05/10/26"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("RESERVED"), 0)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo 02/10/26 10:00", "Hạn trả 05/10/26"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("PICKUPED"), 2)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo 02/10/26 10:00", "Bán 02/10/26"),
            OrderRowDates.lines(OrdersBoardLogic.rowDates(listOrder("COMPLETED", type = "SALE"), 0)),
        )
        assertEquals(
            OrderRowDates.Lines("#0062 · tạo 02/10/26 10:00", "Huỷ 03/10/26"),
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
        // #888: default Ngày lấy, gần nhất trước
        assertEquals(OrdersQuery(orderType = "RENT", sortBy = "pickupPlanAt", sortOrder = "desc"), OrdersBoardLogic.rentQuery(RentOrdersFilter(), 1, now, vietnam))
        val query = OrdersBoardLogic.rentQuery(
            RentOrdersFilter(status = "PICKUPED", sortDate = SortDate.RETURN, direction = SortDirection.FARTHEST_FIRST, range = DateRangeChoice.Today),
            2, now, vietnam,
        )
        // #888: the range uses the sort date
        assertEquals(
            OrdersQuery(orderType = "RENT", status = "PICKUPED", sortBy = "returnPlanAt", sortOrder = "asc", startDate = "2026-10-04", endDate = "2026-10-04", dateField = "returnPlanAt", page = 2),
            query,
        )
    }

    /** #891 (owner): Tất cả đơn rows have no pay line; search and the other lists keep it (iOS) */
    @Test
    fun `rent list rows have no pay line`() {
        val due = listOrder("PICKUPED").copy(amountDue = 120000.0, refundDue = 0.0)
        assertNull(OrdersBoardLogic.rowPayLine(due, rentList = true))
        assertEquals(PayLine.Due(120000.0), OrdersBoardLogic.rowPayLine(due, rentList = false))
    }

    /** #1008 (owner): an icon in place of "Lấy" / "Trả"; TalkBack still reads the word and the date; #1026: no colour */
    @Test
    fun `date chips show an icon and speak the word`() {
        assertEquals("Outlined.ArrowOutward", OrdersBoardLogic.chipIcon(OrderRowDates.ChipKind.PICKUP).name)
        assertEquals("AutoMirrored.Outlined.Undo", OrdersBoardLogic.chipIcon(OrderRowDates.ChipKind.RETURN).name)
        val order = listOrder("RESERVED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z")
        assertEquals(listOf("Lấy 14/10/26", "Trả 16/10/26"), OrdersBoardLogic.dateChips(order, SortDate.PICKUP).map { it.accessibilityText })
    }

    /**
     * #1026 (owner, intentional change from the #891 blue / purple chips): only the status badge keeps colour.
     * Every date chip (pickup, return, sale) is dark text on no fill with a grey icon; the status badge keeps its
     * colour; TalkBack text unchanged. #1032: "Trễ N ngày" / "Chưa soạn đồ" lost their box too (see the #1032 test);
     * the DS tokens keep their fills for the other screens.
     */
    @Test
    fun `date chips have no fill and a grey icon, the badge keeps its colour`() {
        OrderRowDates.ChipKind.entries.forEach { kind ->
            assertEquals(androidx.compose.ui.graphics.Color.Transparent, OrdersBoardLogic.chipColors(kind).fill)
            assertEquals(androidx.compose.ui.graphics.Color(0xFF0F172A), OrdersBoardLogic.chipColors(kind).text)
        }
        assertEquals(androidx.compose.ui.graphics.Color(0xFF64748B), OrdersBoardLogic.chipIconTint)
        assertEquals("Outlined.ArrowOutward", OrdersBoardLogic.chipIcon(OrderRowDates.ChipKind.SALE).name)
        assertEquals(androidx.compose.ui.graphics.Color(0xFFEF4444), com.anyrent.pos.ui.orders.v2.OrderStatusTag.colors("RESERVED").fill)
        assertEquals(androidx.compose.ui.graphics.Color.White, com.anyrent.pos.ui.orders.v2.OrderStatusTag.colors("RESERVED").text)
        assertNotEquals(androidx.compose.ui.graphics.Color.Transparent, com.anyrent.pos.ui.theme.DS.Status.Late.fill)
        assertNotEquals(androidx.compose.ui.graphics.Color.Transparent, com.anyrent.pos.ui.theme.DS.Status.Waiting.fill)
        val order = listOrder("RESERVED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z")
        assertEquals(listOf("Lấy 14/10/26", "Trả 16/10/26"), OrdersBoardLogic.dateChips(order, null).map { it.accessibilityText })
    }

    /**
     * #1032 (owner, mockup "Mọi màn đơn hàng: cảnh báo gọn"; intentional change from the pink / orange boxes):
     * "Trễ N ngày" (red, clock) and "Chưa soạn đồ" (orange, box) are 12sp medium coloured text, no fill; the work
     * chips keep their kinds (spoken text unchanged); the status badge stays solid. iOS `RowWarning`.
     */
    @Test
    fun `row warnings have no box, a coloured icon and text`() {
        assertEquals(androidx.compose.ui.graphics.Color(0xFFB91C1C), com.anyrent.pos.ui.orders.v2.RowWarning.LATE.color)
        assertEquals(androidx.compose.ui.graphics.Color(0xFF9A3412), com.anyrent.pos.ui.orders.v2.RowWarning.NOT_PREPARED.color)
        com.anyrent.pos.ui.orders.v2.RowWarning.entries.forEach {
            assertEquals(androidx.compose.ui.graphics.Color.Transparent, it.fill)
        }
        assertEquals("Outlined.Schedule", com.anyrent.pos.ui.orders.v2.RowWarning.LATE.icon.name)
        assertEquals("Outlined.Inventory2", com.anyrent.pos.ui.orders.v2.RowWarning.NOT_PREPARED.icon.name)
        assertEquals(12.sp, com.anyrent.pos.ui.orders.v2.RowWarning.fontSize)
        assertEquals(FontWeight.Medium, com.anyrent.pos.ui.orders.v2.RowWarning.weight)
        // Việc cần làm: the date chip is not a warning; late and not prepared are
        val work = TodayWorkRow(id = 1, orderNumber = "1", pickupPlanAt = java.time.Instant.parse("2026-10-13T17:30:00Z"), isReadyToDeliver = false, lateDays = 2)
        val chips = OrdersBoardLogic.workChips(work, WorkKind.HAND_OVER)
        assertEquals(
            listOf(OrdersBoardLogic.WorkChipKind.PICKUP, OrdersBoardLogic.WorkChipKind.LATE, OrdersBoardLogic.WorkChipKind.NOT_PREPARED),
            chips.map { it.kind },
        )
        assertEquals(listOf(null, com.anyrent.pos.ui.orders.v2.RowWarning.LATE, com.anyrent.pos.ui.orders.v2.RowWarning.NOT_PREPARED),
            chips.map { OrdersBoardLogic.warning(it.kind) })
        assertEquals(2, chips[1].days)
        // The status badge stays solid; the DS tokens other screens use keep their fills
        assertEquals(androidx.compose.ui.graphics.Color(0xFFEF4444), com.anyrent.pos.ui.orders.v2.OrderStatusTag.colors("RESERVED").fill)
        assertEquals(androidx.compose.ui.graphics.Color(0xFFFEE2E2), com.anyrent.pos.ui.theme.DS.Status.Late.fill)
        assertEquals(androidx.compose.ui.graphics.Color(0xFFFFEDD5), com.anyrent.pos.ui.theme.DS.Status.Waiting.fill)
    }

    /**
     * #1032 (owner, mockup "Lịch › đơn trễ: icon"): the calendar late note uses the late warning, then " · phí N"
     * in grey regular; TalkBack reads "Trễ N ngày · phí N" as before.
     */
    @Test
    fun `calendar late note keeps its spoken text and greys the fee`() {
        assertEquals(" · phí 50.000", com.anyrent.pos.ui.orders.v2.RowWarning.feeSuffix("phí 50.000"))
        assertEquals("Trễ 2 ngày · phí 50.000", "Trễ 2 ngày" + com.anyrent.pos.ui.orders.v2.RowWarning.feeSuffix("phí 50.000"))
        assertEquals(androidx.compose.ui.graphics.Color(0xFF64748B), com.anyrent.pos.ui.orders.v2.RowWarning.feeColor)
        assertEquals(FontWeight.Normal, com.anyrent.pos.ui.orders.v2.RowWarning.feeWeight)
    }

    /** #1026 (owner): a sale row shows "↗ dd/mm/yy" (created day) in place of "Bán dd/mm/yy"; TalkBack reads "Bán dd/mm/yy" */
    @Test
    fun `sale rows show the sale date chip`() {
        val created = java.time.Instant.parse("2026-10-14T18:00:00Z") // 15/10 in Vietnam
        val chip = OrderRowDates.saleChip("SALE", "COMPLETED", created)
        assertEquals(OrderRowDates.DateChip(OrderRowDates.ChipKind.SALE, "Bán", "15/10/26", bold = false), chip)
        assertEquals("Bán 15/10/26", chip?.accessibilityText)
        assertEquals(OrderRowDates.Texts().sold.format("15/10/26"), chip?.accessibilityText)
        assertEquals("any sale not cancelled", "Bán 15/10/26", OrderRowDates.saleChip("SALE", "RESERVED", created)?.accessibilityText)
        assertNull("a cancelled sale keeps Huỷ", OrderRowDates.saleChip("SALE", "CANCELLED", created))
        assertNull(OrderRowDates.saleChip("RENT", "RESERVED", created))
        assertNull(OrderRowDates.saleChip("SALE", "COMPLETED", null))
    }

    /** #891 (option C): Lấy / Trả chips (#1026: no colour); the sorted date only bolder; a created-date sort makes "tạo …" bold (iOS) */
    @Test
    fun `date chips emphasise only the sorted date`() {
        val order = listOrder("RESERVED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z")
        assertEquals(
            listOf(OrderRowDates.DateChip(OrderRowDates.ChipKind.PICKUP, "Lấy", "14/10/26", bold = true),
                OrderRowDates.DateChip(OrderRowDates.ChipKind.RETURN, "Trả", "16/10/26", bold = false)),
            OrdersBoardLogic.dateChips(order, SortDate.PICKUP),
        )
        assertEquals(listOf(false, true), OrdersBoardLogic.dateChips(order, SortDate.RETURN).map { it.bold })
        assertEquals(listOf(false, false), OrdersBoardLogic.dateChips(order, null).map { it.bold })
        assertEquals(true, OrdersBoardLogic.metaIsBold(SortDate.CREATED))
        assertEquals(false, OrdersBoardLogic.metaIsBold(SortDate.PICKUP))
        assertEquals(false, OrdersBoardLogic.metaIsBold(null))
    }

    /** #893 (owner on device): the sorted chip reads clearly bold, the other regular; Home cart bar blue, no add toast (iOS) */
    @Test
    fun `sorted chip weight, home cart bar and add toast`() {
        assertEquals(FontWeight.Medium, com.anyrent.pos.ui.orders.v2.DateChipText.sortedWeight)
        assertEquals(FontWeight.Normal, com.anyrent.pos.ui.orders.v2.DateChipText.otherWeight)
        // #952: the floating cart bar is gone (the top-right cart button stays)
        assertEquals(false, com.anyrent.pos.ui.home.v2.HomeCart.showsFloatingBar)
        assertEquals(false, com.anyrent.pos.ui.home.v2.HomeCart.showsAddedToast)
    }

    /** #893 (owner): lean Việc cần làm rows: the task's own date chip, "Trễ N ngày", "Chưa soạn đồ" (hand-overs only) */
    @Test
    fun `work row chips and amount`() {
        val pickup = Instant.parse("2026-10-13T17:30:00Z") // 14/10 in Vietnam
        val back = Instant.parse("2026-10-16T02:00:00Z")
        val handOver = TodayWorkRow(id = 1, orderNumber = "ORD-1-0063", pickupPlanAt = pickup, returnPlanAt = back,
            isReadyToDeliver = false, totalAmount = 300_000.0, amountDue = 200_000.0, lateDays = 2)
        val chips = OrdersBoardLogic.workChips(handOver, WorkKind.HAND_OVER)
        assertEquals(listOf(OrdersBoardLogic.WorkChipKind.PICKUP, OrdersBoardLogic.WorkChipKind.LATE, OrdersBoardLogic.WorkChipKind.NOT_PREPARED), chips.map { it.kind })
        assertEquals("14/10/26", chips[0].date)
        assertEquals(2, chips[1].days)
        val takeBack = handOver.copy(isReadyToDeliver = false, lateDays = 0, amountDue = 0.0)
        val returnChips = OrdersBoardLogic.workChips(takeBack, WorkKind.TAKE_BACK)
        assertEquals("only the return date; never not-prepared on a return", listOf(OrdersBoardLogic.WorkChipKind.RETURN), returnChips.map { it.kind })
        assertEquals("16/10/26", returnChips[0].date)
        // Owner: the total always shows; "còn thu N" under it only when something is due
        assertEquals(200_000.0, OrdersBoardLogic.workDue(handOver))
        assertNull(OrdersBoardLogic.workDue(takeBack))
        assertEquals(true, OrdersBoardLogic.notPreparedApplies(WorkKind.HAND_OVER, isReadyToDeliver = false))
        assertEquals(false, OrdersBoardLogic.notPreparedApplies(WorkKind.TAKE_BACK, isReadyToDeliver = false))
        assertEquals(false, OrdersBoardLogic.notPreparedApplies(WorkKind.HAND_OVER, isReadyToDeliver = true))
    }

    /** #888: dd/mm/yy in the Vietnam day, whatever the device zone */
    @Test
    fun `day month year is the vietnam day`() {
        assertEquals("02/10/26", OrderRowDates.dmy(Instant.parse("2026-10-02T16:59:59Z"), vietnam))
        assertEquals("03/10/26", OrderRowDates.dmy(Instant.parse("2026-10-02T17:00:00Z"), vietnam))
        assertEquals("02/10/26", OrderRowDates.dmy(Instant.parse("2026-10-02T17:00:00Z"), utc))
        assertEquals("01/01/27", OrderRowDates.dmy(Instant.parse("2026-12-31T17:00:00Z")))
    }

    /** #888: a "Tất cả đơn" row shows only Lấy · Trả; the sorted date is marked */
    @Test
    fun `rent row shows pickup and return with the sorted date marked`() {
        val pickup = Instant.parse("2026-10-13T17:30:00Z") // 14/10 in Vietnam
        val back = Instant.parse("2026-10-16T02:00:00Z")
        assertEquals(
            listOf(OrderRowDates.Part("Lấy 14/10/26", marked = true), OrderRowDates.Part("Trả 16/10/26", marked = false)),
            OrderRowDates.rentPlan(pickup, back, markPickup = true, markReturn = false),
        )
        assertEquals(
            listOf(OrderRowDates.Part("Lấy 14/10/26", marked = false), OrderRowDates.Part("Trả 16/10/26", marked = true)),
            OrdersBoardLogic.rentRowDates(listOrder("RESERVED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z"), SortDate.RETURN),
        )
        assertEquals(listOf(false, false),
            OrdersBoardLogic.rentRowDates(listOrder("RETURNED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z"), SortDate.CREATED).map { it.marked })
        assertEquals(listOf(OrderRowDates.Part("Trả 16/10/26", marked = false)), OrderRowDates.rentPlan(null, back, markPickup = true, markReturn = false))
        // Owner (#888): the created day stays on the meta line, "#0062 · tạo 02/10/26 10:00"
        assertEquals("#0062 · tạo 02/10/26 10:00", OrdersBoardLogic.rentRowMeta(listOrder("RESERVED")))
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

    /** #1025 (owner): a product's orders sort like Tất cả đơn; default pickup day, nearest first (`desc`, as #888) */
    @Test
    fun `product orders default sort is pickup nearest first`() {
        val sort = ProductOrdersSort.DEFAULT
        assertEquals(SortDate.PICKUP, sort.sortDate)
        assertEquals(SortDirection.NEAREST_FIRST, sort.direction)
        assertEquals("pickupPlanAt" to "desc", ProductOrdersSort.query(sort))
    }

    /** #1025: the `sortBy` / `sortOrder` sent for every choice of the sheet */
    @Test
    fun `product orders query per choice`() {
        val expected = mapOf(
            (SortDate.PICKUP to SortDirection.NEAREST_FIRST) to ("pickupPlanAt" to "desc"),
            (SortDate.PICKUP to SortDirection.FARTHEST_FIRST) to ("pickupPlanAt" to "asc"),
            (SortDate.RETURN to SortDirection.NEAREST_FIRST) to ("returnPlanAt" to "desc"),
            (SortDate.RETURN to SortDirection.FARTHEST_FIRST) to ("returnPlanAt" to "asc"),
            (SortDate.CREATED to SortDirection.NEAREST_FIRST) to ("createdAt" to "desc"),
            (SortDate.CREATED to SortDirection.FARTHEST_FIRST) to ("createdAt" to "asc"),
        )
        expected.forEach { (choice, query) ->
            val sort = RentOrdersFilter(sortDate = choice.first, direction = choice.second)
            assertEquals("$choice", query, ProductOrdersSort.query(sort))
        }
    }

    /** #1025: product rows bold the sorted date (rule #891/#893); the customer's orders bold nothing */
    @Test
    fun `product orders rows bold the sorted date`() {
        val order = listOrder("RESERVED", pickup = "2026-10-13T17:30:00Z", returns = "2026-10-16T02:00:00Z")
        val bold = ProductOrdersSort.boldDate(isProduct = true, ProductOrdersSort.DEFAULT)
        assertEquals(SortDate.PICKUP, bold)
        assertEquals(listOf(true, false), OrdersBoardLogic.dateChips(order, bold).map { it.bold })
        val byReturn = ProductOrdersSort.boldDate(isProduct = true, RentOrdersFilter(sortDate = SortDate.RETURN))
        assertEquals(listOf(false, true), OrdersBoardLogic.dateChips(order, byReturn).map { it.bold })
        val byCreated = ProductOrdersSort.boldDate(isProduct = true, RentOrdersFilter(sortDate = SortDate.CREATED))
        assertEquals(listOf(false, false), OrdersBoardLogic.dateChips(order, byCreated).map { it.bold })
        assertEquals(true, OrdersBoardLogic.metaIsBold(byCreated))
        assertEquals(null, ProductOrdersSort.boldDate(isProduct = false, RentOrdersFilter(sortDate = SortDate.RETURN)))
    }

    /**
     * #1025: in a product's sorted orders a sale row shows the day the list is sorted by (pickup sort → pickup day,
     * created sort → created day; return sort keeps the created day); no sort (other lists) keeps the created day (iOS)
     */
    @Test
    fun `sorted product list sale row shows the sorted day`() {
        val sale = listOrder("COMPLETED", type = "SALE") // created 02/10/26, pickup 04/10/26 (Vietnam)
        assertEquals("04/10/26", OrdersBoardLogic.saleChip(sale, SortDate.PICKUP)?.date)
        assertEquals("02/10/26", OrdersBoardLogic.saleChip(sale, SortDate.CREATED)?.date)
        assertEquals("02/10/26", OrdersBoardLogic.saleChip(sale, SortDate.RETURN)?.date)
        assertEquals("02/10/26", OrdersBoardLogic.saleChip(sale, null)?.date)
        assertEquals(OrderRowDates.DateChip(OrderRowDates.ChipKind.SALE, "Bán", "04/10/26", bold = false), OrdersBoardLogic.saleChip(sale, SortDate.PICKUP))
        assertEquals("no pickup day: the created day", "02/10/26", OrdersBoardLogic.saleChip(sale.copy(pickupPlanAt = null), SortDate.PICKUP)?.date)
        assertNull("a cancelled sale keeps Huỷ", OrdersBoardLogic.saleChip(listOrder("CANCELLED", type = "SALE"), SortDate.PICKUP))
    }
}
