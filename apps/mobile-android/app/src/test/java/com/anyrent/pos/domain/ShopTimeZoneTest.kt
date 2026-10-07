package com.anyrent.pos.domain

import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.customers.CustomerOrderRow
import com.anyrent.pos.domain.customers.CustomerRules
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.orders.OrderPlanDays
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewLinks
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.RentedOutLogic
import com.anyrent.pos.print.ReceiptDates
import com.anyrent.pos.ui.calendar.v2.CalendarV2ViewModel
import com.anyrent.pos.ui.common.dayKey
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatDisplayDate
import com.anyrent.pos.ui.orders.v2.DateRangeChoice
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.OrdersHomeLogic
import com.anyrent.pos.ui.orders.v2.RentOrdersFilter
import com.anyrent.pos.ui.orders.v2.shortDay
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.TimeZone

/**
 * #602 (Android counterpart of #601): every day decision uses the shop zone (Vietnam), whatever the phone zone.
 * Each case runs with the default zone Tokyo, Los Angeles, UTC and Vietnam, at the 16:59:59Z / 17:00:00Z
 * boundary (Vietnam midnight) and at month / year ends. Expected strings are what a Vietnam phone sends today.
 */
@RunWith(Parameterized::class)
class ShopTimeZoneTest(private val phoneZone: String) {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun zones(): List<String> = listOf("Asia/Tokyo", "America/Los_Angeles", "UTC", "Asia/Ho_Chi_Minh")

        private val VI = Locale("vi")
        private val BEFORE_MIDNIGHT: Instant = Instant.parse("2026-10-09T16:59:59Z") // VN 09/10 23:59:59
        private val AT_MIDNIGHT: Instant = Instant.parse("2026-10-09T17:00:00Z") // VN 10/10 00:00:00
    }

    private lateinit var saved: TimeZone

    @Before
    fun setUp() {
        saved = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone(phoneZone))
        CartStore.clear(persistToDisk = false)
    }

    @After
    fun tearDown() {
        CartStore.clear(persistToDisk = false)
        TimeZone.setDefault(saved)
    }

    @Test
    fun `the shop zone is Vietnam and today flips at Vietnam midnight`() {
        assertEquals(ZoneId.of("Asia/Ho_Chi_Minh"), ShopTime.zone)
        assertEquals("Asia/Ho_Chi_Minh", ShopTime.zoneId)
        assertEquals("Asia%2FHo_Chi_Minh", ShopTime.timeZoneParam())
        assertEquals(LocalDate.of(2026, 10, 9), ShopTime.today(BEFORE_MIDNIGHT))
        assertEquals(LocalDate.of(2026, 10, 10), ShopTime.today(AT_MIDNIGHT))
        assertEquals(LocalDate.of(2027, 1, 1), ShopTime.today(Instant.parse("2026-12-31T17:00:00Z")))
    }

    // AND-1 cart instants

    @Test
    fun `cart pickup and return are Vietnam day bounds`() {
        CartStore.setPickup(LocalDate.of(2026, 10, 10))
        CartStore.setReturn(LocalDate.of(2026, 10, 12))
        assertEquals("2026-10-09T17:00:00.000Z", CartStore.isoPickup())
        assertEquals("2026-10-12T16:59:59.000Z", CartStore.isoReturn())
    }

    @Test
    fun `plan instants at month and year ends`() {
        assertEquals("2026-10-31T17:00:00.000Z", OrderPlanDays.pickupInstant(LocalDate.of(2026, 11, 1)))
        assertEquals("2026-10-31T16:59:59.000Z", OrderPlanDays.returnInstant(LocalDate.of(2026, 10, 31)))
        assertEquals("2026-12-31T17:00:00.000Z", OrderPlanDays.pickupInstant(LocalDate.of(2027, 1, 1)))
        assertEquals("2026-12-31T16:59:59.000Z", OrderPlanDays.returnInstant(LocalDate.of(2026, 12, 31)))
    }

    // AND-2 edit / extend load and save

    @Test
    fun `an order instant reads back as its Vietnam day`() {
        assertEquals(LocalDate.of(2026, 10, 9), OrderPlanDays.dayOf("2026-10-09T16:59:59.000Z"))
        assertEquals(LocalDate.of(2026, 10, 10), OrderPlanDays.dayOf("2026-10-09T17:00:00.000Z"))
        assertEquals(LocalDate.of(2026, 10, 10), OrderPlanDays.dayOf("2026-10-10T00:00:00+07:00"))
        assertEquals(LocalDate.of(2027, 1, 1), OrderPlanDays.dayOf("2026-12-31T17:00:00Z"))
        listOf(LocalDate.of(2026, 10, 10), LocalDate.of(2026, 12, 31), LocalDate.of(2027, 1, 1)).forEach { day ->
            assertEquals(day, OrderPlanDays.dayOf(OrderPlanDays.pickupInstant(day)))
            assertEquals(day, OrderPlanDays.dayOf(OrderPlanDays.returnInstant(day)))
        }
    }

    @Test
    fun `extension keeps the Vietnam return day and saves the Vietnam end of the new day`() {
        assertEquals(LocalDate.of(2026, 10, 12), RentalExtension.currentReturnDay("2026-10-12T16:59:59.000Z"))
        val update = RentalExtension.update(
            pickupPlanAt = "2026-10-09T17:00:00.000Z",
            newDay = LocalDate.of(2026, 10, 14),
            oldTotal = 100.0,
            extra = null,
        )
        assertEquals("2026-10-14T16:59:59.000Z", update.returnPlanAt)
        assertEquals(5, update.rentalDuration)
    }

    // AND-3 availability: the window is the cart window (the repository uses OrderPlanDays; see
    // DefaultAvailabilityRepositoryBatchTest), the availability screen starts on the shop today

    @Test
    fun `availability screen starts on the shop today`() {
        assertEquals(ShopTime.today(), com.anyrent.pos.ui.availability.AvailabilityUiState().selectedDate)
    }

    // AND-4 rent list filters

    @Test
    fun `rent list today switches at Vietnam midnight`() {
        val today = RentOrdersFilter(range = DateRangeChoice.Today)
        OrdersBoardLogic.rentQuery(today, now = BEFORE_MIDNIGHT).let {
            assertEquals("2026-10-09", it.startDate)
            assertEquals("2026-10-09", it.endDate)
        }
        OrdersBoardLogic.rentQuery(today, now = AT_MIDNIGHT).let {
            assertEquals("2026-10-10", it.startDate)
            assertEquals("2026-10-10", it.endDate)
        }
        OrdersBoardLogic.rentQuery(RentOrdersFilter(range = DateRangeChoice.Next7Days), now = AT_MIDNIGHT).let {
            assertEquals("2026-10-10", it.startDate)
            assertEquals("2026-10-16", it.endDate)
        }
    }

    @Test
    fun `rent list this month at the month and year edge`() {
        val month = RentOrdersFilter(range = DateRangeChoice.ThisMonth)
        OrdersBoardLogic.rentQuery(month, now = Instant.parse("2026-10-31T17:00:00Z")).let {
            assertEquals("2026-11-01", it.startDate)
            assertEquals("2026-11-30", it.endDate)
        }
        OrdersBoardLogic.rentQuery(month, now = Instant.parse("2026-12-31T16:59:59Z")).let {
            assertEquals("2026-12-01", it.startDate)
            assertEquals("2026-12-31", it.endDate)
        }
        OrdersBoardLogic.rentQuery(month, now = Instant.parse("2026-12-31T17:00:00Z")).let {
            assertEquals("2027-01-01", it.startDate)
            assertEquals("2027-01-31", it.endDate)
        }
    }

    // AND-5 one late-days rule (= RentedOutLogic)

    @Test
    fun `late days follow Vietnam days and agree with the rented-out list`() {
        val order = summary(status = "PICKUPED", returnPlanAt = "2026-10-09T16:59:59.000Z") // VN 09/10
        fun late(now: Instant) = OrdersHomeLogic.lateDays(
            order.orderType, order.status, null, OrdersHomeLogic.parseInstant(order.returnPlanAt), now,
        )
        assertEquals(0, late(BEFORE_MIDNIGHT))
        assertEquals(1, late(AT_MIDNIGHT))
        assertFalse(RentedOutLogic.isLate(order, BEFORE_MIDNIGHT))
        assertTrue(RentedOutLogic.isLate(order, AT_MIDNIGHT))
        assertEquals(0, OrdersHomeLogic.orderRows(listOf(order), BEFORE_MIDNIGHT).single().lateDays)
        assertEquals(1, OrdersHomeLogic.orderRows(listOf(order), AT_MIDNIGHT).single().lateDays)
        assertEquals(0, OverviewLinks.latePage(listOf(order), hasMore = false, now = BEFORE_MIDNIGHT).first.size)
        assertEquals(1, OverviewLinks.latePage(listOf(order), hasMore = false, now = AT_MIDNIGHT).first.size)
    }

    @Test
    fun `sale days group by Vietnam day`() {
        val rows = OrdersHomeLogic.orderRows(
            listOf(
                summary(id = 1, orderType = "SALE", status = "COMPLETED", createdAt = "2026-10-09T16:59:59Z"),
                summary(id = 2, orderType = "SALE", status = "COMPLETED", createdAt = "2026-10-09T17:00:00Z"),
                summary(id = 3, orderType = "SALE", status = "COMPLETED", createdAt = "2026-10-10T16:00:00Z"),
            ),
            AT_MIDNIGHT,
        )
        assertEquals(listOf(1, 2), OrdersHomeLogic.saleSections(rows).map { it.rows.size })
    }

    // AND-6 calendar / overview / today-work send the shop zone; today keys are shop days

    @Test
    fun `calendar overview and today work send timeZone Asia Ho_Chi_Minh`() {
        assertEquals(
            "/api/calendar/orders/count?month=10&year=2026&timeZone=Asia%2FHo_Chi_Minh",
            CalendarLogic.monthCountPath(YearMonth.of(2026, 10)),
        )
        assertEquals(
            "/api/calendar/orders/by-date?date=2026-10-10&timeZone=Asia%2FHo_Chi_Minh&limit=200",
            CalendarLogic.dayPath("2026-10-10"),
        )
        assertEquals(
            "/api/analytics/period?startDate=2026-10-01&endDate=2026-10-10&groupBy=day&limit=3&timeZone=Asia%2FHo_Chi_Minh",
            OverviewLogic.periodPath(DayRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10))),
        )
        assertEquals("/api/analytics/outlet-operations?timeZone=Asia%2FHo_Chi_Minh", OverviewLogic.outletOperationsPath())
    }

    @Test
    fun `calendar today is the shop today`() {
        val vm = CalendarV2ViewModel(fetch = { JSONObject() })
        assertEquals(ShopTime.today().toString(), vm.todayKey)
    }

    // AND-7 order detail schedule

    @Test
    fun `order detail schedule days and day count in Vietnam days`() {
        assertEquals("10/10", shortDay("2026-10-09T17:00:00.000Z"))
        assertEquals("09/10", shortDay("2026-10-09T16:59:59.000Z"))
        assertEquals(1, OrderDetailLogic.rentalDays("2026-10-09T17:00:00.000Z", "2026-10-10T16:59:59.000Z"))
        assertEquals(3, OrderDetailLogic.rentalDays("2026-10-09T17:00:00.000Z", "2026-10-12T16:59:59.000Z"))
    }

    // AND-8 day formatting

    @Test
    fun `day labels and keys are Vietnam days`() {
        assertEquals("T7 10/10", formatDayShort(AT_MIDNIGHT, locale = VI))
        assertEquals("T6 09/10", formatDayShort(BEFORE_MIDNIGHT, locale = VI))
        assertEquals("T7 10/10", formatDayShort(LocalDate.of(2026, 10, 10), locale = VI))
        assertEquals("2026-10-10", dayKey(AT_MIDNIGHT))
        assertEquals("2026-10-09", dayKey(BEFORE_MIDNIGHT))
        assertEquals("10/10/26", formatDisplayDate("2026-10-09T17:00:00Z"))
        assertEquals("01/01/27", formatDisplayDate("2026-12-31T17:00:00Z"))
    }

    @Test
    fun `receipt days and stamps are Vietnam days`() {
        val day = DateTimeFormatter.ofPattern("dd/MM/yy")
        val stamp = DateTimeFormatter.ofPattern("dd/MM/yy HH:mm")
        assertEquals("10/10/26", ReceiptDates.day("2026-10-09T17:00:00.000Z", day))
        assertEquals("09/10/26", ReceiptDates.day("2026-10-09T16:59:59.000Z", day))
        assertEquals("10/10/26 00:00", ReceiptDates.dateTime("2026-10-09T17:00:00.000Z", stamp))
        assertEquals(null, ReceiptDates.day("not a date", day))
    }

    @Test
    fun `customer order dates collapse on the same Vietnam day`() {
        val row = CustomerOrderRow(
            id = 1, orderNumber = "100001", orderType = "RENT", status = "RESERVED", totalAmount = 0.0,
            pickupPlanAt = Instant.parse("2026-10-09T17:00:00Z"), returnPlanAt = Instant.parse("2026-10-10T16:59:59Z"),
            createdAt = null, itemCount = 1,
        )
        assertEquals("T7 10/10", CustomerRules.orderDates(row) { formatDayShort(it, locale = VI) })
    }

    // AND-9 cart default day

    @Test
    fun `an empty cart starts on the shop today`() {
        CartStore.clear(persistToDisk = false)
        assertEquals(ShopTime.today(), CartStore.pickupDate.value)
        assertEquals(ShopTime.today().plusDays(1), CartStore.returnDate.value)
    }

    private fun summary(
        id: Int = 1,
        orderType: String = "RENT",
        status: String,
        returnPlanAt: String? = null,
        createdAt: String? = null,
    ) = OrderSummary(
        id = id, orderNumber = "10000$id", orderType = orderType, status = status, totalAmount = 0.0,
        depositAmount = 0.0, customerName = null, customerPhone = null, pickupPlanAt = null,
        returnPlanAt = returnPlanAt, createdAt = createdAt, notes = null,
    )
}
